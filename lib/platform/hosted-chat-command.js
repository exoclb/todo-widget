import {
  addChatCommandTask,
  completeDashboardTask,
  removeDashboardTask,
  resetDashboardTaskList,
  voteChatCommandTask,
} from "./task-list-state.js";

function normalizeCommandName(value) {
  return String(value || "").trim().toLowerCase();
}

function parseCommand(rawCommandText) {
  const text = String(rawCommandText || "").trim();
  const [commandName = "", ...rest] = text.split(/\s+/);

  return {
    commandName: normalizeCommandName(commandName),
    argumentText: rest.join(" ").trim(),
  };
}

async function appendCommandLog(repository, input) {
  if (!repository.appendCommandLog) return null;

  return repository.appendCommandLog({
    streamerProfileId: input.streamerProfileId,
    widgetId: input.widgetId,
    taskListStateId: input.taskListStateId ?? null,
    commandName: input.commandName,
    rawCommandText: input.rawCommandText,
    actorLabel: input.actorLabel,
    actorSubjectHash: input.actorSubjectHash ?? null,
    outcome: input.outcome,
    ignoredReason: input.ignoredReason ?? null,
    createdTaskId: input.createdTaskId ?? null,
    affectedTaskId: input.affectedTaskId ?? null,
  });
}

