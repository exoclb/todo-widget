const DASHBOARD_SAVE_ERROR_MESSAGES = {
  validation: "Check the highlighted fields and try saving again.",
  save_failed: "We couldn't save that change. Please try again.",
  not_found: "That dashboard item couldn't be found.",
};

export function toDashboardSaveErrorCode(error) {
  if (error?.name === "TaskListStateError") {
    return "validation";
  }

  if (error?.name === "PlatformAuthorizationError") {
    return "not_found";
  }

  return "save_failed";
}

export function getDashboardSaveErrorMessage(code) {
  if (!code) return null;
  return DASHBOARD_SAVE_ERROR_MESSAGES[code] ?? DASHBOARD_SAVE_ERROR_MESSAGES.save_failed;
}

export function createDashboardSaveErrorRedirect(profileId, code, action) {
  const searchParams = new URLSearchParams({
    saveError: code,
    saveAction: action,
  });

  return `/dashboard/${encodeURIComponent(profileId)}?${searchParams.toString()}`;
}
