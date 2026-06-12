import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createHostedChatCommandProcessor, processHostedChatCommand } from "../../lib/platform/hosted-chat-command.js";

function createMemoryChatRepository() {
  const taskListStates = new Map();
  const tasksByState = new Map();
  const overlayStates = new Map();
  const commandLogs = [];
  const taskVotes = new Map();

  return {
    commandLogs,
    async findTaskListStateByWidgetId(widgetId) {
      return taskListStates.get(widgetId) ?? null;
    },
    async createTaskListState({ widgetId }) {
      const state = {
        id: `task-list-state-${taskListStates.size + 1}`,
        widgetId,
        currentCycleId: `cycle-${taskListStates.size + 1}`,
        nextTaskNumber: 1,
        version: 0,
      };
      taskListStates.set(widgetId, state);
      tasksByState.set(state.id, []);
      return state;
    },
    async appendTask(taskListStateId, input) {
      const tasks = tasksByState.get(taskListStateId) ?? [];
      const task = { id: `task-${tasks.length + 1}`, taskListStateId, ...input };
      tasks.push(task);
      tasksByState.set(taskListStateId, tasks);
      return task;
    },
    async findTaskById(taskListStateId, taskId) {
      return (tasksByState.get(taskListStateId) ?? []).find((task) => task.id === taskId) ?? null;
    },
    async updateTask(taskListStateId, taskId, patch) {
      const tasks = tasksByState.get(taskListStateId) ?? [];
      const updatedTasks = tasks.map((task) => (task.id === taskId ? { ...task, ...patch } : task));
      tasksByState.set(taskListStateId, updatedTasks);
      return updatedTasks.find((task) => task.id === taskId) ?? null;
    },
    async removeTask(taskListStateId, taskId) {
      const tasks = tasksByState.get(taskListStateId) ?? [];
      const removedTask = tasks.find((task) => task.id === taskId) ?? null;
      tasksByState.set(
        taskListStateId,
        tasks.filter((task) => task.id !== taskId),
      );
      return removedTask;
    },
    async appendTaskHistory(entry) {
      return { id: "history-1", ...entry };
    },
    async updateTaskListState(taskListStateId, patch) {
      const current = [...taskListStates.values()].find((state) => state.id === taskListStateId);
      const updated = { ...current, ...patch };
      taskListStates.set(updated.widgetId, updated);
      return updated;
    },
    async listRenderableTasks(taskListStateId) {
      return tasksByState.get(taskListStateId) ?? [];
    },
    async clearTasks(taskListStateId) {
      const tasks = tasksByState.get(taskListStateId) ?? [];
      tasksByState.set(taskListStateId, []);
      return tasks;
    },
    async createTaskListCycle(taskListStateId) {
      const state = [...taskListStates.values()].find((current) => current.id === taskListStateId);
      return {
        id: `cycle-${Number(String(state.currentCycleId).replace("cycle-", "")) + 1}`,
      };
    },
    async saveOverlayState(streamerProfileId, overlayState) {
      overlayStates.set(streamerProfileId, overlayState);
      return overlayState;
    },
    async findOverlayStateByStreamerProfileId(streamerProfileId) {
      return overlayStates.get(streamerProfileId) ?? null;
    },
    async appendCommandLog(entry) {
      const commandLog = { id: `command-log-${commandLogs.length + 1}`, ...entry };
      commandLogs.push(commandLog);
      return commandLog;
    },
    async findTaskVote(taskListStateId, taskListCycleId, viewerSubjectHash) {
      return taskVotes.get(`${taskListStateId}:${taskListCycleId}:${viewerSubjectHash}`) ?? null;
    },
    async saveTaskVote(vote) {
      const key = `${vote.taskListStateId}:${vote.taskListCycleId}:${vote.viewerSubjectHash}`;
      const saved = { id: `vote-${taskVotes.size + 1}`, ...vote };
      taskVotes.set(key, saved);
      return saved;
    },
    async updateTaskVote(taskListStateId, taskListCycleId, viewerSubjectHash, patch) {
      const key = `${taskListStateId}:${taskListCycleId}:${viewerSubjectHash}`;
      const current = taskVotes.get(key);
      const updated = { ...current, ...patch };
      taskVotes.set(key, updated);
      return updated;
    },
  };
}

