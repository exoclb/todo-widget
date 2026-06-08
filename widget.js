(function () {
  "use strict";

  const STORAGE_KEY = "twitchTodoWidgetState";
  const PLATFORM_SCHEMA_VERSION = 1;
  const TODO_WIDGET_TYPE = "todo";
  const DEFAULT_CONFIG = {
    platformSchemaVersion: PLATFORM_SCHEMA_VERSION,
    profileSlug: "demo-streamer",
    profileDisplayName: "Demo Streamer",
    overlayRefreshIntervalMs: 3000,
    titleText: "STREAM TASKS",
    titleDisplayMode: "text",
    clockFormat: "24h",
    clockShowSeconds: true,
    emptyText: "No tasks yet",
    addCommand: "!task",
    doneCommand: "!done",
    deleteCommand: "!delete",
    resetCommand: "!taskreset",
    enableVoting: false,
    voteCommand: "!vote",
    voteCooldownSeconds: 10,
    voteDuplicateBehavior: "ignore",
    votePrioritySort: false,
    maxTasks: 10,
    maxTaskLength: 80,
    perUserTaskLimit: 2,
    globalCooldownSeconds: 5,
    userCooldownSeconds: 30,
    completedVisibleSeconds: 5,
    moderatorNames: "",
    blacklistWords: "",
    debugMode: false,
    debugOverlay: false,
    diagnosticButton: "Add diagnostic task",
    position: "top-right",
    layoutMode: "compact",
    theme: "material-light",
    themePreset: "material-light",
    taskLabelSingular: "Task",
    taskLabelPlural: "Tasks",
    fontFamily: "Lexend",
    accentColor: "#3f7df6",
    maxWidth: 360,
    maxListHeight: 360,
    hideScrollbar: true,
    backgroundOpacity: 0.96,
    panelImage: "",
    panelImageOpacity: 0.35,
    panelImageFit: "cover",
    frameImage: "",
    frameImageOpacity: 0.55,
    frameImageFit: "cover",
    taskIconImage: "",
    taskIconImageOpacity: 1,
    enableAnimations: true,
    animationSpeed: 1,
    streamerName: "",
  };

  const VALID_THEMES = new Set([
    "material-light",
    "material-dark",
    "catppuccin",
    "gruvbox",
    "nord",
    "tokyo-night",
    "dracula",
    "rose-pine",
    "kanagawa",
    "one-dark",
    "monokai",
  ]);
  const VALID_POSITIONS = new Set(["top-left", "top-right", "bottom-left", "bottom-right"]);
  const VALID_LAYOUT_MODES = new Set(["compact", "ticker", "board"]);
  const VALID_TITLE_DISPLAY_MODES = new Set(["text", "digital-clock"]);
  const VALID_CLOCK_FORMATS = new Set(["24h", "12h"]);
  const VALID_IMAGE_FITS = new Set(["cover", "contain"]);
  const VALID_VOTE_DUPLICATE_BEHAVIORS = new Set(["ignore", "change"]);
  const state = {
    config: { ...DEFAULT_CONFIG },
    storage: null,
    renderState: null,
    commandQueue: Promise.resolve(),
    cleanupTimer: null,
    autoScrollFrame: null,
    autoScrollFallbackTimer: null,
    autoScrollPauseUntil: 0,
    autoScrollOffset: 0,
    autoScrollLoopHeight: 0,
    titleClockTimer: null,
    globalCooldownUntil: 0,
    userCooldowns: new Map(),
    voteCooldowns: new Map(),
    renderedTaskStatuses: new Map(),
    hasRenderedTasks: false,
    previewLog: null,
    diagnostics: {
      status: "loading",
      lastEvent: "none",
      lastCommand: "none",
    },
  };

  function clampNumber(value, fallback, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(Math.max(number, min), max);
  }

  function normalizeCommand(command, fallback) {
    const value = String(command || "").trim();
    return value ? value.toLowerCase() : fallback;
  }

  function normalizeName(name) {
    return String(name || "").trim().toLowerCase();
  }

  function splitCsv(value) {
    return String(value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function normalizeImageUrl(value) {
    const url = String(value || "").trim();
    if (!url || /^javascript:/i.test(url)) return "";
    return url;
  }

  function cssUrl(value) {
    const url = normalizeImageUrl(value);
    return url ? `url("${url.replace(/["\\]/g, "\\$&")}")` : "none";
  }

  function normalizeThemePreset(source) {
    const value = String(source.themePreset || source.theme || DEFAULT_CONFIG.themePreset).trim();
    return VALID_THEMES.has(value) ? value : DEFAULT_CONFIG.themePreset;
  }

  function isPlainObject(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }

  function slugify(value, fallback) {
    const slug = String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return slug || fallback;
  }

  function normalizeVoteCount(value) {
    const count = Number(value);
    if (!Number.isFinite(count) || count < 0) return 0;
    return Math.floor(count);
  }

  function parseSnapshotTaskId(todo, fallback) {
    const taskNumber = Number(todo && todo.taskNumber);
    if (Number.isInteger(taskNumber) && taskNumber > 0) return taskNumber;
    const match = String((todo && todo.id) || "").match(/(\d+)$/);
    const parsed = match ? Number(match[1]) : 0;
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }

  const platformAdapter = {
    isOverlayConfig(value) {
      return isPlainObject(value) && Array.isArray(value.widgets) && isPlainObject(value.profile);
    },

    findTaskWidget(platformConfig) {
      const widgets = Array.isArray(platformConfig.widgets) ? platformConfig.widgets : [];
      return (
        widgets.find((widget) => widget && widget.type === TODO_WIDGET_TYPE && widget.enabled !== false) ||
        widgets.find((widget) => widget && widget.type === TODO_WIDGET_TYPE) ||
        null
      );
    },

    toFieldData(platformConfig) {
      const profile = isPlainObject(platformConfig.profile) ? platformConfig.profile : {};
      const overlay = isPlainObject(platformConfig.overlay) ? platformConfig.overlay : {};
      const theme = isPlainObject(platformConfig.theme) ? platformConfig.theme : {};
      const themeTokens = isPlainObject(theme.tokens) ? theme.tokens : theme;
      const taskWidget = this.findTaskWidget(platformConfig);
      const taskSettings = taskWidget && isPlainObject(taskWidget.settings) ? taskWidget.settings : {};

      return {
        platformSchemaVersion: platformConfig.schemaVersion || DEFAULT_CONFIG.platformSchemaVersion,
        profileSlug: profile.slug,
        profileDisplayName: profile.displayName,
        overlayRefreshIntervalMs: overlay.refreshIntervalMs,
        titleText: taskWidget && taskWidget.title,
        emptyText: taskSettings.emptyText,
        position: taskWidget && taskWidget.position,
        maxTasks: taskSettings.maxItems,
        enableVoting: taskSettings.enableVoting,
        votePrioritySort: taskSettings.votePrioritySort,
        layoutMode: taskSettings.layoutMode,
        themePreset: themeTokens.themePreset,
        fontFamily: themeTokens.fontFamily,
        accentColor: themeTokens.accentColor || themeTokens.accent,
        backgroundOpacity: themeTokens.backgroundOpacity,
      };
    },

    toStoredState(platformConfig) {
      const taskWidget = this.findTaskWidget(platformConfig);
      const data = taskWidget && isPlainObject(taskWidget.data) ? taskWidget.data : {};
      const todos = Array.isArray(data.todos) ? data.todos : [];
      const tasks = todos
        .filter((todo) => todo && typeof todo === "object")
        .map((todo, index) => {
          const id = parseSnapshotTaskId(todo, index + 1);
          const title = String(todo.title || todo.text || "").trim();
          const authorName = String(todo.authorName || todo.createdBy || "viewer").trim() || "viewer";
          const authorId = String(todo.authorId || todo.authorKey || authorName || `snapshot-${id}`);
          const createdAt = Number(todo.createdAt) || index + 1;
          return {
            id,
            text: title,
            authorId,
            authorKey: normalizeName(authorId || authorName),
            authorName,
            status: todo.isDone ? "completed" : "active",
            source: String(todo.source || "overlay-state"),
            createdAt,
            completedAt: todo.isDone ? Number(todo.completedAt) || createdAt : null,
            voteCount: normalizeVoteCount(todo.voteCount),
            votes: taskListState.normalizeVotes(todo.votes),
          };
        });
      const maxId = tasks.reduce((current, task) => Math.max(current, task.id), 0);
      return taskListState.normalize({ tasks, nextId: maxId + 1 });
    },

    resolveSource(fieldData) {
      if (!this.isOverlayConfig(fieldData)) return fieldData || {};
      return this.toFieldData(fieldData);
    },

    buildSnapshot(config, stored) {
      const tasks = taskListState.normalize(stored).tasks;
      const orderedTasks = taskListState.orderedTasks(tasks, config);
      return {
        schemaVersion: config.platformSchemaVersion,
        profile: {
          slug: config.profileSlug,
          displayName: config.profileDisplayName,
        },
        overlay: {
          refreshIntervalMs: config.overlayRefreshIntervalMs,
        },
        summary: {},
        theme: {
          tokens: {
            themePreset: config.themePreset,
            fontFamily: config.fontFamily,
            accentColor: config.accentColor,
            backgroundOpacity: config.backgroundOpacity,
            panelImage: config.panelImage,
            frameImage: config.frameImage,
            taskIconImage: config.taskIconImage,
          },
        },
        widgets: [
          {
            id: "todo-main",
            type: TODO_WIDGET_TYPE,
            title: config.titleText,
            enabled: true,
            position: config.position,
            sortOrder: 1,
            settings: {
              emptyText: config.emptyText,
              maxItems: config.maxTasks,
              showCompleted: true,
              showProgress: true,
              enableVoting: config.enableVoting,
              votePrioritySort: config.votePrioritySort,
              layoutMode: config.layoutMode,
            },
            data: {
              todos: orderedTasks.map((task, index) => ({
                id: `task-${task.id}`,
                taskNumber: task.id,
                title: task.text,
                authorName: task.authorName,
                isDone: task.status === "completed",
                voteCount: taskListState.voteCount(task),
                sortOrder: index + 1,
              })),
            },
          },
        ],
      };
    },
  };

  function normalizeLabel(value, fallback) {
    const label = String(value || fallback).replace(/\s+/g, " ").trim();
    return label || fallback;
  }

  function resolveMaxWidth(source, layoutMode) {
    const fallback = layoutMode === "compact" ? DEFAULT_CONFIG.maxWidth : 720;
    return clampNumber(source.maxWidth, fallback, 260, 900);
  }

  function resolveMaxListHeight(source, layoutMode) {
    const fallback = layoutMode === "board" ? 520 : DEFAULT_CONFIG.maxListHeight;
    return clampNumber(source.maxListHeight, fallback, 180, 720);
  }

  function buildConfig(fieldData) {
    const source = platformAdapter.resolveSource(fieldData);
    const layoutMode = VALID_LAYOUT_MODES.has(source.layoutMode) ? source.layoutMode : DEFAULT_CONFIG.layoutMode;
    return {
      ...DEFAULT_CONFIG,
      ...source,
      platformSchemaVersion: clampNumber(
        source.platformSchemaVersion,
        DEFAULT_CONFIG.platformSchemaVersion,
        1,
        PLATFORM_SCHEMA_VERSION,
      ),
      profileSlug: slugify(
        source.profileSlug || source.streamerName || source.profileDisplayName,
        DEFAULT_CONFIG.profileSlug,
      ),
      profileDisplayName:
        String(source.profileDisplayName || source.streamerName || DEFAULT_CONFIG.profileDisplayName).trim() ||
        DEFAULT_CONFIG.profileDisplayName,
      overlayRefreshIntervalMs: clampNumber(
        source.overlayRefreshIntervalMs,
        DEFAULT_CONFIG.overlayRefreshIntervalMs,
        1000,
        30000,
      ),
      titleText: String(source.titleText || DEFAULT_CONFIG.titleText).trim() || DEFAULT_CONFIG.titleText,
      titleDisplayMode: VALID_TITLE_DISPLAY_MODES.has(source.titleDisplayMode)
        ? source.titleDisplayMode
        : DEFAULT_CONFIG.titleDisplayMode,
      clockFormat: VALID_CLOCK_FORMATS.has(source.clockFormat) ? source.clockFormat : DEFAULT_CONFIG.clockFormat,
      clockShowSeconds: source.clockShowSeconds !== false && source.clockShowSeconds !== "false",
      emptyText: String(source.emptyText || DEFAULT_CONFIG.emptyText).trim() || DEFAULT_CONFIG.emptyText,
      addCommand: normalizeCommand(source.addCommand, DEFAULT_CONFIG.addCommand),
      doneCommand: normalizeCommand(source.doneCommand, DEFAULT_CONFIG.doneCommand),
      deleteCommand: normalizeCommand(source.deleteCommand, DEFAULT_CONFIG.deleteCommand),
      resetCommand: normalizeCommand(source.resetCommand, DEFAULT_CONFIG.resetCommand),
      enableVoting: source.enableVoting === true || source.enableVoting === "true",
      voteCommand: normalizeCommand(source.voteCommand, DEFAULT_CONFIG.voteCommand),
      voteCooldownSeconds: clampNumber(source.voteCooldownSeconds, DEFAULT_CONFIG.voteCooldownSeconds, 0, 300),
      voteDuplicateBehavior: VALID_VOTE_DUPLICATE_BEHAVIORS.has(source.voteDuplicateBehavior)
        ? source.voteDuplicateBehavior
        : DEFAULT_CONFIG.voteDuplicateBehavior,
      votePrioritySort: source.votePrioritySort === true || source.votePrioritySort === "true",
      maxTasks: clampNumber(source.maxTasks, DEFAULT_CONFIG.maxTasks, 1, 20),
      maxTaskLength: clampNumber(source.maxTaskLength, DEFAULT_CONFIG.maxTaskLength, 10, 160),
      perUserTaskLimit: clampNumber(source.perUserTaskLimit, DEFAULT_CONFIG.perUserTaskLimit, 1, 10),
      globalCooldownSeconds: clampNumber(source.globalCooldownSeconds, DEFAULT_CONFIG.globalCooldownSeconds, 0, 120),
      userCooldownSeconds: clampNumber(source.userCooldownSeconds, DEFAULT_CONFIG.userCooldownSeconds, 0, 300),
      completedVisibleSeconds: clampNumber(source.completedVisibleSeconds, DEFAULT_CONFIG.completedVisibleSeconds, 1, 30),
      position: VALID_POSITIONS.has(source.position) ? source.position : DEFAULT_CONFIG.position,
      layoutMode,
      theme: normalizeThemePreset(source),
      themePreset: normalizeThemePreset(source),
      taskLabelSingular: normalizeLabel(source.taskLabelSingular, DEFAULT_CONFIG.taskLabelSingular),
      taskLabelPlural: normalizeLabel(source.taskLabelPlural, DEFAULT_CONFIG.taskLabelPlural),
      fontFamily: String(source.fontFamily || DEFAULT_CONFIG.fontFamily).trim() || DEFAULT_CONFIG.fontFamily,
      accentColor: String(source.accentColor || DEFAULT_CONFIG.accentColor).trim() || DEFAULT_CONFIG.accentColor,
      maxWidth: resolveMaxWidth(source, layoutMode),
      maxListHeight: resolveMaxListHeight(source, layoutMode),
      hideScrollbar: source.hideScrollbar !== false && source.hideScrollbar !== "false",
      backgroundOpacity: clampNumber(source.backgroundOpacity, DEFAULT_CONFIG.backgroundOpacity, 0, 1),
      panelImage: normalizeImageUrl(source.panelImage),
      panelImageOpacity: clampNumber(source.panelImageOpacity, DEFAULT_CONFIG.panelImageOpacity, 0, 1),
      panelImageFit: VALID_IMAGE_FITS.has(source.panelImageFit) ? source.panelImageFit : DEFAULT_CONFIG.panelImageFit,
      frameImage: normalizeImageUrl(source.frameImage),
      frameImageOpacity: clampNumber(source.frameImageOpacity, DEFAULT_CONFIG.frameImageOpacity, 0, 1),
      frameImageFit: VALID_IMAGE_FITS.has(source.frameImageFit) ? source.frameImageFit : DEFAULT_CONFIG.frameImageFit,
      taskIconImage: normalizeImageUrl(source.taskIconImage),
      taskIconImageOpacity: clampNumber(source.taskIconImageOpacity, DEFAULT_CONFIG.taskIconImageOpacity, 0, 1),
      enableAnimations: source.enableAnimations !== false && source.enableAnimations !== "false",
      animationSpeed: clampNumber(source.animationSpeed, DEFAULT_CONFIG.animationSpeed, 0.5, 2),
      debugMode: source.debugMode === true || source.debugMode === "true",
      debugOverlay: source.debugOverlay === true || source.debugOverlay === "true",
      diagnosticButton: String(source.diagnosticButton || DEFAULT_CONFIG.diagnosticButton),
      moderatorNames: String(source.moderatorNames || ""),
      blacklistWords: String(source.blacklistWords || ""),
      streamerName: String(source.streamerName || ""),
    };
  }

  function debugLog(message, details) {
    if (!state.config.debugMode && !state.previewLog) return;
    const payload = details === undefined ? "" : details;
    if (state.config.debugMode) {
      console.log("[Twitch Todo Widget]", message, payload);
    }
    if (state.previewLog) {
      const line = document.createElement("div");
      line.textContent = details === undefined ? message : `${message}: ${JSON.stringify(details)}`;
      state.previewLog.prepend(line);
    }
  }

  function updateDiagnosticOverlay(nextDiagnostics) {
    state.diagnostics = { ...state.diagnostics, ...nextDiagnostics };
    const existing = document.getElementById("todo-debug-overlay");
    if (!state.config.debugOverlay) {
      if (existing) existing.remove();
      return;
    }

    const widget = document.getElementById("todo-widget");
    if (!widget) return;
    const overlay = existing || document.createElement("div");
    overlay.id = "todo-debug-overlay";
    overlay.style.cssText = [
      "position:absolute",
      "left:8px",
      "bottom:8px",
      "z-index:9999",
      "max-width:320px",
      "padding:8px 10px",
      "border:1px solid rgba(41,244,255,.65)",
      "border-radius:6px",
      "background:rgba(0,0,0,.78)",
      "color:#f7fbff",
      "font:12px/1.35 monospace",
      "pointer-events:none",
      "white-space:pre-wrap",
    ].join(";");
    overlay.textContent = [
      "Todo debug",
      `status: ${state.diagnostics.status}`,
      `event: ${state.diagnostics.lastEvent}`,
      `command: ${state.diagnostics.lastCommand}`,
    ].join("\n");
    if (!existing) widget.append(overlay);
  }

  function createStorageAdapter() {
    const streamElementsApi =
      window.SE_API || (typeof SE_API !== "undefined" && SE_API && typeof SE_API === "object" ? SE_API : null);
    if (streamElementsApi && streamElementsApi.store) {
      return {
        async get() {
          const stored = await streamElementsApi.store.get(STORAGE_KEY);
          return taskListState.normalize(stored);
        },
        async set(nextState) {
          await streamElementsApi.store.set(STORAGE_KEY, nextState);
        },
      };
    }

    let memoryState = taskListState.normalize(null);
    let localStorageRef = null;
    try {
      localStorageRef = window.localStorage;
    } catch (error) {
      debugLog("localStorage unavailable", { message: error.message });
    }

    return {
      async get() {
        if (!localStorageRef) return memoryState;
        try {
          memoryState = taskListState.normalize(JSON.parse(localStorageRef.getItem(STORAGE_KEY) || "null"));
          return memoryState;
        } catch (error) {
          debugLog("localStorage parse failed", { message: error.message });
          return memoryState;
        }
      },
      async set(nextState) {
        memoryState = taskListState.normalize(nextState);
        if (!localStorageRef) return;
        try {
          localStorageRef.setItem(STORAGE_KEY, JSON.stringify(nextState));
        } catch (error) {
          localStorageRef = null;
          debugLog("localStorage write failed", { message: error.message });
        }
      },
    };
  }

  const taskListState = {
    normalize(stored) {
      const base = stored && typeof stored === "object" ? stored : {};
      const tasks = Array.isArray(base.tasks) ? base.tasks : [];
      const nextId = Number.isInteger(base.nextId) && base.nextId > 0 ? base.nextId : 1;
      return {
        tasks: tasks
          .filter((task) => task && typeof task === "object")
          .map((task) => ({
            id: Number(task.id),
            text: String(task.text || ""),
            authorId: String(task.authorId || ""),
            authorKey: String(task.authorKey || ""),
            authorName: String(task.authorName || "viewer"),
            status: task.status === "completed" ? "completed" : "active",
            source: String(task.source || "chat-command"),
            createdAt: Number(task.createdAt) || Date.now(),
            completedAt: task.completedAt ? Number(task.completedAt) : null,
            voteCount: normalizeVoteCount(task.voteCount),
            votes: this.normalizeVotes(task.votes),
          }))
          .filter((task) => Number.isInteger(task.id) && task.id > 0 && task.text),
        nextId,
      };
    },

    normalizeVotes(votes) {
      if (!votes || typeof votes !== "object" || Array.isArray(votes)) return {};
      return Object.fromEntries(
        Object.entries(votes)
          .filter(([voterKey]) => voterKey)
          .map(([voterKey, vote]) => {
            const value = vote && typeof vote === "object" ? vote : {};
            return [
              String(voterKey),
              {
                voterName: String(value.voterName || "viewer"),
                votedAt: Number(value.votedAt) || Date.now(),
              },
            ];
          }),
      );
    },

    activeTasks(tasks) {
      return tasks.filter((task) => task.status === "active");
    },

    voteCount(task) {
      const voteKeys = Object.keys(task.votes || {});
      return voteKeys.length || normalizeVoteCount(task.voteCount);
    },

    findVotedTask(tasks, userKey) {
      return tasks.find((task) => task.status === "active" && task.votes && task.votes[userKey]);
    },

    cleanupExpired(storedState, completedVisibleSeconds, now) {
      const visibleMs = completedVisibleSeconds * 1000;
      const tasks = storedState.tasks.filter((task) => {
        if (task.status !== "completed") return true;
        return task.completedAt && now - task.completedAt < visibleMs;
      });
      return { ...storedState, tasks };
    },

    orderedTasks(tasks, config) {
      const byCreatedAt = (a, b) => a.createdAt - b.createdAt || a.id - b.id;
      if (!config.enableVoting || !config.votePrioritySort) {
        return [...tasks].sort(byCreatedAt);
      }
      return [...tasks].sort((a, b) => {
        if (a.status !== b.status) return a.status === "active" ? -1 : 1;
        if (a.status !== "active") return byCreatedAt(a, b);
        return this.voteCount(b) - this.voteCount(a) || byCreatedAt(a, b);
      });
    },

    addDashboardTask(stored, taskText, config, now) {
      const activeTasks = this.activeTasks(stored.tasks);
      if (activeTasks.length >= config.maxTasks) return { reason: "task_limit_full" };
      return {
        nextState: {
          tasks: [
            ...stored.tasks,
            {
              id: stored.nextId,
              text: taskText,
              authorId: "",
              authorKey: "",
              authorName: config.profileDisplayName || config.streamerName || "Dashboard",
              status: "active",
              source: "dashboard",
              createdAt: now,
              completedAt: null,
              votes: {},
            },
          ],
          nextId: stored.nextId + 1,
        },
      };
    },

    editTaskText(stored, idText, taskText) {
      const id = Number(idText);
      if (!Number.isInteger(id)) return { reason: "invalid_id" };
      let changed = false;
      const tasks = stored.tasks.map((task) => {
        if (task.id !== id || task.status !== "active") return task;
        changed = true;
        return { ...task, text: taskText };
      });
      return changed ? { nextState: { ...stored, tasks } } : { reason: "not_found_or_not_active" };
    },

    completeTask(stored, idText, now) {
      const id = Number(idText);
      if (!Number.isInteger(id)) return { reason: "invalid_id" };
      let changed = false;
      const tasks = stored.tasks.map((task) => {
        if (task.id !== id || task.status === "completed") return task;
        changed = true;
        return { ...task, status: "completed", completedAt: now };
      });
      return changed ? { nextState: { ...stored, tasks } } : { reason: "not_found_or_already_completed" };
    },

    removeTask(stored, idText) {
      const id = Number(idText);
      if (!Number.isInteger(id)) return { reason: "invalid_id" };
      const tasks = stored.tasks.filter((task) => task.id !== id);
      return tasks.length === stored.tasks.length ? { reason: "not_found" } : { nextState: { ...stored, tasks } };
    },

    resetTasks() {
      return { nextState: { tasks: [], nextId: 1 } };
    },
  };

  function sanitizeTaskText(rawText) {
    const text = String(rawText || "")
      .replace(/[\u0000-\u001f\u007f]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) return { ok: false, reason: "empty" };
    if (text.length > state.config.maxTaskLength) return { ok: false, reason: "too_long" };
    if (hasUrl(text)) return { ok: false, reason: "contains_url" };
    const lower = text.toLowerCase();
    const blocked = splitCsv(state.config.blacklistWords).find((word) => lower.includes(word.toLowerCase()));
    if (blocked) return { ok: false, reason: "blacklisted", blocked };
    return { ok: true, text };
  }

  function hasUrl(text) {
    return /(?:https?:\/\/|www\.|[a-z0-9-]+\.(?:com|net|org|gg|tv|io|id|co|me|app|dev)\b)/i.test(text);
  }

  function extractChatEvent(event) {
    const detail = event && event.detail ? event.detail : event || {};
    const envelope = detail.event || detail.data || detail;
    const data = envelope && envelope.data && typeof envelope.data === "object" ? envelope.data : envelope;
    const messagePayload = data.message && typeof data.message === "object" ? data.message : {};
    const tags = data.tags && typeof data.tags === "object" ? data.tags : {};
    const listener = detail.listener || envelope.listener || data.listener || data.type || envelope.type || "";
    const renderedText = data.renderedText || data.text || messagePayload.text || data.message || "";
    const user = data.user || data.sender || data.author || {};
    const displayName =
      user.displayName ||
      user.displayname ||
      user.name ||
      user.username ||
      data.displayName ||
      data.displayname ||
      data.nick ||
      data.chatter_user_name ||
      tags["display-name"] ||
      data.name ||
      data.username ||
      "viewer";
    const username =
      user.username || user.name || data.username || data.nick || data.chatter_user_login || data.name || displayName;
    const authorId =
      user.id || user.userId || data.userId || data.authorId || data.chatter_user_id || tags["user-id"] || "";
    const badges = user.badges || data.badges || tags.badges || [];
    const roles = user.roles || data.roles || [];

    return {
      listener,
      message: String(renderedText || ""),
      displayName: String(displayName || "viewer"),
      username: String(username || displayName || "viewer"),
      authorId: String(authorId || ""),
      badges,
      roles,
      raw: detail,
    };
  }

  function getUserKey(user) {
    return user.authorId || normalizeName(user.username || user.displayName);
  }

  function normalizeBadgeOrRoleValues(value) {
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return Object.keys(value || {});
  }

  function hasBadgeOrRole(user, names) {
    const expected = new Set(names);
    const values = [];
    const badges = normalizeBadgeOrRoleValues(user.badges);
    badges.forEach((badge) => {
      if (typeof badge === "string") values.push(badge);
      if (typeof badge === "string" && badge.includes("/")) values.push(badge.split("/")[0]);
      if (badge && typeof badge === "object") {
        values.push(badge.type, badge.name, badge.title, badge.version, badge.set_id);
      }
    });
    const roles = normalizeBadgeOrRoleValues(user.roles);
    roles.forEach((role) => {
      if (typeof role === "string") values.push(role);
      if (role && typeof role === "object") values.push(role.type, role.name);
    });
    return values.some((value) => expected.has(normalizeName(value)));
  }

  function isModerator(user) {
    const fallbackMods = splitCsv(state.config.moderatorNames).map(normalizeName);
    const username = normalizeName(user.username || user.displayName);
    return fallbackMods.includes(username) || hasBadgeOrRole(user, ["moderator", "mod"]);
  }

  function isStreamer(user) {
    const username = normalizeName(user.username || user.displayName);
    const configured = normalizeName(state.config.streamerName);
    return Boolean(configured && username === configured) || hasBadgeOrRole(user, ["broadcaster", "streamer"]);
  }

  function isAdmin(user) {
    return isStreamer(user) || isModerator(user);
  }

  function parseCommand(message) {
    const trimmed = String(message || "").trim();
    if (!trimmed) return null;
    const [commandToken, ...rest] = trimmed.split(/\s+/);
    return {
      command: commandToken.toLowerCase(),
      args: rest.join(" ").trim(),
    };
  }

  function enqueueCommand(chatEvent) {
    updateDiagnosticOverlay({ lastCommand: `queued ${String(chatEvent.message || "").slice(0, 80)}` });
    state.commandQueue = state.commandQueue
      .then(() => handleCommand(chatEvent))
      .catch((error) => {
        updateDiagnosticOverlay({ lastCommand: `failed: ${error.message}` });
        debugLog("command queue failed", { message: error.message });
      });
    return state.commandQueue;
  }

  async function handleCommand(chatEvent) {
    const parsed = parseCommand(chatEvent.message);
    if (!parsed) return;
    if (!state.storage) {
      updateDiagnosticOverlay({ lastCommand: `ignored ${parsed.command}: read-only overlay` });
      debugLog("command ignored", { command: parsed.command, reason: "read_only_overlay" });
      return;
    }
    updateDiagnosticOverlay({ lastCommand: `processing ${parsed.command}` });

    const commands = state.config;
    let handler = null;
    if (parsed.command === commands.addCommand) handler = addTask;
    if (parsed.command === commands.doneCommand) handler = completeTask;
    if (parsed.command === commands.deleteCommand) handler = removeTask;
    if (parsed.command === commands.resetCommand) handler = resetTasks;
    if (parsed.command === commands.voteCommand && !handler) handler = voteTask;
    if (!handler) {
      updateDiagnosticOverlay({ lastCommand: `unknown ${parsed.command}` });
      return;
    }

    const stored = taskListState.cleanupExpired(
      await state.storage.get(),
      state.config.completedVisibleSeconds,
      Date.now(),
    );
    const result = await handler(stored, parsed.args, chatEvent);
    if (result && result.nextState) {
      await state.storage.set(result.nextState);
      render(result.nextState);
      scheduleCleanup(result.nextState);
      updateDiagnosticOverlay({ lastCommand: `accepted ${parsed.command}` });
    }
    if (result && result.reason) {
      updateDiagnosticOverlay({ lastCommand: `ignored ${parsed.command}: ${result.reason}` });
      debugLog("command ignored", { command: parsed.command, reason: result.reason });
    }
  }

  async function addTask(stored, taskText, user) {
    const admin = isAdmin(user);
    const now = Date.now();
    const userKey = getUserKey(user);
    const sanitized = sanitizeTaskText(taskText);
    if (!sanitized.ok) return { reason: sanitized.reason };
    if (!userKey) return { reason: "missing_user" };

    const activeTasks = taskListState.activeTasks(stored.tasks);
    if (activeTasks.length >= state.config.maxTasks) return { reason: "task_limit_full" };

    if (!admin) {
      if (now < state.globalCooldownUntil) return { reason: "global_cooldown" };
      const userCooldownUntil = state.userCooldowns.get(userKey) || 0;
      if (now < userCooldownUntil) return { reason: "user_cooldown" };
      const userActiveCount = activeTasks.filter((task) => task.authorKey === userKey).length;
      if (userActiveCount >= state.config.perUserTaskLimit) return { reason: "per_user_limit" };
      state.globalCooldownUntil = now + state.config.globalCooldownSeconds * 1000;
      state.userCooldowns.set(userKey, now + state.config.userCooldownSeconds * 1000);
    }

    return {
      nextState: {
        tasks: [
          ...stored.tasks,
          {
            id: stored.nextId,
            text: sanitized.text,
            authorId: user.authorId,
            authorKey: userKey,
            authorName: user.displayName || user.username || "viewer",
            status: "active",
            source: "chat-command",
            createdAt: now,
            completedAt: null,
            votes: {},
          },
        ],
        nextId: stored.nextId + 1,
      },
    };
  }

  async function completeTask(stored, idText, user) {
    const id = Number(idText);
    if (!Number.isInteger(id)) return { reason: "invalid_id" };
    const userKey = getUserKey(user);
    const admin = isAdmin(user);
    let changed = false;
    const now = Date.now();
    const tasks = stored.tasks.map((task) => {
      if (task.id !== id) return task;
      if (task.status === "completed") return task;
      if (!admin && (!userKey || task.authorKey !== userKey)) return task;
      changed = true;
      return { ...task, status: "completed", completedAt: now };
    });
    return changed ? { nextState: { ...stored, tasks } } : { reason: "not_found_or_not_allowed" };
  }

  async function removeTask(stored, idText, user) {
    const id = Number(idText);
    if (!Number.isInteger(id)) return { reason: "invalid_id" };
    const userKey = getUserKey(user);
    const admin = isAdmin(user);
    const nextTasks = stored.tasks.filter((task) => {
      if (task.id !== id) return true;
      return !admin && (!userKey || task.authorKey !== userKey);
    });
    return nextTasks.length === stored.tasks.length
      ? { reason: "not_found_or_not_allowed" }
      : { nextState: { ...stored, tasks: nextTasks } };
  }

  async function resetTasks(stored, idText, user) {
    if (!isAdmin(user)) return { reason: "not_admin" };
    return { nextState: { tasks: [], nextId: 1 } };
  }

  async function voteTask(stored, idText, user) {
    if (!state.config.enableVoting) return { reason: "voting_disabled" };
    if (!String(idText || "").trim()) return { reason: "missing_task_number" };
    const id = Number(idText);
    if (!Number.isInteger(id)) return { reason: "invalid_id" };

    const userKey = getUserKey(user);
    if (!userKey) return { reason: "missing_user" };

    const now = Date.now();
    const voteCooldownUntil = state.voteCooldowns.get(userKey) || 0;
    if (now < voteCooldownUntil) return { reason: "vote_cooldown" };

    const target = stored.tasks.find((task) => task.id === id);
    if (!target || target.status !== "active") return { reason: "task_not_active" };

    const votedTask = taskListState.findVotedTask(stored.tasks, userKey);
    if (votedTask && votedTask.id === id) return { reason: "duplicate_vote" };
    if (votedTask && state.config.voteDuplicateBehavior === "ignore") return { reason: "duplicate_vote" };

    const tasks = stored.tasks.map((task) => {
      const votes = { ...(task.votes || {}) };
      if (state.config.voteDuplicateBehavior === "change" && votes[userKey]) {
        delete votes[userKey];
      }
      if (task.id === id) {
        votes[userKey] = {
          voterName: user.displayName || user.username || "viewer",
          votedAt: now,
        };
      }
      return { ...task, votes };
    });

    state.voteCooldowns.set(userKey, now + state.config.voteCooldownSeconds * 1000);
    return { nextState: { ...stored, tasks } };
  }

  async function writeDashboardTaskChange(actionName, operation) {
    if (!state.storage) {
      debugLog("dashboard task change ignored", { action: actionName, reason: "read_only_overlay" });
      return { reason: "read_only_overlay" };
    }

    const stored = taskListState.cleanupExpired(
      await state.storage.get(),
      state.config.completedVisibleSeconds,
      Date.now(),
    );
    const result = operation(stored);
    if (result && result.nextState) {
      await state.storage.set(result.nextState);
      render(result.nextState);
      scheduleCleanup(result.nextState);
      debugLog("dashboard task change accepted", { action: actionName });
    }
    if (result && result.reason) {
      debugLog("dashboard task change ignored", { action: actionName, reason: result.reason });
    }
    return result || { reason: "unknown_dashboard_action" };
  }

  const dashboardTaskManager = {
    async addTask(taskText) {
      const sanitized = sanitizeTaskText(taskText);
      if (!sanitized.ok) return { reason: sanitized.reason };
      return writeDashboardTaskChange("add", (stored) =>
        taskListState.addDashboardTask(stored, sanitized.text, state.config, Date.now()),
      );
    },

    async editTaskText(idText, taskText) {
      const sanitized = sanitizeTaskText(taskText);
      if (!sanitized.ok) return { reason: sanitized.reason };
      return writeDashboardTaskChange("edit", (stored) =>
        taskListState.editTaskText(stored, idText, sanitized.text),
      );
    },

    completeTask(idText) {
      return writeDashboardTaskChange("complete", (stored) => taskListState.completeTask(stored, idText, Date.now()));
    },

    removeTask(idText) {
      return writeDashboardTaskChange("remove", (stored) => taskListState.removeTask(stored, idText));
    },

    resetTasks() {
      return writeDashboardTaskChange("reset", () => taskListState.resetTasks());
    },
  };

  function scheduleCleanup(stored) {
    clearTimeout(state.cleanupTimer);
    if (!state.storage) return;
    const completedTasks = stored.tasks.filter((task) => task.status === "completed" && task.completedAt);
    if (!completedTasks.length) return;
    const now = Date.now();
    const visibleMs = state.config.completedVisibleSeconds * 1000;
    const nextDelay = Math.max(
      100,
      Math.min(...completedTasks.map((task) => task.completedAt + visibleMs - now)),
    );
    state.cleanupTimer = setTimeout(async () => {
      const current = await state.storage.get();
      const cleaned = taskListState.cleanupExpired(current, state.config.completedVisibleSeconds, Date.now());
      if (cleaned.tasks.length !== current.tasks.length) {
        await state.storage.set(cleaned);
      }
      render(cleaned);
      scheduleCleanup(cleaned);
    }, nextDelay);
  }

  function applyAppearance() {
    const widget = document.getElementById("todo-widget");
    if (!widget) return;
    widget.dataset.position = state.config.position;
    widget.dataset.layout = state.config.layoutMode;
    widget.dataset.theme = state.config.themePreset;
    widget.dataset.animations = String(state.config.enableAnimations);
    widget.dataset.taskIcon = String(Boolean(state.config.taskIconImage));
    widget.dataset.hideScrollbar = String(state.config.hideScrollbar);
    document.documentElement.style.setProperty("--todo-animation-speed", state.config.animationSpeed);
    document.documentElement.style.setProperty("--todo-font", `"${state.config.fontFamily}", sans-serif`);
    document.documentElement.style.setProperty("--todo-accent", state.config.accentColor);
    document.documentElement.style.setProperty("--todo-max-width", `${state.config.maxWidth}px`);
    document.documentElement.style.setProperty("--todo-max-list-height", `${state.config.maxListHeight}px`);
    document.documentElement.style.setProperty("--todo-bg-opacity", state.config.backgroundOpacity);
    document.documentElement.style.setProperty("--todo-panel-image", cssUrl(state.config.panelImage));
    document.documentElement.style.setProperty(
      "--todo-panel-image-opacity",
      state.config.panelImage ? state.config.panelImageOpacity : 0,
    );
    document.documentElement.style.setProperty("--todo-panel-image-fit", state.config.panelImageFit);
    document.documentElement.style.setProperty("--todo-frame-image", cssUrl(state.config.frameImage));
    document.documentElement.style.setProperty(
      "--todo-frame-image-opacity",
      state.config.frameImage ? state.config.frameImageOpacity : 0,
    );
    document.documentElement.style.setProperty("--todo-frame-image-fit", state.config.frameImageFit);
    document.documentElement.style.setProperty("--todo-task-icon-image", cssUrl(state.config.taskIconImage));
    document.documentElement.style.setProperty(
      "--todo-task-icon-image-opacity",
      state.config.taskIconImage ? state.config.taskIconImageOpacity : 0,
    );
  }

  function render(stored) {
    applyAppearance();
    const widget = document.getElementById("todo-widget");
    const title = document.getElementById("todo-title");
    const counter = document.getElementById("todo-counter");
    const list = document.getElementById("todo-list");
    const empty = document.getElementById("todo-empty");
    if (!widget || !title || !counter || !list || !empty) return;

    const orderedTasks = taskListState.orderedTasks(stored.tasks, state.config);
    const previousStatuses = new Map(state.renderedTaskStatuses);
    const activeCount = taskListState.activeTasks(stored.tasks).length;
    const counterLabel = activeCount === 1 ? state.config.taskLabelSingular : state.config.taskLabelPlural;
    widget.classList.toggle("has-tasks", orderedTasks.length > 0);
    renderTitle(title);
    counter.setAttribute("aria-label", `${activeCount} active ${counterLabel} out of ${state.config.maxTasks}`);
    counter.textContent = `${activeCount}/${state.config.maxTasks} ${counterLabel}`;
    empty.textContent = state.config.emptyText;
    list.replaceChildren(...orderedTasks.map((task) => createTaskElement(task, previousStatuses)));
    state.renderedTaskStatuses = new Map(orderedTasks.map((task) => [task.id, task.status]));
    state.hasRenderedTasks = true;
    syncAutoScroll(list);
  }

  function stopTitleClock() {
    if (state.titleClockTimer) {
      clearInterval(state.titleClockTimer);
      state.titleClockTimer = null;
    }
  }

  function formatClock(date) {
    return new Intl.DateTimeFormat(state.config.clockFormat === "12h" ? "en-US" : "en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: state.config.clockShowSeconds ? "2-digit" : undefined,
      hour12: state.config.clockFormat === "12h",
    }).format(date);
  }

  function renderTitle(title) {
    stopTitleClock();
    if (state.config.titleDisplayMode !== "digital-clock") {
      title.textContent = state.config.titleText;
      return;
    }

    function updateClock() {
      title.textContent = formatClock(new Date());
    }

    updateClock();
    state.titleClockTimer = setInterval(updateClock, state.config.clockShowSeconds ? 1000 : 15000);
  }

  function stopAutoScroll() {
    if (state.autoScrollFrame) {
      cancelAnimationFrame(state.autoScrollFrame);
      state.autoScrollFrame = null;
    }
    if (state.autoScrollFallbackTimer) {
      clearInterval(state.autoScrollFallbackTimer);
      state.autoScrollFallbackTimer = null;
    }
    state.autoScrollOffset = 0;
    state.autoScrollLoopHeight = 0;
  }

  function syncAutoScroll(list) {
    stopAutoScroll();
    list.scrollTop = 0;
    if (state.config.layoutMode === "ticker" || list.scrollHeight <= list.clientHeight + 1) {
      return;
    }

    const originalItems = Array.from(list.children);
    const lastOriginalItem = originalItems[originalItems.length - 1];
    if (!lastOriginalItem) return;
    if (originalItems.length < 4) return;

    state.autoScrollLoopHeight = lastOriginalItem.offsetTop + lastOriginalItem.offsetHeight;
    originalItems.forEach((item) => {
      const clone = item.cloneNode(true);
      clone.classList.add("is-scroll-clone");
      clone.setAttribute("aria-hidden", "true");
      list.append(clone);
    });

    state.autoScrollPauseUntil = performance.now() + 900;
    const speedPixelsPerSecond = 36 * state.config.animationSpeed;
    let lastTick = performance.now();

    function tick(now) {
      if (
        state.config.layoutMode === "ticker" ||
        list.scrollHeight <= list.clientHeight + 1 ||
        state.autoScrollLoopHeight <= 0
      ) {
        list.scrollTop = 0;
        stopAutoScroll();
        return;
      }

      if (now >= state.autoScrollPauseUntil) {
        const elapsedSeconds = Math.min(now - lastTick, 80) / 1000;
        state.autoScrollOffset += speedPixelsPerSecond * elapsedSeconds;
        if (state.autoScrollOffset >= state.autoScrollLoopHeight) {
          state.autoScrollOffset -= state.autoScrollLoopHeight;
        }
        list.scrollTop = state.autoScrollOffset;
      }

      lastTick = now;
      state.autoScrollFrame = requestAnimationFrame(tick);
    }

    state.autoScrollFrame = requestAnimationFrame(tick);
    state.autoScrollFallbackTimer = setInterval(() => {
      const now = performance.now();
      if (now - lastTick > 120) tick(now);
    }, 120);
  }

  function createTaskElement(task, previousStatuses) {
    const item = document.createElement("li");
    item.className = "todo-widget__item";
    if (task.status === "completed") item.classList.add("is-completed");
    if (state.hasRenderedTasks && !previousStatuses.has(task.id) && task.status === "active") {
      item.classList.add("is-new");
    }
    if (state.hasRenderedTasks && previousStatuses.get(task.id) === "active" && task.status === "completed") {
      item.classList.add("is-completing");
    }

    const number = document.createElement("div");
    number.className = "todo-widget__number";
    number.textContent = `#${task.id}`;

    const content = document.createElement("div");
    content.className = "todo-widget__content";

    const text = document.createElement("div");
    text.className = "todo-widget__text";
    text.textContent = task.text;

    const author = document.createElement("div");
    author.className = "todo-widget__author";
    author.textContent = `by ${task.authorName}`;

    const meta = document.createElement("div");
    meta.className = "todo-widget__meta";
    meta.append(author);

    if (state.config.enableVoting) {
      const votes = document.createElement("div");
      votes.className = "todo-widget__votes";
      const voteCount = taskListState.voteCount(task);
      votes.textContent = `${voteCount} ${voteCount === 1 ? "vote" : "votes"}`;
      meta.append(votes);
    }

    content.append(text, meta);
    if (state.config.taskIconImage) {
      const icon = document.createElement("div");
      icon.className = "todo-widget__icon";
      icon.setAttribute("aria-hidden", "true");
      item.append(number, icon, content);
    } else {
      item.append(number, content);
    }
    return item;
  }

  async function init(fieldData) {
    clearTimeout(state.cleanupTimer);
    state.cleanupTimer = null;
    stopAutoScroll();
    state.config = buildConfig(fieldData);
    const overlayState = platformAdapter.isOverlayConfig(fieldData) ? platformAdapter.toStoredState(fieldData) : null;
    state.storage = overlayState ? null : createStorageAdapter();
    state.renderState = overlayState;
    applyAppearance();
    loadGoogleFont(state.config.fontFamily);
    const stored =
      overlayState ||
      taskListState.cleanupExpired(await state.storage.get(), state.config.completedVisibleSeconds, Date.now());
    if (!overlayState) await state.storage.set(stored);
    render(stored);
    if (!overlayState) scheduleCleanup(stored);
    updateDiagnosticOverlay({ status: "loaded", lastCommand: `add=${state.config.addCommand}` });
    debugLog("widget initialized", { config: state.config });
  }

  function loadGoogleFont(fontFamily) {
    if (!fontFamily) return;
    const id = "todo-widget-google-font";
    const href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily).replace(/%20/g, "+")}:wght@400;500;600;700;800&display=swap`;
    const existing = document.getElementById(id);
    if (existing) {
      existing.href = href;
      return;
    }
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }

  window.addEventListener("onWidgetLoad", (event) => {
    const fieldData = event.detail && event.detail.fieldData ? event.detail.fieldData : {};
    init(fieldData);
  });

  window.addEventListener("onEventReceived", (event) => {
    const chatEvent = extractChatEvent(event);
    const listener = normalizeName(chatEvent.listener);
    const widgetEvent = event.detail && event.detail.event && typeof event.detail.event === "object" ? event.detail.event : {};
    const widgetButtonField = event.detail && (event.detail.field || widgetEvent.field);
    if (listener === "widget-button" && widgetButtonField === "diagnosticButton") {
      updateDiagnosticOverlay({ lastEvent: "widget-button", lastCommand: "diagnostic task queued" });
      enqueueCommand({
        message: `${state.config.addCommand} Diagnostic task from StreamElements button`,
        displayName: state.config.streamerName || "StreamElements",
        username: state.config.streamerName || "streamelements",
        authorId: "streamelements-diagnostic",
        badges: [{ type: "broadcaster" }],
        roles: ["streamer"],
        raw: event.detail,
      });
      return;
    }
    if (listener === "kvstore:update") return;

    const isChatListener =
      !listener || listener === "message" || listener === "chatmessage" || listener === "channel.chat.message";
    if (!isChatListener) {
      updateDiagnosticOverlay({ lastEvent: `ignored listener=${listener || "unknown"}` });
      return;
    }
    if (!chatEvent.message) {
      updateDiagnosticOverlay({ lastEvent: `empty message listener=${listener || "unknown"}` });
      return;
    }
    debugLog("chat event", { message: chatEvent.message, user: chatEvent.displayName });
    updateDiagnosticOverlay({
      lastEvent: `chat listener=${listener || "none"}`,
      lastCommand: `${chatEvent.displayName}: ${chatEvent.message}`,
    });
    enqueueCommand(chatEvent);
  });

  window.TwitchTodoWidget = {
    init,
    enqueueCommand,
    extractChatEvent,
    dashboard: dashboardTaskManager,
    setPreviewLog(element) {
      state.previewLog = element;
    },
    getConfig() {
      return { ...state.config };
    },
    async getOverlaySnapshot() {
      if (state.renderState) return platformAdapter.buildSnapshot(state.config, state.renderState);
      if (!state.storage) state.storage = createStorageAdapter();
      return platformAdapter.buildSnapshot(state.config, await state.storage.get());
    },
    async getState() {
      if (state.renderState) return taskListState.normalize(state.renderState);
      if (!state.storage) state.storage = createStorageAdapter();
      return state.storage.get();
    },
  };

  if (document.readyState !== "loading" && !window.__TWITCH_TODO_WAIT_FOR_WIDGET_LOAD__) {
    init({});
  } else if (!window.__TWITCH_TODO_WAIT_FOR_WIDGET_LOAD__) {
    document.addEventListener("DOMContentLoaded", () => init({}), { once: true });
  }
})();
