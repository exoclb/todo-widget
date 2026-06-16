(function () {
  "use strict";

  const STORAGE_KEY = "twitchTodoWidgetState";
  const DEFAULT_CONFIG = {
    titleText: "STREAM TASKS",
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
    position: "top-right",
    layoutMode: "compact",
    theme: "neon",
    themePreset: "neon",
    taskLabelSingular: "Task",
    taskLabelPlural: "Tasks",
    fontFamily: "Rajdhani",
    accentColor: "#29f4ff",
    maxWidth: 360,
    backgroundOpacity: 0.78,
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

  const VALID_THEMES = new Set(["minimal", "cozy", "neon", "quest", "vtuber", "mono", "pixel"]);
  const VALID_POSITIONS = new Set(["top-left", "top-right", "bottom-left", "bottom-right"]);
  const VALID_LAYOUT_MODES = new Set(["compact", "ticker", "board"]);
  const VALID_IMAGE_FITS = new Set(["cover", "contain"]);
  const VALID_VOTE_DUPLICATE_BEHAVIORS = new Set(["ignore", "change"]);
  const state = {
    config: { ...DEFAULT_CONFIG },
    storage: null,
    commandQueue: Promise.resolve(),
    cleanupTimer: null,
    globalCooldownUntil: 0,
    userCooldowns: new Map(),
    voteCooldowns: new Map(),
    renderedTaskStatuses: new Map(),
    hasRenderedTasks: false,
    tickerScroll: {
      frameId: 0,
      offset: 0,
      lastTimestamp: 0,
    },
    previewLog: null,
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

  function normalizeLabel(value, fallback) {
    const label = String(value || fallback).replace(/\s+/g, " ").trim();
    return label || fallback;
  }

  function resolveMaxWidth(source, layoutMode) {
    const fallback = layoutMode === "compact" ? DEFAULT_CONFIG.maxWidth : 720;
    return clampNumber(source.maxWidth, fallback, 260, 900);
  }

  function buildConfig(fieldData) {
    const source = fieldData || {};
    const layoutMode = VALID_LAYOUT_MODES.has(source.layoutMode) ? source.layoutMode : DEFAULT_CONFIG.layoutMode;
    return {
      ...DEFAULT_CONFIG,
      ...source,
      titleText: String(source.titleText || DEFAULT_CONFIG.titleText).trim() || DEFAULT_CONFIG.titleText,
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

  function createStorageAdapter() {
    if (window.SE_API && window.SE_API.store) {
      return {
        async get() {
          const stored = await window.SE_API.store.get(STORAGE_KEY);
          return normalizeStoredState(stored);
        },
        async set(nextState) {
          await window.SE_API.store.set(STORAGE_KEY, nextState);
        },
      };
    }

    return {
      async get() {
        try {
          return normalizeStoredState(JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"));
        } catch (error) {
          debugLog("localStorage parse failed", { message: error.message });
          return normalizeStoredState(null);
        }
      },
      async set(nextState) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
      },
    };
  }

  function normalizeStoredState(stored) {
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
          createdAt: Number(task.createdAt) || Date.now(),
          completedAt: task.completedAt ? Number(task.completedAt) : null,
          votes: normalizeVotes(task.votes),
        }))
        .filter((task) => Number.isInteger(task.id) && task.id > 0 && task.text),
      nextId,
    };
  }

  function normalizeVotes(votes) {
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
  }

  function getActiveTasks(tasks) {
    return tasks.filter((task) => task.status === "active");
  }

  function getVoteCount(task) {
    return Object.keys(task.votes || {}).length;
  }

  function findVotedTask(tasks, userKey) {
    return tasks.find((task) => task.status === "active" && task.votes && task.votes[userKey]);
  }

  function cleanupExpiredTasks(storedState, now) {
    const visibleMs = state.config.completedVisibleSeconds * 1000;
    const tasks = storedState.tasks.filter((task) => {
      if (task.status !== "completed") return true;
      return task.completedAt && now - task.completedAt < visibleMs;
    });
    return { ...storedState, tasks };
  }

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
    const listener = detail.listener || envelope.listener || data.listener || "";
    const renderedText = data.renderedText || data.text || data.message || "";
    const user = data.user || data.sender || data.author || {};
    const displayName =
      user.displayName ||
      user.displayname ||
      user.name ||
      user.username ||
      data.displayName ||
      data.name ||
      data.username ||
      "viewer";
    const username = user.username || user.name || data.username || data.name || displayName;
    const authorId = user.id || user.userId || data.userId || data.authorId || "";
    const badges = user.badges || data.badges || [];
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

  function hasBadgeOrRole(user, names) {
    const expected = new Set(names);
    const values = [];
    const badges = Array.isArray(user.badges) ? user.badges : Object.keys(user.badges || {});
    badges.forEach((badge) => {
      if (typeof badge === "string") values.push(badge);
      if (badge && typeof badge === "object") {
        values.push(badge.type, badge.name, badge.title, badge.version);
      }
    });
    const roles = Array.isArray(user.roles) ? user.roles : Object.keys(user.roles || {});
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
    state.commandQueue = state.commandQueue
      .then(() => handleCommand(chatEvent))
      .catch((error) => debugLog("command queue failed", { message: error.message }));
    return state.commandQueue;
  }

  async function handleCommand(chatEvent) {
    const parsed = parseCommand(chatEvent.message);
    if (!parsed) return;

    const commands = state.config;
    let handler = null;
    if (parsed.command === commands.addCommand) handler = addTask;
    if (parsed.command === commands.doneCommand) handler = completeTask;
    if (parsed.command === commands.deleteCommand) handler = removeTask;
    if (parsed.command === commands.resetCommand) handler = resetTasks;
    if (parsed.command === commands.voteCommand && !handler) handler = voteTask;
    if (!handler) return;

    const stored = cleanupExpiredTasks(await state.storage.get(), Date.now());
    const result = await handler(stored, parsed.args, chatEvent);
    if (result && result.nextState) {
      await state.storage.set(result.nextState);
      render(result.nextState);
      scheduleCleanup(result.nextState);
    }
    if (result && result.reason) debugLog("command ignored", { command: parsed.command, reason: result.reason });
  }

  async function addTask(stored, taskText, user) {
    const admin = isAdmin(user);
    const now = Date.now();
    const userKey = getUserKey(user);
    const sanitized = sanitizeTaskText(taskText);
    if (!sanitized.ok) return { reason: sanitized.reason };
    if (!userKey) return { reason: "missing_user" };

    const activeTasks = getActiveTasks(stored.tasks);
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

    const votedTask = findVotedTask(stored.tasks, userKey);
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

  function scheduleCleanup(stored) {
    clearTimeout(state.cleanupTimer);
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
      const cleaned = cleanupExpiredTasks(current, Date.now());
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
    document.documentElement.style.setProperty("--todo-animation-speed", state.config.animationSpeed);
    document.documentElement.style.setProperty("--todo-font", `"${state.config.fontFamily}", sans-serif`);
    document.documentElement.style.setProperty("--todo-accent", state.config.accentColor);
    document.documentElement.style.setProperty("--todo-max-width", `${state.config.maxWidth}px`);
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

    const orderedTasks = getOrderedTasks(stored.tasks);
    const previousStatuses = new Map(state.renderedTaskStatuses);
    const activeCount = getActiveTasks(stored.tasks).length;
    const counterLabel = activeCount === 1 ? state.config.taskLabelSingular : state.config.taskLabelPlural;
    widget.classList.toggle("has-tasks", orderedTasks.length > 0);
    title.textContent = state.config.titleText;
    counter.setAttribute("aria-label", `${activeCount} active ${counterLabel} out of ${state.config.maxTasks}`);
    counter.textContent = `${activeCount}/${state.config.maxTasks} ${counterLabel}`;
    empty.textContent = state.config.emptyText;
    list.replaceChildren(...orderedTasks.map((task) => createTaskElement(task, previousStatuses)));
    state.renderedTaskStatuses = new Map(orderedTasks.map((task) => [task.id, task.status]));
    state.hasRenderedTasks = true;
    startTickerScroll(list);
  }

  function stopTickerScroll(list) {
    if (state.tickerScroll.frameId) {
      cancelAnimationFrame(state.tickerScroll.frameId);
    }
    state.tickerScroll.frameId = 0;
    state.tickerScroll.offset = 0;
    state.tickerScroll.lastTimestamp = 0;
    if (list) {
      list.style.transform = "";
      delete list.dataset.scroll;
    }
  }

  function startTickerScroll(list) {
    stopTickerScroll(list);

    if (state.config.layoutMode !== "ticker" || !state.config.enableAnimations) return;

    const originalItems = [...list.children];
    if (originalItems.length < 2) return;

    const contentWidth = originalItems.reduce((width, item, index) => {
      const gap = index > 0 ? parseFloat(getComputedStyle(list).columnGap || getComputedStyle(list).gap) || 0 : 0;
      return width + item.getBoundingClientRect().width + gap;
    }, 0);

    if (contentWidth <= list.parentElement.getBoundingClientRect().width) return;

    for (const item of originalItems) {
      const clone = item.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      clone.dataset.tickerClone = "true";
      list.append(clone);
    }

    const pixelsPerSecond = 28 * state.config.animationSpeed;
    list.dataset.scroll = "infinite";
    list.style.willChange = "transform";

    function step(timestamp) {
      if (!state.tickerScroll.lastTimestamp) {
        state.tickerScroll.lastTimestamp = timestamp;
      }

      const elapsedSeconds = Math.min((timestamp - state.tickerScroll.lastTimestamp) / 1000, 0.08);
      state.tickerScroll.lastTimestamp = timestamp;
      state.tickerScroll.offset = (state.tickerScroll.offset + pixelsPerSecond * elapsedSeconds) % contentWidth;
      list.style.transform = `translate3d(${-state.tickerScroll.offset}px, 0, 0)`;
      state.tickerScroll.frameId = requestAnimationFrame(step);
    }

    state.tickerScroll.frameId = requestAnimationFrame(step);
  }

  function getOrderedTasks(tasks) {
    const byCreatedAt = (a, b) => a.createdAt - b.createdAt || a.id - b.id;
    if (!state.config.enableVoting || !state.config.votePrioritySort) {
      return [...tasks].sort(byCreatedAt);
    }
    return [...tasks].sort((a, b) => {
      if (a.status !== b.status) return a.status === "active" ? -1 : 1;
      if (a.status !== "active") return byCreatedAt(a, b);
      return getVoteCount(b) - getVoteCount(a) || byCreatedAt(a, b);
    });
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
      const voteCount = getVoteCount(task);
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
    state.config = buildConfig(fieldData);
    state.storage = createStorageAdapter();
    applyAppearance();
    loadGoogleFont(state.config.fontFamily);
    const stored = cleanupExpiredTasks(await state.storage.get(), Date.now());
    await state.storage.set(stored);
    render(stored);
    scheduleCleanup(stored);
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
    if (chatEvent.listener && chatEvent.listener !== "message") return;
    if (!chatEvent.message) return;
    debugLog("chat event", { message: chatEvent.message, user: chatEvent.displayName });
    enqueueCommand(chatEvent);
  });

  window.TwitchTodoWidget = {
    init,
    enqueueCommand,
    extractChatEvent,
    setPreviewLog(element) {
      state.previewLog = element;
    },
    getConfig() {
      return { ...state.config };
    },
    async getState() {
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