describe("Hosted Chat Command write loop", () => {
  it("accepts add commands through Task List State and creates a dashboard-private Command Log", async () => {
    const repository = createMemoryChatRepository();

    const result = await processHostedChatCommand(repository, {
      streamerProfileId: "profile-1",
      widgetId: "widget-1",
      rawCommandText: "!task Review raid plan",
      actorLabel: "ViewerOne",
      actorSubjectHash: "viewer-hash-1",
      commandSettings: { addCommand: "!task" },
    });

    assert.equal(result.outcome, "accepted");
    assert.equal(result.task.taskNumber, 1);
    assert.equal(result.task.text, "Review raid plan");
    assert.equal(result.task.source, "chat-command");
    assert.equal(result.task.authorLabel, "ViewerOne");
    assert.equal(result.taskListState.version, 1);
    assert.deepEqual(repository.commandLogs[0], {
      id: "command-log-1",
      streamerProfileId: "profile-1",
      widgetId: "widget-1",
      taskListStateId: "task-list-state-1",
      commandName: "!task",
      rawCommandText: "!task Review raid plan",
      actorLabel: "ViewerOne",
      actorSubjectHash: "viewer-hash-1",
      outcome: "accepted",
      ignoredReason: null,
      createdTaskId: "task-1",
      affectedTaskId: null,
    });

    const overlayState = await repository.findOverlayStateByStreamerProfileId("profile-1");
    assert.deepEqual(overlayState.widgets[0].data.todos, [
      {
        taskNumber: 1,
        text: "Review raid plan",
        status: "active",
        source: "chat-command",
        authorLabel: "ViewerOne",
        voteCount: 0,
      },
    ]);
  });

  it("logs Ignored Commands silently without changing Overlay State", async () => {
    const repository = createMemoryChatRepository();

    const result = await processHostedChatCommand(repository, {
      streamerProfileId: "profile-1",
      widgetId: "widget-1",
      rawCommandText: "!unknown nope",
      actorLabel: "ViewerOne",
      actorSubjectHash: "viewer-hash-1",
      commandSettings: { addCommand: "!task", doneCommand: "!done" },
    });

    assert.deepEqual(result, { outcome: "ignored", reason: "unknown_command" });
    assert.equal(await repository.findOverlayStateByStreamerProfileId("profile-1"), null);
    assert.equal(repository.commandLogs[0].outcome, "ignored");
    assert.equal(repository.commandLogs[0].ignoredReason, "unknown_command");
  });

  it("lets the Task Owner complete their Active Task by Task Number", async () => {
    const repository = createMemoryChatRepository();
    await processHostedChatCommand(repository, {
      streamerProfileId: "profile-1",
      widgetId: "widget-1",
      rawCommandText: "!task Review raid plan",
      actorLabel: "ViewerOne",
      actorSubjectHash: "viewer-hash-1",
      commandSettings: { addCommand: "!task", doneCommand: "!done" },
    });

    const result = await processHostedChatCommand(repository, {
      streamerProfileId: "profile-1",
      widgetId: "widget-1",
      rawCommandText: "!done 1",
      actorLabel: "ViewerOne",
      actorSubjectHash: "viewer-hash-1",
      commandSettings: { addCommand: "!task", doneCommand: "!done" },
    });

    assert.equal(result.outcome, "accepted");
    assert.equal(result.task.status, "completed");
    assert.equal(result.task.taskNumber, 1);
    assert.equal(result.commandLog.affectedTaskId, "task-1");

    const overlayState = await repository.findOverlayStateByStreamerProfileId("profile-1");
    assert.equal(overlayState.widgets[0].data.todos[0].status, "completed");
  });

  it("ignores complete commands from viewers who do not own the Task", async () => {
    const repository = createMemoryChatRepository();
    await processHostedChatCommand(repository, {
      streamerProfileId: "profile-1",
      widgetId: "widget-1",
      rawCommandText: "!task Review raid plan",
      actorLabel: "ViewerOne",
      actorSubjectHash: "viewer-hash-1",
      commandSettings: { addCommand: "!task", doneCommand: "!done" },
    });

    const result = await processHostedChatCommand(repository, {
      streamerProfileId: "profile-1",
      widgetId: "widget-1",
      rawCommandText: "!done 1",
      actorLabel: "OtherViewer",
      actorSubjectHash: "viewer-hash-2",
      commandSettings: { addCommand: "!task", doneCommand: "!done" },
    });

    assert.deepEqual(result, { outcome: "ignored", reason: "not_task_owner_or_manager" });
    assert.equal(repository.commandLogs.at(-1).ignoredReason, "not_task_owner_or_manager");

    const overlayState = await repository.findOverlayStateByStreamerProfileId("profile-1");
    assert.equal(overlayState.widgets[0].data.todos[0].status, "active");
  });

  it("lets the Task Owner remove their Active Task by Task Number", async () => {
    const repository = createMemoryChatRepository();
    await processHostedChatCommand(repository, {
      streamerProfileId: "profile-1",
      widgetId: "widget-1",
      rawCommandText: "!task Optional dungeon",
      actorLabel: "ViewerOne",
      actorSubjectHash: "viewer-hash-1",
      commandSettings: { addCommand: "!task", deleteCommand: "!delete" },
    });

    const result = await processHostedChatCommand(repository, {
      streamerProfileId: "profile-1",
      widgetId: "widget-1",
      rawCommandText: "!delete 1",
      actorLabel: "ViewerOne",
      actorSubjectHash: "viewer-hash-1",
      commandSettings: { addCommand: "!task", deleteCommand: "!delete" },
    });

    assert.equal(result.outcome, "accepted");
    assert.equal(result.task.taskNumber, 1);
    assert.equal(result.commandLog.affectedTaskId, "task-1");

    const overlayState = await repository.findOverlayStateByStreamerProfileId("profile-1");
    assert.deepEqual(overlayState.widgets[0].data.todos, []);
  });

  it("lets Task Managers reset the Task List and start a new cycle", async () => {
    const repository = createMemoryChatRepository();
    const commandSettings = {
      addCommand: "!task",
      resetCommand: "!taskreset",
      taskManagerSubjectHashes: ["manager-hash-1"],
    };
    await processHostedChatCommand(repository, {
      streamerProfileId: "profile-1",
      widgetId: "widget-1",
      rawCommandText: "!task First task",
      actorLabel: "ViewerOne",
      actorSubjectHash: "viewer-hash-1",
      commandSettings,
    });

    const result = await processHostedChatCommand(repository, {
      streamerProfileId: "profile-1",
      widgetId: "widget-1",
      rawCommandText: "!taskreset",
      actorLabel: "Streamer",
      actorSubjectHash: "manager-hash-1",
      commandSettings,
    });

    assert.equal(result.outcome, "accepted");
    assert.equal(result.taskListState.currentCycleId, "cycle-2");
    assert.equal(result.taskListState.nextTaskNumber, 1);
    assert.equal(result.commandLog.affectedTaskId, null);

    const overlayState = await repository.findOverlayStateByStreamerProfileId("profile-1");
    assert.deepEqual(overlayState.widgets[0].data.todos, []);
  });

  it("ignores reset commands from non-managers", async () => {
    const repository = createMemoryChatRepository();
    const result = await processHostedChatCommand(repository, {
      streamerProfileId: "profile-1",
      widgetId: "widget-1",
      rawCommandText: "!taskreset",
      actorLabel: "ViewerOne",
      actorSubjectHash: "viewer-hash-1",
      commandSettings: { resetCommand: "!taskreset", taskManagerSubjectHashes: [] },
    });

    assert.deepEqual(result, { outcome: "ignored", reason: "not_task_manager" });
    assert.equal(repository.commandLogs[0].ignoredReason, "not_task_manager");
  });

  it("processes state-changing commands sequentially per processor", async () => {
    const repository = createMemoryChatRepository();
    const processor = createHostedChatCommandProcessor(repository);
    const baseInput = {
      streamerProfileId: "profile-1",
      widgetId: "widget-1",
      actorLabel: "ViewerOne",
      actorSubjectHash: "viewer-hash-1",
      commandSettings: { addCommand: "!task" },
    };

    const [first, second] = await Promise.all([
      processor.process({ ...baseInput, rawCommandText: "!task First" }),
      processor.process({ ...baseInput, rawCommandText: "!task Second" }),
    ]);

    assert.equal(first.task.taskNumber, 1);
    assert.equal(second.task.taskNumber, 2);

    const overlayState = await repository.findOverlayStateByStreamerProfileId("profile-1");
    assert.deepEqual(
      overlayState.widgets[0].data.todos.map((task) => [task.taskNumber, task.text]),
      [
        [1, "First"],
        [2, "Second"],
      ],
    );
  });

  it("detects command conflicts across active widgets before processing", async () => {
    const repository = createMemoryChatRepository();

    const result = await processHostedChatCommand(repository, {
      streamerProfileId: "profile-1",
      widgetId: "widget-1",
      rawCommandText: "!task Should not be created",
      actorLabel: "ViewerOne",
      actorSubjectHash: "viewer-hash-1",
      activeWidgetCommandSettings: [
        { widgetId: "widget-1", addCommand: "!task" },
        { widgetId: "widget-2", addCommand: "!task" },
      ],
      commandSettings: { addCommand: "!task" },
    });

    assert.deepEqual(result, { outcome: "ignored", reason: "command_conflict" });
    assert.equal(repository.commandLogs[0].ignoredReason, "command_conflict");
    assert.equal(await repository.findOverlayStateByStreamerProfileId("profile-1"), null);
  });

  it("accepts vote commands when Voting Mode is enabled and exposes only vote counts", async () => {
    const repository = createMemoryChatRepository();
    const commandSettings = { addCommand: "!task", voteCommand: "!vote", enableVoting: true };
    await processHostedChatCommand(repository, {
      streamerProfileId: "profile-1",
      widgetId: "widget-1",
      rawCommandText: "!task Pick next game",
      actorLabel: "ViewerOne",
      actorSubjectHash: "viewer-hash-1",
      commandSettings,
    });

    const result = await processHostedChatCommand(repository, {
      streamerProfileId: "profile-1",
      widgetId: "widget-1",
      rawCommandText: "!vote 1",
      actorLabel: "ViewerTwo",
      actorSubjectHash: "viewer-hash-2",
      commandSettings,
    });

    assert.equal(result.outcome, "accepted");
    assert.equal(result.task.voteCount, 1);
    assert.equal(result.commandLog.affectedTaskId, "task-1");

    const overlayState = await repository.findOverlayStateByStreamerProfileId("profile-1");
    assert.equal(overlayState.widgets[0].data.todos[0].voteCount, 1);
    assert.equal(Object.hasOwn(overlayState.widgets[0].data.todos[0], "viewerSubjectHash"), false);
  });

  it("ignores duplicate votes without incrementing vote counts", async () => {
    const repository = createMemoryChatRepository();
    const commandSettings = { addCommand: "!task", voteCommand: "!vote", enableVoting: true };
    await processHostedChatCommand(repository, {
      streamerProfileId: "profile-1",
      widgetId: "widget-1",
      rawCommandText: "!task Pick next game",
      actorLabel: "ViewerOne",
      actorSubjectHash: "viewer-hash-1",
      commandSettings,
    });
    await processHostedChatCommand(repository, {
      streamerProfileId: "profile-1",
      widgetId: "widget-1",
      rawCommandText: "!vote 1",
      actorLabel: "ViewerTwo",
      actorSubjectHash: "viewer-hash-2",
      commandSettings,
    });

    const result = await processHostedChatCommand(repository, {
      streamerProfileId: "profile-1",
      widgetId: "widget-1",
      rawCommandText: "!vote 1",
      actorLabel: "ViewerTwo",
      actorSubjectHash: "viewer-hash-2",
      commandSettings,
    });

    assert.deepEqual(result, { outcome: "ignored", reason: "duplicate_vote" });
    assert.equal(repository.commandLogs.at(-1).ignoredReason, "duplicate_vote");

    const overlayState = await repository.findOverlayStateByStreamerProfileId("profile-1");
    assert.equal(overlayState.widgets[0].data.todos[0].voteCount, 1);
  });

  it("moves a viewer vote to another Active Task when no cooldown blocks the change", async () => {
    const repository = createMemoryChatRepository();
    const commandSettings = { addCommand: "!task", voteCommand: "!vote", enableVoting: true };
    const baseInput = {
      streamerProfileId: "profile-1",
      widgetId: "widget-1",
      actorLabel: "ViewerOne",
      actorSubjectHash: "viewer-hash-1",
      commandSettings,
    };
    await processHostedChatCommand(repository, { ...baseInput, rawCommandText: "!task Pick next game" });
    await processHostedChatCommand(repository, { ...baseInput, rawCommandText: "!task Pick next challenge" });
    await processHostedChatCommand(repository, {
      ...baseInput,
      rawCommandText: "!vote 1",
      actorLabel: "ViewerTwo",
      actorSubjectHash: "viewer-hash-2",
    });

    const result = await processHostedChatCommand(repository, {
      ...baseInput,
      rawCommandText: "!vote 2",
      actorLabel: "ViewerTwo",
      actorSubjectHash: "viewer-hash-2",
    });

    assert.equal(result.outcome, "accepted");
    assert.equal(result.task.taskNumber, 2);
    assert.equal(result.task.voteCount, 1);

    const overlayState = await repository.findOverlayStateByStreamerProfileId("profile-1");
    assert.deepEqual(
      overlayState.widgets[0].data.todos.map((task) => [task.taskNumber, task.voteCount]),
      [
        [1, 0],
        [2, 1],
      ],
    );
  });

  it("ignores vote changes while the viewer is inside the vote cooldown", async () => {
    const repository = createMemoryChatRepository();
    const commandSettings = {
      addCommand: "!task",
      voteCommand: "!vote",
      enableVoting: true,
      voteCooldownSeconds: 60,
    };
    const baseInput = {
      streamerProfileId: "profile-1",
      widgetId: "widget-1",
      actorLabel: "ViewerOne",
      actorSubjectHash: "viewer-hash-1",
      commandSettings,
    };
    await processHostedChatCommand(repository, { ...baseInput, rawCommandText: "!task Pick next game" });
    await processHostedChatCommand(repository, { ...baseInput, rawCommandText: "!task Pick next challenge" });
    await processHostedChatCommand(repository, {
      ...baseInput,
      rawCommandText: "!vote 1",
      actorLabel: "ViewerTwo",
      actorSubjectHash: "viewer-hash-2",
      receivedAt: "2026-06-12T10:00:00.000Z",
    });

    const result = await processHostedChatCommand(repository, {
      ...baseInput,
      rawCommandText: "!vote 2",
      actorLabel: "ViewerTwo",
      actorSubjectHash: "viewer-hash-2",
      receivedAt: "2026-06-12T10:00:30.000Z",
    });

    assert.deepEqual(result, { outcome: "ignored", reason: "vote_cooldown" });
    assert.equal(repository.commandLogs.at(-1).ignoredReason, "vote_cooldown");

    const overlayState = await repository.findOverlayStateByStreamerProfileId("profile-1");
    assert.deepEqual(
      overlayState.widgets[0].data.todos.map((task) => [task.taskNumber, task.voteCount]),
      [
        [1, 1],
        [2, 0],
      ],
    );
  });

  it("ignores vote commands while Voting Mode is disabled", async () => {
    const repository = createMemoryChatRepository();
    const result = await processHostedChatCommand(repository, {
      streamerProfileId: "profile-1",
      widgetId: "widget-1",
      rawCommandText: "!vote 1",
      actorLabel: "ViewerTwo",
      actorSubjectHash: "viewer-hash-2",
      commandSettings: { voteCommand: "!vote", enableVoting: false },
    });

    assert.deepEqual(result, { outcome: "ignored", reason: "voting_disabled" });
    assert.equal(repository.commandLogs[0].ignoredReason, "voting_disabled");
  });
});
