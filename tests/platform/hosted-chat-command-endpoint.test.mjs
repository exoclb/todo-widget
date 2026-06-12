import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isAuthorizedHostedChatCommandRequest,
  processHostedChatCommandPayload,
} from "../../lib/platform/hosted-chat-command-endpoint.js";

function createEndpointRepository(overrides = {}) {
  const taskListStates = new Map();
  const tasksByState = new Map();
  const commandLogs = [];
  const activeWidgetCommandSettings = overrides.activeWidgetCommandSettings ?? [
    {
      widgetId: "widget-1",
      addCommand: "!task",
      voteCommand: "!vote",
      enableVoting: true,
    },
  ];

  return {
    commandLogs,
    async listActiveWidgetCommandSettings(streamerProfileId) {
      assert.equal(streamerProfileId, "profile-1");
      return activeWidgetCommandSettings;
    },
    async findTaskListStateByWidgetId(widgetId) {
      return taskListStates.get(widgetId) ?? null;
    },
    async createTaskListState({ widgetId }) {
      const state = {
        id: "task-list-state-1",
        widgetId,
        currentCycleId: "cycle-1",
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
    async updateTaskListState(taskListStateId, patch) {
      const current = [...taskListStates.values()].find((state) => state.id === taskListStateId);
      const updated = { ...current, ...patch };
      taskListStates.set(updated.widgetId, updated);
      return updated;
    },
    async listRenderableTasks(taskListStateId) {
      return tasksByState.get(taskListStateId) ?? [];
    },
    async saveOverlayState(_streamerProfileId, overlayState) {
      return overlayState;
    },
    async appendCommandLog(entry) {
      const commandLog = { id: `command-log-${commandLogs.length + 1}`, ...entry };
      commandLogs.push(commandLog);
      return commandLog;
    },
  };
}

describe("Hosted Chat Command endpoint boundary", () => {
  it("authenticates bearer tokens without exposing chat command payload details", () => {
    const request = new Request("https://example.test/api/hosted-chat-command", {
      headers: { authorization: "Bearer secret-token" },
    });

    const malformedRequest = new Request("https://example.test/api/hosted-chat-command", {
      headers: { authorization: "Bearer secret-token extra" },
    });

    assert.equal(isAuthorizedHostedChatCommandRequest(request, "secret-token"), true);
    assert.equal(isAuthorizedHostedChatCommandRequest(request, "other-token"), false);
    assert.equal(isAuthorizedHostedChatCommandRequest(malformedRequest, "secret-token"), false);
  });

  it("validates required production chat command fields", async () => {
    const repository = createEndpointRepository();

    const response = await processHostedChatCommandPayload(repository, {
      streamerProfileId: "profile-1",
      widgetId: "widget-1",
      rawCommandText: "!task Missing actor",
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.status, "error");
    assert.equal(response.body.error, "actorLabel is required");
  });

  it("loads active widget command settings before processing chat commands", async () => {
    const repository = createEndpointRepository();

    const response = await processHostedChatCommandPayload(repository, {
      streamerProfileId: "profile-1",
      widgetId: "widget-1",
      rawCommandText: "!task Production command",
      actorLabel: "ViewerOne",
      actorSubjectHash: "viewer-hash-1",
    });

    assert.equal(response.status, 202);
    assert.deepEqual(response.body, {
      status: "accepted",
      reason: null,
      taskNumber: 1,
    });
    assert.equal(repository.commandLogs[0].commandName, "!task");
    assert.equal(repository.commandLogs[0].outcome, "accepted");
  });

  it("rejects commands when the streamer has no active command widgets", async () => {
    const repository = createEndpointRepository({ activeWidgetCommandSettings: [] });

    const response = await processHostedChatCommandPayload(repository, {
      streamerProfileId: "profile-1",
      widgetId: "widget-1",
      rawCommandText: "!task Should not create hidden state",
      actorLabel: "ViewerOne",
      actorSubjectHash: "viewer-hash-1",
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.error, "no active command widgets");
  });

  it("rejects commands targeting inactive widgets", async () => {
    const repository = createEndpointRepository();

    const response = await processHostedChatCommandPayload(repository, {
      streamerProfileId: "profile-1",
      widgetId: "widget-2",
      rawCommandText: "!task Hidden widget command",
      actorLabel: "ViewerOne",
      actorSubjectHash: "viewer-hash-1",
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.error, "widgetId is not an active command widget");
  });

  it("uses loaded active widget settings for conflict detection", async () => {
    const repository = createEndpointRepository({
      activeWidgetCommandSettings: [
        { widgetId: "widget-1", addCommand: "!task" },
        { widgetId: "widget-2", addCommand: "!task" },
      ],
    });

    const response = await processHostedChatCommandPayload(repository, {
      streamerProfileId: "profile-1",
      widgetId: "widget-1",
      rawCommandText: "!task Conflicted command",
      actorLabel: "ViewerOne",
      actorSubjectHash: "viewer-hash-1",
      commandSettings: { addCommand: "!different" },
    });

    assert.equal(response.status, 202);
    assert.deepEqual(response.body, {
      status: "ignored",
      reason: "command_conflict",
      taskNumber: null,
    });
    assert.equal(repository.commandLogs[0].ignoredReason, "command_conflict");
  });
});
