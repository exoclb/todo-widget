export class TaskListStateError extends Error {
  constructor(message) {
    super(message);
    this.name = "TaskListStateError";
  }
}

function normalizeTaskText(taskText) {
  const text = String(taskText || "").trim();

  if (!text) {
    throw new TaskListStateError("Task Text is required");
  }

  return text;
}

function createPublicTodo(task) {
  return {
    taskNumber: task.taskNumber,
    text: task.text,
    status: task.status,
    source: task.source,
    authorLabel: task.authorLabel,
    voteCount: task.voteCount ?? 0,
  };
}

async function deriveOverlayState(repository, input, taskListState) {
  const tasks = await repository.listRenderableTasks(taskListState.id);
  const overlayState = {
    schemaVersion: 1,
    profile: {
      id: input.streamerProfileId,
    },
    widgets: [
      {
        id: input.widgetId,
        type: "todo",
        enabled: true,
        data: {
          todos: tasks.map(createPublicTodo),
        },
      },
    ],
    derivedFromTaskListVersion: taskListState.version,
    derivedAt: new Date().toISOString(),
  };

  return repository.saveOverlayState(input.streamerProfileId, overlayState);
}

async function findExistingTaskListState(repository, widgetId) {
  const taskListState = await repository.findTaskListStateByWidgetId(widgetId);

  if (!taskListState) {
    throw new TaskListStateError("Task List State was not found");
  }

  return taskListState;
}

async function bumpTaskListStateVersion(repository, taskListState, patch = {}) {
  return repository.updateTaskListState(taskListState.id, {
    ...patch,
    version: taskListState.version + 1,
  });
}

function createCooldownUntil(receivedAt, cooldownSeconds) {
  const seconds = Number(cooldownSeconds || 0);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;

  const now = new Date(receivedAt || Date.now());
  return new Date(now.getTime() + seconds * 1000).toISOString();
}

function isInCooldown(cooldownUntil, receivedAt) {
  if (!cooldownUntil) return false;
  return new Date(cooldownUntil).getTime() > new Date(receivedAt || Date.now()).getTime();
}

function createTaskHistoryEntry(input, task, outcome) {
  return {
    streamerProfileId: input.streamerProfileId,
    widgetId: input.widgetId,
    taskListCycleId: task.taskListCycleId,
    taskId: task.id,
    taskNumber: task.taskNumber,
    text: task.text,
    authorLabel: task.authorLabel,
    source: task.source,
    outcome,
    closedByKind: "streamer",
    closedByLabel: String(input.closedByLabel || "Streamer").trim() || "Streamer",
    voteCount: task.voteCount ?? 0,
  };
}

async function addTask(repository, input, taskInput) {
  const text = normalizeTaskText(input.taskText);
  const authorLabel = String(taskInput.authorLabel || "Streamer").trim() || "Streamer";
  const currentState =
    (await repository.findTaskListStateByWidgetId(input.widgetId)) ??
    (await repository.createTaskListState({ widgetId: input.widgetId }));

  const task = await repository.appendTask(currentState.id, {
    taskListCycleId: currentState.currentCycleId,
    taskNumber: currentState.nextTaskNumber,
    text,
    status: "active",
    source: taskInput.source,
    authorLabel,
    ownerSubjectHash: taskInput.ownerSubjectHash ?? null,
    voteCount: 0,
  });

  const taskListState = await bumpTaskListStateVersion(repository, currentState, {
    nextTaskNumber: currentState.nextTaskNumber + 1,
  });

  const overlayState = await deriveOverlayState(repository, input, taskListState);

  return {
    task,
    taskListState,
    overlayState,
  };
}

export async function addDashboardTask(repository, input) {
  return addTask(repository, input, {
    source: "dashboard",
    authorLabel: input.streamerDisplayName,
  });
}

export async function addChatCommandTask(repository, input) {
  return addTask(repository, input, {
    source: "chat-command",
    authorLabel: input.actorLabel,
    ownerSubjectHash: input.actorSubjectHash,
  });
}

export async function editDashboardTaskText(repository, input) {
  const text = normalizeTaskText(input.taskText);
  const currentState = await findExistingTaskListState(repository, input.widgetId);
  const currentTask = await repository.findTaskById(currentState.id, input.taskId);

  if (!currentTask || currentTask.status !== "active") {
    throw new TaskListStateError("Active Task was not found");
  }

  const task = await repository.updateTask(currentState.id, input.taskId, {
    text,
  });
  const taskListState = await bumpTaskListStateVersion(repository, currentState);
  const overlayState = await deriveOverlayState(repository, input, taskListState);

  return {
    task,
    taskListState,
    overlayState,
  };
}

