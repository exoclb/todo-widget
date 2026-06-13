import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addDashboardTask,
  completeDashboardTask,
  editDashboardTaskText,
  removeDashboardTask,
  resetDashboardTaskList,
  updateDashboardTaskWidgetSettings,
} from "../../lib/platform/task-list-state.js";

function createMemoryTaskListRepository() {
  const taskListStates = new Map();
  const tasksByState = new Map();
  const overlayStates = new Map();
  const taskHistory = [];
  const widgetConfigs = new Map();

  return {
    taskListStates,
    tasksByState,
    overlayStates,
    taskHistory,
    async findTaskWidgetConfig(widgetId) {
      return (
        widgetConfigs.get(widgetId) ?? {
          widgetId,
          title: "STREAM TASKS",
          position: "top-right",
          enabled: true,
          renderSettings: {},
          commandSettings: { addCommand: "!task" },
        }
      );
    },
    async updateTaskWidgetConfig(widgetId, patch) {
      const current = await this.findTaskWidgetConfig(widgetId);
      const updated = {
        ...current,
        ...patch,
        renderSettings: patch.renderSettings ?? current.renderSettings,
        commandSettings: patch.commandSettings ?? current.commandSettings,
      };
      widgetConfigs.set(widgetId, updated);
      return updated;
    },
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
    seedTaskListState(state, tasks = []) {
      taskListStates.set(state.widgetId, { ...state });
      tasksByState.set(state.id, tasks.map((task) => ({ taskListStateId: state.id, ...task })));
    },
    async appendTask(taskListStateId, input) {
      const tasks = tasksByState.get(taskListStateId) ?? [];
      const task = {
        id: `task-${tasks.length + 1}`,
        taskListStateId,
        ...input,
      };
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
    async appendTaskHistory(entry) {
      const historyEntry = {
        id: `history-${taskHistory.length + 1}`,
        ...entry,
      };
      taskHistory.push(historyEntry);
      return historyEntry;
    },
    async saveOverlayState(streamerProfileId, overlayState) {
      overlayStates.set(streamerProfileId, overlayState);
      return overlayState;
    },
    async findOverlayStateByStreamerProfileId(streamerProfileId) {
      return overlayStates.get(streamerProfileId) ?? null;
    },
  };
}

describe("Dashboard Task List State write loop", () => {
  it("adds a dashboard-created task and derives public Overlay State", async () => {
    const repository = createMemoryTaskListRepository();

    const result = await addDashboardTask(repository, {
      streamerProfileId: "profile-1",
      widgetId: "widget-1",
      taskText: "Review next game idea",
      streamerDisplayName: "Demo Streamer",
    });

    assert.equal(result.task.taskNumber, 1);
    assert.equal(result.task.text, "Review next game idea");
    assert.equal(result.task.source, "dashboard");
    assert.equal(result.task.authorLabel, "Demo Streamer");
    assert.equal(result.taskListState.nextTaskNumber, 2);
    assert.equal(result.taskListState.version, 1);

    const overlayState = await repository.findOverlayStateByStreamerProfileId("profile-1");

    assert.deepEqual(overlayState.widgets[0].data.todos, [
      {
        taskNumber: 1,
        text: "Review next game idea",
        status: "active",
        source: "dashboard",
        authorLabel: "Demo Streamer",
        voteCount: 0,
      },
    ]);
    assert.equal(overlayState.derivedFromTaskListVersion, 1);
    assert.equal(Object.hasOwn(overlayState.widgets[0].data.todos[0], "ownerSubjectHash"), false);
  });

  it("edits dashboard-visible Task Text without changing Task Number, source, or author label", async () => {
    const repository = createMemoryTaskListRepository();
    const created = await addDashboardTask(repository, {
      streamerProfileId: "profile-1",
      widgetId: "widget-1",
      taskText: "Old task text",
      streamerDisplayName: "Demo Streamer",
    });

    const result = await editDashboardTaskText(repository, {
      streamerProfileId: "profile-1",
      widgetId: "widget-1",
      taskId: created.task.id,
      taskText: "Updated task text",
    });

    assert.equal(result.task.taskNumber, 1);
    assert.equal(result.task.text, "Updated task text");
    assert.equal(result.task.source, "dashboard");
    assert.equal(result.task.authorLabel, "Demo Streamer");
    assert.equal(result.taskListState.nextTaskNumber, 2);
    assert.equal(result.taskListState.version, 2);

    const overlayState = await repository.findOverlayStateByStreamerProfileId("profile-1");
    assert.deepEqual(overlayState.widgets[0].data.todos, [
      {
        taskNumber: 1,
        text: "Updated task text",
        status: "active",
        source: "dashboard",
        authorLabel: "Demo Streamer",
        voteCount: 0,
      },
    ]);
  });

  it("completes an Active Task and records dashboard-private Task History", async () => {
    const repository = createMemoryTaskListRepository();
    const created = await addDashboardTask(repository, {
      streamerProfileId: "profile-1",
      widgetId: "widget-1",
      taskText: "Finish boss fight",
      streamerDisplayName: "Demo Streamer",
    });

    const result = await completeDashboardTask(repository, {
      streamerProfileId: "profile-1",
      widgetId: "widget-1",
      taskId: created.task.id,
      closedByLabel: "Demo Streamer",
    });

    assert.equal(result.task.status, "completed");
    assert.equal(result.task.taskNumber, 1);
    assert.equal(result.taskListState.version, 2);
    assert.deepEqual(result.historyEntry, {
      id: "history-1",
      streamerProfileId: "profile-1",
      widgetId: "widget-1",
      taskListCycleId: "cycle-1",
      taskId: created.task.id,
      taskNumber: 1,
      text: "Finish boss fight",
      authorLabel: "Demo Streamer",
      source: "dashboard",
      outcome: "completed",
      closedByKind: "streamer",
      closedByLabel: "Demo Streamer",
      voteCount: 0,
    });

    const overlayState = await repository.findOverlayStateByStreamerProfileId("profile-1");
    assert.deepEqual(overlayState.widgets[0].data.todos, [
      {
        taskNumber: 1,
        text: "Finish boss fight",
        status: "completed",
        source: "dashboard",
        authorLabel: "Demo Streamer",
        voteCount: 0,
      },
    ]);
  });

  it("removes an Active Task quietly and keeps the removed task out of Overlay State", async () => {
    const repository = createMemoryTaskListRepository();
    const created = await addDashboardTask(repository, {
      streamerProfileId: "profile-1",
      widgetId: "widget-1",
      taskText: "Skip optional dungeon",
      streamerDisplayName: "Demo Streamer",
    });

    const result = await removeDashboardTask(repository, {
      streamerProfileId: "profile-1",
      widgetId: "widget-1",
      taskId: created.task.id,
      closedByLabel: "Demo Streamer",
    });

    assert.equal(result.task.taskNumber, 1);
    assert.equal(result.historyEntry.outcome, "removed");
    assert.equal(result.taskListState.version, 2);

    const overlayState = await repository.findOverlayStateByStreamerProfileId("profile-1");
    assert.deepEqual(overlayState.widgets[0].data.todos, []);
  });

  it("resets the Task List and starts a new Task List Cycle at Task Number 1", async () => {
    const repository = createMemoryTaskListRepository();
    await addDashboardTask(repository, {
      streamerProfileId: "profile-1",
      widgetId: "widget-1",
      taskText: "First task",
      streamerDisplayName: "Demo Streamer",
    });
    await addDashboardTask(repository, {
      streamerProfileId: "profile-1",
      widgetId: "widget-1",
      taskText: "Second task",
      streamerDisplayName: "Demo Streamer",
    });

    const result = await resetDashboardTaskList(repository, {
      streamerProfileId: "profile-1",
      widgetId: "widget-1",
      closedByLabel: "Demo Streamer",
    });

    assert.equal(result.taskListState.currentCycleId, "cycle-2");
    assert.equal(result.taskListState.nextTaskNumber, 1);
    assert.equal(result.taskListState.version, 3);
    assert.deepEqual(
      result.historyEntries.map((entry) => [entry.taskNumber, entry.text, entry.outcome]),
      [
        [1, "First task", "reset"],
        [2, "Second task", "reset"],
      ],
    );

    const overlayState = await repository.findOverlayStateByStreamerProfileId("profile-1");
    assert.deepEqual(overlayState.widgets[0].data.todos, []);

    const next = await addDashboardTask(repository, {
      streamerProfileId: "profile-1",
      widgetId: "widget-1",
      taskText: "After reset",
      streamerDisplayName: "Demo Streamer",
    });
    assert.equal(next.task.taskNumber, 1);
    assert.equal(next.task.taskListCycleId, "cycle-2");
  });

  it("updates render-facing Task Widget settings and derives public Overlay State without command settings", async () => {
    const repository = createMemoryTaskListRepository();
    await addDashboardTask(repository, {
      streamerProfileId: "profile-1",
      widgetId: "widget-1",
      taskText: "Render settings task",
      streamerDisplayName: "Demo Streamer",
    });

    const result = await updateDashboardTaskWidgetSettings(repository, {
      streamerProfileId: "profile-1",
      widgetId: "widget-1",
      title: "Quest Board",
      position: "bottom-left",
      renderSettings: {
        emptyText: "No quests yet",
        maxItems: 5,
        layoutMode: "detailed",
        enableVoting: true,
        votePrioritySort: true,
        commandSettings: { addCommand: "!leak" },
      },
      commandSettings: {
        addCommand: "!quest",
        taskManagerSubjectHashes: ["manager-hash-1"],
      },
    });

    assert.equal(result.widgetConfig.title, "Quest Board");
    assert.equal(result.widgetConfig.commandSettings.addCommand, "!quest");

    const overlayState = await repository.findOverlayStateByStreamerProfileId("profile-1");
    assert.equal(overlayState.widgets[0].title, "Quest Board");
    assert.equal(overlayState.widgets[0].position, "bottom-left");
    assert.deepEqual(overlayState.widgets[0].settings, {
      emptyText: "No quests yet",
      maxItems: 5,
      layoutMode: "detailed",
      enableVoting: true,
      votePrioritySort: true,
    });
    assert.equal(Object.hasOwn(overlayState.widgets[0], "commandSettings"), false);
    assert.equal(Object.hasOwn(overlayState.widgets[0].settings, "commandSettings"), false);
  });

  it("preserves saved render-facing settings when later task writes derive Overlay State", async () => {
    const repository = createMemoryTaskListRepository();
    await updateDashboardTaskWidgetSettings(repository, {
      streamerProfileId: "profile-1",
      widgetId: "widget-1",
      title: "Quest Board",
      position: "bottom-left",
      renderSettings: { emptyText: "No quests yet", maxItems: 5 },
    });

    await addDashboardTask(repository, {
      streamerProfileId: "profile-1",
      widgetId: "widget-1",
      taskText: "A task after settings",
      streamerDisplayName: "Demo Streamer",
    });

    const overlayState = await repository.findOverlayStateByStreamerProfileId("profile-1");
    assert.equal(overlayState.widgets[0].title, "Quest Board");
    assert.equal(overlayState.widgets[0].position, "bottom-left");
    assert.equal(overlayState.widgets[0].settings.emptyText, "No quests yet");
    assert.equal(overlayState.widgets[0].settings.maxItems, 5);
    assert.equal(overlayState.widgets[0].data.todos[0].text, "A task after settings");
  });

  it("assigns dashboard-created tasks after existing chat-created tasks in the same Task List State", async () => {
    const repository = createMemoryTaskListRepository();
    repository.seedTaskListState(
      {
        id: "task-list-state-1",
        widgetId: "widget-1",
        currentCycleId: "cycle-1",
        nextTaskNumber: 2,
        version: 1,
      },
      [
        {
          id: "task-chat-1",
          taskListCycleId: "cycle-1",
          taskNumber: 1,
          text: "Chat-created task",
          status: "active",
          source: "chat-command",
          authorLabel: "ViewerOne",
          voteCount: 0,
        },
      ],
    );

    const result = await addDashboardTask(repository, {
      streamerProfileId: "profile-1",
      widgetId: "widget-1",
      taskText: "Dashboard-created task",
      streamerDisplayName: "Demo Streamer",
    });

    assert.equal(result.task.taskNumber, 2);
    assert.equal(result.taskListState.nextTaskNumber, 3);

    const overlayState = await repository.findOverlayStateByStreamerProfileId("profile-1");
    assert.deepEqual(
      overlayState.widgets[0].data.todos.map((task) => [task.taskNumber, task.text, task.source]),
      [
        [1, "Chat-created task", "chat-command"],
        [2, "Dashboard-created task", "dashboard"],
      ],
    );
  });
});
