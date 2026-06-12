import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createHostedOverlayHtml,
  createSavedPreviewHtml,
  getRenderableOverlayState,
} from "../../lib/platform/hosted-overlay-render.js";

const persistedOverlayState = {
  schemaVersion: 1,
  profile: { slug: "demo-streamer", displayName: "Demo Streamer" },
  overlay: { refreshIntervalMs: 3000 },
  widgets: [
    {
      id: "todo-main",
      type: "todo",
      title: "STREAM TASKS",
      enabled: true,
      position: "top-right",
      settings: { emptyText: "No tasks yet", maxItems: 10 },
      data: {
        todos: [
          {
            taskNumber: 1,
            text: "Review next game idea",
            status: "active",
            source: "dashboard",
            authorLabel: "Demo Streamer",
            voteCount: 0,
          },
        ],
      },
    },
    {
      id: "disabled-todo",
      type: "todo",
      title: "DISABLED TASKS",
      enabled: false,
      data: {
        todos: [{ taskNumber: 99, text: "Should not render", status: "active" }],
      },
    },
  ],
  taskHistory: [{ text: "Private completed task" }],
  commandLogs: [{ rawCommandText: "!task private" }],
  taskVotes: [{ viewerLabel: "PrivateViewer" }],
  diagnostics: { secret: "debug details" },
};

describe("Hosted Overlay render", () => {
  it("renders Active Task Widgets from persisted Overlay State todos", () => {
    const html = createHostedOverlayHtml(persistedOverlayState);

    assert.match(html, /STREAM TASKS/);
    assert.match(html, /#1/);
    assert.match(html, /Review next game idea/);
    assert.match(html, /Demo Streamer/);
    assert.match(html, /data-overlay-status="active"/);
  });

  it("renders only Active Widgets and excludes dashboard-private state", () => {
    const html = createHostedOverlayHtml(persistedOverlayState);

    assert.doesNotMatch(html, /Should not render/);
    assert.doesNotMatch(html, /Private completed task/);
    assert.doesNotMatch(html, /!task private/);
    assert.doesNotMatch(html, /PrivateViewer/);
    assert.doesNotMatch(html, /debug details/);
  });

  it("returns a stream-safe inactive shell without Overlay State data", () => {
    const html = createHostedOverlayHtml(null);

    assert.match(html, /data-overlay-status="inactive"/);
    assert.match(html, /hosted-overlay__disabled/);
    assert.doesNotMatch(html, /Review next game idea/);
    assert.doesNotMatch(html, /Demo Streamer/);
  });

  it("uses the same renderable Overlay State for Hosted Overlay and Saved Preview", () => {
    assert.deepEqual(getRenderableOverlayState(persistedOverlayState), {
      schemaVersion: 1,
      profile: { slug: "demo-streamer", displayName: "Demo Streamer" },
      overlay: { refreshIntervalMs: 3000 },
      widgets: [persistedOverlayState.widgets[0]],
    });

    const hostedHtml = createHostedOverlayHtml(persistedOverlayState);
    const previewHtml = createSavedPreviewHtml(persistedOverlayState);

    assert.match(previewHtml, /data-preview-surface="saved"/);
    assert.equal(hostedHtml.includes("Review next game idea"), previewHtml.includes("Review next game idea"));
  });

  it("does not expose mutation controls or mutation endpoints", () => {
    const html = createHostedOverlayHtml(persistedOverlayState);

    assert.doesNotMatch(html, /<form/i);
    assert.doesNotMatch(html, /<button/i);
    assert.doesNotMatch(html, /method=/i);
    assert.doesNotMatch(html, /action=/i);
  });

  it("uses persisted Overlay State refresh interval for read-only refresh", () => {
    const html = createHostedOverlayHtml(persistedOverlayState);

    assert.match(html, /data-refresh-interval-ms="3000"/);
    assert.match(html, /window\.location\.reload\(\)/);
  });
});
