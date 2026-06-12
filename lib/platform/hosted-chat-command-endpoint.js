import { processHostedChatCommand } from "./hosted-chat-command.js";

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validationError(message) {
  return {
    status: 400,
    body: {
      status: "error",
      error: message,
    },
  };
}

export function isAuthorizedHostedChatCommandRequest(request, expectedToken) {
  if (!expectedToken) return false;

  const authorization = request.headers.get("authorization") || "";
  const parts = authorization.trim().split(/\s+/);
  if (parts.length !== 2) return false;

  const [scheme, token] = parts;
  return scheme.toLowerCase() === "bearer" && token === expectedToken;
}

export async function processHostedChatCommandPayload(repository, payload) {
  if (!payload || typeof payload !== "object") {
    return validationError("Request body must be an object");
  }

  if (!isNonEmptyString(payload.streamerProfileId)) {
    return validationError("streamerProfileId is required");
  }

  if (!isNonEmptyString(payload.widgetId)) {
    return validationError("widgetId is required");
  }

  if (!isNonEmptyString(payload.rawCommandText)) {
    return validationError("rawCommandText is required");
  }

  if (!isNonEmptyString(payload.actorLabel)) {
    return validationError("actorLabel is required");
  }

  if (!isNonEmptyString(payload.actorSubjectHash)) {
    return validationError("actorSubjectHash is required");
  }

  const repositoryActiveSettings = await repository.listActiveWidgetCommandSettings?.(payload.streamerProfileId);
  const activeWidgetCommandSettings = repositoryActiveSettings ?? payload.activeWidgetCommandSettings ?? [];
  const widgetCommandSettings = activeWidgetCommandSettings.find((settings) => settings.widgetId === payload.widgetId);
  const commandSettings = widgetCommandSettings ?? payload.commandSettings ?? {};

  if (repositoryActiveSettings && activeWidgetCommandSettings.length === 0) {
    return validationError("no active command widgets");
  }

  if (activeWidgetCommandSettings.length > 0 && !widgetCommandSettings) {
    return validationError("widgetId is not an active command widget");
  }

  const result = await processHostedChatCommand(repository, {
    streamerProfileId: payload.streamerProfileId,
    widgetId: payload.widgetId,
    rawCommandText: payload.rawCommandText,
    actorLabel: payload.actorLabel,
    actorSubjectHash: payload.actorSubjectHash,
    commandSettings,
    activeWidgetCommandSettings,
    receivedAt: payload.receivedAt,
  });

  return {
    status: 202,
    body: {
      status: result.outcome,
      reason: result.reason ?? null,
      taskNumber: result.task?.taskNumber ?? null,
    },
  };
}
