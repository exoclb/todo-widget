function isPlainObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeTodo(todo) {
  return {
    taskNumber: Number.isInteger(Number(todo?.taskNumber)) ? Number(todo.taskNumber) : 0,
    text: String(todo?.text || todo?.title || "").trim(),
    status: String(todo?.status || "active"),
    source: String(todo?.source || "dashboard"),
    authorLabel: String(todo?.authorLabel || "Streamer"),
    voteCount: Math.max(0, Number(todo?.voteCount) || 0),
  };
}

function renderTodoWidget(widget) {
  const settings = isPlainObject(widget.settings) ? widget.settings : {};
  const data = isPlainObject(widget.data) ? widget.data : {};
  const todos = Array.isArray(data.todos) ? data.todos.map(normalizeTodo).filter((todo) => todo.text) : [];
  const maxItems = Number(settings.maxItems) || todos.length || 10;
  const emptyText = String(settings.emptyText || "No tasks yet");

  return `
    <section class="todo-widget todo-widget--${escapeHtml(widget.position || "top-right")}" aria-live="polite">
      <div class="todo-widget__panel">
        <header class="todo-widget__header">
          <div class="todo-widget__title">${escapeHtml(widget.title || "STREAM TASKS")}</div>
          <div class="todo-widget__counter">${todos.length}/${escapeHtml(maxItems)}</div>
        </header>
        ${
          todos.length
            ? `<ol class="todo-widget__list">${todos
                .map(
                  (todo) => `
                    <li class="todo-widget__task todo-widget__task--${escapeHtml(todo.status)}">
                      <span class="todo-widget__task-number">#${escapeHtml(todo.taskNumber)}</span>
                      <span class="todo-widget__task-text">${escapeHtml(todo.text)}</span>
                      <span class="todo-widget__task-meta">${escapeHtml(todo.authorLabel)} · ${escapeHtml(todo.source)} · ${escapeHtml(todo.voteCount)} votes</span>
                    </li>`,
                )
                .join("")}</ol>`
            : `<div class="todo-widget__empty">${escapeHtml(emptyText)}</div>`
        }
      </div>
    </section>`;
}

export function getRenderableOverlayState(overlayState) {
  if (!isPlainObject(overlayState) || !isPlainObject(overlayState.profile) || !Array.isArray(overlayState.widgets)) {
    return null;
  }

  const widgets = overlayState.widgets.filter((widget) => isPlainObject(widget) && widget.enabled !== false);

  if (!widgets.length) {
    return null;
  }

  const renderable = {
    schemaVersion: overlayState.schemaVersion || 1,
    profile: overlayState.profile,
    widgets,
  };

  if (isPlainObject(overlayState.overlay)) {
    renderable.overlay = overlayState.overlay;
  }

  return renderable;
}

function renderOverlayBody(renderableOverlayState) {
  if (!renderableOverlayState) {
    return `<div class="hosted-overlay__disabled" aria-hidden="true"></div>`;
  }

  return renderableOverlayState.widgets
    .map((widget) => {
      if (widget.type === "todo") {
        return renderTodoWidget(widget);
      }

      return "";
    })
    .join("");
}

function getRefreshIntervalMs(renderableOverlayState) {
  const value = Number(renderableOverlayState?.overlay?.refreshIntervalMs);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.max(1000, Math.floor(value));
}

function renderRefreshScript(refreshIntervalMs) {
  if (!refreshIntervalMs) return "";

  return `<script>
      window.setTimeout(function () {
        window.location.reload();
      }, ${refreshIntervalMs});
    </script>`;
}

function createOverlayHtml(overlayState, options = {}) {
  const renderableOverlayState = getRenderableOverlayState(overlayState);
  const status = renderableOverlayState ? "active" : "inactive";
  const previewAttribute = options.previewSurface ? ` data-preview-surface="${escapeHtml(options.previewSurface)}"` : "";
  const refreshIntervalMs = getRefreshIntervalMs(renderableOverlayState);
  const refreshAttribute = refreshIntervalMs ? ` data-refresh-interval-ms="${refreshIntervalMs}"` : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${options.title || "Hosted Overlay"}</title>
    <style>
      html, body { width: 100%; min-height: 100%; margin: 0; background: transparent; overflow: hidden; font-family: Inter, system-ui, sans-serif; }
      body[data-overlay-status="inactive"] { background: transparent; }
      .hosted-overlay__disabled { width: 100vw; height: 100vh; background: transparent; }
      .todo-widget { position: absolute; top: 24px; right: 24px; width: 360px; color: #1d2528; }
      .todo-widget--top-left { left: 24px; right: auto; }
      .todo-widget--bottom-left { left: 24px; right: auto; top: auto; bottom: 24px; }
      .todo-widget--bottom-right { top: auto; bottom: 24px; }
      .todo-widget__panel { border-radius: 18px; background: rgba(255, 255, 255, 0.94); box-shadow: 0 18px 60px rgba(0, 0, 0, 0.18); padding: 16px; }
      .todo-widget__header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
      .todo-widget__title { font-weight: 900; letter-spacing: 0.06em; }
      .todo-widget__counter, .todo-widget__task-meta, .todo-widget__empty { color: #5f696b; font-size: 13px; }
      .todo-widget__list { display: grid; gap: 8px; list-style: none; margin: 0; padding: 0; }
      .todo-widget__task { display: grid; grid-template-columns: auto 1fr; gap: 6px 10px; border-radius: 12px; background: rgba(40, 111, 108, 0.08); padding: 10px; }
      .todo-widget__task-number { font-weight: 900; color: #286f6c; }
      .todo-widget__task-text { font-weight: 800; }
      .todo-widget__task-meta { grid-column: 2; }
      .todo-widget__task--completed .todo-widget__task-text { text-decoration: line-through; }
    </style>
  </head>
  <body data-overlay-status="${status}"${previewAttribute}${refreshAttribute}>
    ${renderOverlayBody(renderableOverlayState)}
    ${renderRefreshScript(refreshIntervalMs)}
  </body>
</html>`;
}

export function createHostedOverlayHtml(overlayState) {
  return createOverlayHtml(overlayState, { title: "Hosted Overlay" });
}

export function createSavedPreviewHtml(overlayState) {
  return createOverlayHtml(overlayState, { title: "Saved Preview", previewSurface: "saved" });
}
