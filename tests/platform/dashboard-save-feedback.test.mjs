import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createDashboardSaveErrorRedirect,
  getDashboardSaveErrorMessage,
  toDashboardSaveErrorCode,
} from "../../lib/platform/dashboard-save-feedback.js";
import { TaskListStateError } from "../../lib/platform/task-list-state.js";

class PlatformAuthorizationError extends Error {
  constructor(message) {
    super(message);
    this.name = "PlatformAuthorizationError";
  }
}

describe("Dashboard save feedback", () => {
  it("maps domain validation errors to actionable messages", () => {
    const code = toDashboardSaveErrorCode(new TaskListStateError("Task Text is required"));

    assert.equal(code, "validation");
    assert.equal(getDashboardSaveErrorMessage(code), "Check the highlighted fields and try saving again.");
  });

  it("maps persistence errors to a generic safe save-failed message", () => {
    const code = toDashboardSaveErrorCode(new Error("duplicate key value violates unique constraint overlay_links_public_token_hash_key"));

    assert.equal(code, "save_failed");
    assert.equal(getDashboardSaveErrorMessage(code), "We couldn't save that change. Please try again.");
  });

  it("maps authorization-shaped errors without revealing cross-profile existence", () => {
    const code = toDashboardSaveErrorCode(new PlatformAuthorizationError("Profile exists but belongs to someone else"));

    assert.equal(code, "not_found");
    assert.equal(getDashboardSaveErrorMessage(code), "That dashboard item couldn't be found.");
  });

  it("creates safe dashboard redirects with action context", () => {
    assert.equal(
      createDashboardSaveErrorRedirect("profile-1", "validation", "task"),
      "/dashboard/profile-1?saveError=validation&saveAction=task",
    );
    assert.equal(
      createDashboardSaveErrorRedirect("profile 1", "save_failed", "settings"),
      "/dashboard/profile%201?saveError=save_failed&saveAction=settings",
    );
  });

  it("falls back to a generic message for unknown or missing error codes", () => {
    assert.equal(getDashboardSaveErrorMessage("database-password-leak"), "We couldn't save that change. Please try again.");
    assert.equal(getDashboardSaveErrorMessage(null), null);
  });
});