function parseTaskNumber(argumentText) {
  const taskNumber = Number(String(argumentText || "").trim().replace(/^#/, ""));
  return Number.isInteger(taskNumber) && taskNumber > 0 ? taskNumber : null;
}

function isTaskManager(input) {
  const managerSubjectHashes = Array.isArray(input.commandSettings?.taskManagerSubjectHashes)
    ? input.commandSettings.taskManagerSubjectHashes
    : [];
  return managerSubjectHashes.includes(input.actorSubjectHash);
}

async function findTaskByNumber(repository, widgetId, taskNumber) {
  const taskListState = await repository.findTaskListStateByWidgetId(widgetId);
  if (!taskListState) return { taskListState: null, task: null };

  const tasks = await repository.listRenderableTasks(taskListState.id);
  const task = tasks.find((candidate) => candidate.taskNumber === taskNumber && candidate.status === "active") ?? null;
  return { taskListState, task };
}

async function ignoreCommand(repository, input, parsed, reason, taskListStateId = null) {
  await appendCommandLog(repository, {
    ...input,
    taskListStateId,
    commandName: parsed.commandName,
    outcome: "ignored",
    ignoredReason: reason,
  });

  return { outcome: "ignored", reason };
}

function hasCommandConflict(input, commandName) {
  const activeSettings = Array.isArray(input.activeWidgetCommandSettings) ? input.activeWidgetCommandSettings : [];
  if (activeSettings.length <= 1) return false;

  const commandFields = ["addCommand", "doneCommand", "deleteCommand", "resetCommand", "voteCommand"];
  const matchingWidgetIds = new Set();

  for (const settings of activeSettings) {
    for (const field of commandFields) {
      if (normalizeCommandName(settings?.[field]) === commandName) {
        matchingWidgetIds.add(settings.widgetId || settings.id || String(matchingWidgetIds.size + 1));
      }
    }
  }

  return matchingWidgetIds.size > 1;
}

async function processAddCommand(repository, input, parsed) {
  if (!parsed.argumentText) {
    return ignoreCommand(repository, input, parsed, "missing_task_text");
  }

  const result = await addChatCommandTask(repository, {
    streamerProfileId: input.streamerProfileId,
    widgetId: input.widgetId,
    taskText: parsed.argumentText,
    actorLabel: input.actorLabel,
    actorSubjectHash: input.actorSubjectHash,
  });

  const commandLog = await appendCommandLog(repository, {
    ...input,
    taskListStateId: result.taskListState.id,
    commandName: parsed.commandName,
    outcome: "accepted",
    createdTaskId: result.task.id,
  });

  return {
    outcome: "accepted",
    task: result.task,
    taskListState: result.taskListState,
    overlayState: result.overlayState,
    commandLog,
  };
}

async function findPermittedActiveTask(repository, input, parsed) {
  const taskNumber = parseTaskNumber(parsed.argumentText);
  if (!taskNumber) {
    return { ignored: await ignoreCommand(repository, input, parsed, "missing_task_number") };
  }

  const { taskListState, task } = await findTaskByNumber(repository, input.widgetId, taskNumber);
  if (!task) {
    return { ignored: await ignoreCommand(repository, input, parsed, "task_not_found", taskListState?.id ?? null) };
  }

  if (task.ownerSubjectHash !== input.actorSubjectHash && !isTaskManager(input)) {
    return { ignored: await ignoreCommand(repository, input, parsed, "not_task_owner_or_manager", taskListState.id) };
  }

  return { task };
}

async function processDoneCommand(repository, input, parsed) {
  const permitted = await findPermittedActiveTask(repository, input, parsed);
  if (permitted.ignored) return permitted.ignored;

  const result = await completeDashboardTask(repository, {
    streamerProfileId: input.streamerProfileId,
    widgetId: input.widgetId,
    taskId: permitted.task.id,
    closedByLabel: input.actorLabel,
  });

  const commandLog = await appendCommandLog(repository, {
    ...input,
    taskListStateId: result.taskListState.id,
    commandName: parsed.commandName,
    outcome: "accepted",
    affectedTaskId: result.task.id,
  });

  return {
    outcome: "accepted",
    task: result.task,
    taskListState: result.taskListState,
    overlayState: result.overlayState,
    commandLog,
  };
}

async function processDeleteCommand(repository, input, parsed) {
  const permitted = await findPermittedActiveTask(repository, input, parsed);
  if (permitted.ignored) return permitted.ignored;

  const result = await removeDashboardTask(repository, {
    streamerProfileId: input.streamerProfileId,
    widgetId: input.widgetId,
    taskId: permitted.task.id,
    closedByLabel: input.actorLabel,
  });

  const commandLog = await appendCommandLog(repository, {
    ...input,
    taskListStateId: result.taskListState.id,
    commandName: parsed.commandName,
    outcome: "accepted",
    affectedTaskId: result.task.id,
  });

  return {
    outcome: "accepted",
    task: result.task,
    taskListState: result.taskListState,
    overlayState: result.overlayState,
    commandLog,
  };
}

async function processResetCommand(repository, input, parsed) {
  if (!isTaskManager(input)) {
    return ignoreCommand(repository, input, parsed, "not_task_manager");
  }

  const taskListState = await repository.findTaskListStateByWidgetId(input.widgetId);
  if (!taskListState) {
    return ignoreCommand(repository, input, parsed, "task_list_not_found");
  }

  const result = await resetDashboardTaskList(repository, {
    streamerProfileId: input.streamerProfileId,
    widgetId: input.widgetId,
    closedByLabel: input.actorLabel,
  });

  const commandLog = await appendCommandLog(repository, {
    ...input,
    taskListStateId: result.taskListState.id,
    commandName: parsed.commandName,
    outcome: "accepted",
  });

  return {
    outcome: "accepted",
    taskListState: result.taskListState,
    overlayState: result.overlayState,
    commandLog,
  };
}

async function processVoteCommand(repository, input, parsed) {
  if (!input.commandSettings?.enableVoting) {
    return ignoreCommand(repository, input, parsed, "voting_disabled");
  }

  const taskNumber = parseTaskNumber(parsed.argumentText);
  if (!taskNumber) {
    return ignoreCommand(repository, input, parsed, "missing_task_number");
  }

  const { taskListState, task } = await findTaskByNumber(repository, input.widgetId, taskNumber);
  if (!task) {
    return ignoreCommand(repository, input, parsed, "task_not_found", taskListState?.id ?? null);
  }

  const result = await voteChatCommandTask(repository, {
    streamerProfileId: input.streamerProfileId,
    widgetId: input.widgetId,
    taskId: task.id,
    viewerSubjectHash: input.actorSubjectHash,
    viewerLabel: input.actorLabel,
    voteCooldownSeconds: input.commandSettings?.voteCooldownSeconds,
    receivedAt: input.receivedAt,
  });

  if (result.ignoredReason) {
    return ignoreCommand(repository, input, parsed, result.ignoredReason, result.taskListState.id);
  }

  const commandLog = await appendCommandLog(repository, {
    ...input,
    taskListStateId: result.taskListState.id,
    commandName: parsed.commandName,
    outcome: "accepted",
    affectedTaskId: result.task.id,
  });

  return {
    outcome: "accepted",
    task: result.task,
    taskListState: result.taskListState,
    overlayState: result.overlayState,
    commandLog,
  };
}

export async function processHostedChatCommand(repository, input) {
  const parsed = parseCommand(input.rawCommandText);

  if (hasCommandConflict(input, parsed.commandName)) {
    return ignoreCommand(repository, input, parsed, "command_conflict");
  }

  const addCommand = normalizeCommandName(input.commandSettings?.addCommand || "!task");
  const doneCommand = normalizeCommandName(input.commandSettings?.doneCommand || "!done");
  const deleteCommand = normalizeCommandName(input.commandSettings?.deleteCommand || "!delete");
  const resetCommand = normalizeCommandName(input.commandSettings?.resetCommand || "!taskreset");
  const voteCommand = normalizeCommandName(input.commandSettings?.voteCommand || "!vote");

  if (parsed.commandName === addCommand) {
    return processAddCommand(repository, input, parsed);
  }

  if (parsed.commandName === doneCommand) {
    return processDoneCommand(repository, input, parsed);
  }

  if (parsed.commandName === deleteCommand) {
    return processDeleteCommand(repository, input, parsed);
  }

  if (parsed.commandName === resetCommand) {
    return processResetCommand(repository, input, parsed);
  }

  if (parsed.commandName === voteCommand) {
    return processVoteCommand(repository, input, parsed);
  }

  return ignoreCommand(repository, input, parsed, "unknown_command");
}

export function createHostedChatCommandProcessor(repository) {
  let queue = Promise.resolve();

  return {
    process(input) {
      const next = queue.then(() => processHostedChatCommand(repository, input));
      queue = next.catch(() => undefined);
      return next;
    },
  };
}