export async function completeDashboardTask(repository, input) {
  const currentState = await findExistingTaskListState(repository, input.widgetId);
  const currentTask = await repository.findTaskById(currentState.id, input.taskId);

  if (!currentTask || currentTask.status !== "active") {
    throw new TaskListStateError("Active Task was not found");
  }

  const task = await repository.updateTask(currentState.id, input.taskId, {
    status: "completed",
  });
  const historyEntry = await repository.appendTaskHistory(createTaskHistoryEntry(input, task, "completed"));
  const taskListState = await bumpTaskListStateVersion(repository, currentState);
  const overlayState = await deriveOverlayState(repository, input, taskListState);

  return {
    task,
    historyEntry,
    taskListState,
    overlayState,
  };
}

export async function removeDashboardTask(repository, input) {
  const currentState = await findExistingTaskListState(repository, input.widgetId);
  const currentTask = await repository.findTaskById(currentState.id, input.taskId);

  if (!currentTask || currentTask.status !== "active") {
    throw new TaskListStateError("Active Task was not found");
  }

  const task = await repository.removeTask(currentState.id, input.taskId);
  const historyEntry = await repository.appendTaskHistory(createTaskHistoryEntry(input, task, "removed"));
  const taskListState = await bumpTaskListStateVersion(repository, currentState);
  const overlayState = await deriveOverlayState(repository, input, taskListState);

  return {
    task,
    historyEntry,
    taskListState,
    overlayState,
  };
}

export async function voteChatCommandTask(repository, input) {
  const currentState = await findExistingTaskListState(repository, input.widgetId);
  const currentTask = await repository.findTaskById(currentState.id, input.taskId);

  if (!currentTask || currentTask.status !== "active") {
    throw new TaskListStateError("Active Task was not found");
  }

  const existingVote = await repository.findTaskVote?.(
    currentState.id,
    currentTask.taskListCycleId,
    input.viewerSubjectHash,
  );

  if (existingVote?.taskId === currentTask.id) {
    return {
      task: currentTask,
      taskListState: currentState,
      overlayState: await deriveOverlayState(repository, input, currentState),
      ignoredReason: "duplicate_vote",
    };
  }

  if (existingVote && isInCooldown(existingVote.cooldownUntil, input.receivedAt)) {
    return {
      task: currentTask,
      taskListState: currentState,
      overlayState: await deriveOverlayState(repository, input, currentState),
      ignoredReason: "vote_cooldown",
    };
  }

  const cooldownUntil = createCooldownUntil(input.receivedAt, input.voteCooldownSeconds);

  if (existingVote) {
    const previousTask = await repository.findTaskById(currentState.id, existingVote.taskId);
    if (previousTask) {
      await repository.updateTask(currentState.id, previousTask.id, {
        voteCount: Math.max(0, (previousTask.voteCount ?? 0) - 1),
      });
    }

    await repository.updateTaskVote?.(currentState.id, currentTask.taskListCycleId, input.viewerSubjectHash, {
      taskId: currentTask.id,
      viewerLabel: input.viewerLabel,
      cooldownUntil,
    });
  } else {
    await repository.saveTaskVote?.({
      taskListStateId: currentState.id,
      taskListCycleId: currentTask.taskListCycleId,
      taskId: currentTask.id,
      viewerSubjectHash: input.viewerSubjectHash,
      viewerLabel: input.viewerLabel,
      cooldownUntil,
    });
  }

  const task = await repository.updateTask(currentState.id, currentTask.id, {
    voteCount: (currentTask.voteCount ?? 0) + 1,
  });
  const taskListState = await bumpTaskListStateVersion(repository, currentState);
  const overlayState = await deriveOverlayState(repository, input, taskListState);

  return {
    task,
    taskListState,
    overlayState,
  };
}

export async function resetDashboardTaskList(repository, input) {
  const currentState = await findExistingTaskListState(repository, input.widgetId);
  const clearedTasks = await repository.clearTasks(currentState.id);
  const historyEntries = [];

  for (const task of clearedTasks) {
    historyEntries.push(await repository.appendTaskHistory(createTaskHistoryEntry(input, task, "reset")));
  }

  const nextCycle = await repository.createTaskListCycle(currentState.id, {
    startedByKind: "streamer",
    startedByLabel: String(input.closedByLabel || "Streamer").trim() || "Streamer",
  });
  const taskListState = await bumpTaskListStateVersion(repository, currentState, {
    currentCycleId: nextCycle.id,
    nextTaskNumber: 1,
  });
  const overlayState = await deriveOverlayState(repository, input, taskListState);

  return {
    historyEntries,
    taskListState,
    overlayState,
  };
}
