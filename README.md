# Twitch Todo Widget

A StreamElements custom widget for Twitch streamers. Viewers can add tasks from chat, Task Owners can complete or remove their own tasks, and Task Managers can manage the list with override commands.

## Files

- `widget.html` goes in the StreamElements HTML tab.
- `widget.css` goes in the CSS tab.
- `widget.js` goes in the JS tab.
- `widget.json` goes in the Fields tab.
- `preview.html` is only for local testing.

## Local Preview

Run a local server from this folder:

```sh
python3 -m http.server 8000
```

Open:

```text
http://localhost:8000/preview.html
```

The preview includes a mock username, role selector, command input, quick action buttons, and debug log.
It also includes controls for Theme Presets, Quest Mode wording, Layout Modes, animations, panel images, frame images, and task icons.

## Smoke Test

Run the lightweight smoke suite from this folder:

```sh
bash scripts/smoke-test.sh
```

The command validates `widget.json`, starts a temporary local preview server, and runs browser smoke checks for theme wording, animations, layout modes, custom images, and preview controls. Browser checks require Chromium or Google Chrome on your machine; if neither is available, the command still validates the widget field JSON and skips browser checks.

## Default Commands

- `!task <text>` adds a task.
- `!done <id>` completes a task.
- `!delete <id>` removes a task.
- `!taskreset` clears all tasks and resets numbering to `#1`.
- `!vote <id>` votes for an active task when Voting Mode is enabled.

All command names are configurable in StreamElements fields and are matched case-insensitively.

## Permissions

- All viewers can add tasks.
- Task Owners can complete or remove their own tasks.
- Task Managers can complete or remove any task.
- Only Task Managers can reset the whole list.

Task Managers are the streamer and moderators by default. The widget detects moderator/streamer roles from chat event badges when available. You can also set fallback moderator usernames and a fallback streamer username in the fields.

## Task Capacity And Moderation

- Default Task Capacity: `10` active tasks, configurable from `1` to `20`.
- Default max task length: `80` characters.
- Default Task Owner Capacity: `2` active tasks.
- Default global add cooldown: `5` seconds.
- Default per-user add cooldown: `30` seconds.
- Links are rejected.
- Mentions and emoji are allowed.
- Blacklisted words can be configured as a comma-separated list.

Invalid commands are ignored silently in production. Enable `debugMode` while testing if you need console logs.

## Voting Mode

Voting Mode is optional and disabled by default. When enabled, Viewers can vote for Active Tasks with the configured vote command, defaulting to `!vote <Task Number>`.

- Vote commands are Ignored Commands while Voting Mode is disabled.
- Each Viewer has one active vote across the Task List.
- Duplicate vote behavior can either ignore later votes or move the Viewer vote to a new Active Task.
- Vote cooldown limits how quickly the same Viewer can cast or change a vote.
- Optional priority sort can move higher-voted Active Tasks earlier visually.
- Task Numbers remain stable even when vote priority sort changes the visual order. Use the visible number, such as `#7`, with `!done 7`, `!delete 7`, and `!vote 7`.
- Task Managers can still complete, remove, and reset Tasks regardless of vote counts.

## Display

- Compact vertical list with configurable corner position.
- Configurable title, empty state, Theme Preset, Quest Mode wording, Google Font, accent color, width, opacity, custom panel image, and animations.
- Theme Presets include minimal clean, cozy pastel, clean neon HUD, RPG quest board, and VTuber cute.
- Quest Mode wording can present the same Task List as Tasks, Quests, Missions, or Challenges without changing Task Numbers or Chat Commands.
- Layout Modes include compact sidebar for gameplay corners, horizontal ticker for top or bottom bars, and large board for chatting or intermission scenes.
- Voting Mode can show vote counts beside Task Owners and optionally sort Active Tasks by vote count.
- Optional panel background image, frame overlay image, and task icon image support StreamElements uploads.
- Panel and frame images include opacity controls and cover/contain fit modes. Task icons include an opacity control and render at a stable task-row size.
- Animation controls can be enabled or disabled and tuned with an animation speed slider. New tasks animate in, Completed Tasks get a brief completion pulse, and Removed Tasks leave quietly.
- Completed tasks stay visible briefly, then auto-hide. The default is `5` seconds.

Animations are visual only. Successful commands and Ignored Commands still use Silent Command Handling and never send chat replies.

## Custom Image Guidance

- Leave image fields empty to use the default polished Task Overlay.
- Use the panel background image for low-contrast texture, pattern, or branded scenery. Keep opacity around `0.15` to `0.35` for readable Task Text.
- Use the frame overlay image for transparent PNG borders, corners, or stream-package frames. Keep important artwork near the edges so it does not cover Task Text.
- Use the task icon image for a small brand mark, badge, gem, or checklist symbol beside each task.
- Prefer transparent PNG/WebP assets for frame and icon images. A `16:9` or `4:3` panel texture usually works well with cover fit, while a full-frame border usually works better with contain fit.

## StreamElements Setup

1. Create a custom widget in your StreamElements overlay.
2. Paste each `widget.*` file into the matching editor tab.
3. Paste `widget.json` into the Fields tab.
4. Set your preferred theme, position, moderator fallback names, and command names.
5. Test with chat commands while `debugMode` is enabled, then turn it off for production.
