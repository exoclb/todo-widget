# Widget Platform Blueprint

## Direction

This project is currently a StreamElements task overlay. The long-term direction is a
stream widget platform where streamers manage widget state in one dashboard and use
one overlay link in OBS or another streaming tool.

## SSG / SSOT Rule

For this project, SSG means single source governance:

- `widget.json` remains the StreamElements Fields source for the current widget.
- `widget.js` converts those fields and the persisted task state into a platform
  overlay snapshot.
- Future dashboard data should use the same platform snapshot shape.
- Overlay rendering should read from the snapshot shape instead of inventing a
  separate data contract.

## Platform Snapshot Shape

The runtime exposes this shape through `window.TwitchTodoWidget.getOverlaySnapshot()`.

```json
{
  "schemaVersion": 1,
  "profile": {
    "slug": "demo-streamer",
    "displayName": "Demo Streamer"
  },
  "overlay": {
    "refreshIntervalMs": 3000
  },
  "summary": {},
  "theme": {
    "tokens": {}
  },
  "widgets": [
    {
      "id": "todo-main",
      "type": "todo",
      "title": "STREAM TASKS",
      "enabled": true,
      "position": "top-right",
      "sortOrder": 1,
      "settings": {
        "emptyText": "No tasks yet",
        "maxItems": 10,
        "showCompleted": true,
        "showProgress": true,
        "enableVoting": false,
        "votePrioritySort": false,
        "layoutMode": "compact"
      },
      "data": {
        "todos": []
      }
    }
  ]
}
```

## Local Preview Snapshot

`preview.html` shows the current platform snapshot in a read-only Platform snapshot
panel. The panel is an inspection tool only: it reads StreamElements field data and
persisted task state, then displays the resulting Overlay State contract. Refreshing
or copying the snapshot must not change task state.

## Saved Preview Contract

Saved Preview is the dashboard-facing preview mode for the hosted platform MVP. It
must render the same saved Overlay State that Hosted Overlay renders for a Streamer
Profile. It is not a draft renderer and must not introduce a preview-only state
contract.

For the MVP path:

- Saving dashboard changes updates Overlay State directly.
- Saved Preview and Hosted Overlay read the same saved Overlay State.
- Draft Preview and publish/draft workflows are out of scope until a future dashboard
  flow needs unpublished changes.
- Current `preview.html` remains a local development preview and StreamElements
  compatibility tool. It can simulate field changes locally, but those local form
  changes are not the hosted-platform Saved Preview model.
- The Platform snapshot panel is read-only inspection for the future contract.

## Task Widget Settings Ownership

Task Widget settings are split by the part of the future platform that needs them.
This keeps the hosted overlay render state small and prevents command behavior from
leaking into the public render contract.

Overlay State inputs:

- Task overlay title, position, layout mode, empty text, task capacity, voting display
  flags, and theme/image tokens belong in Overlay State because the public overlay
  needs them to render the Task Widget.
- `widgets[].settings` should contain render-facing Task Widget settings only.
- `theme.tokens` should contain visual tokens needed by the hosted overlay.

Chat Command Handler inputs:

- Command names such as add, done, delete, reset, and vote belong to the Chat Command
  Handler.
- Command behavior settings such as cooldowns, task eligibility limits, owner
  capacity, blacklist words, moderator names, and streamer fallback names belong to
  the Chat Command Handler.
- Command names should not be added to Hosted Overlay render state unless a future
  command-help overlay feature explicitly needs to display them.

Dashboard-private and transitional metadata:

- Future platform fields in `widget.json`, such as profile slug, profile display
  name, schema version, and overlay refresh interval, are transitional metadata for
  the hosted platform.
- Dashboard-only state, private moderation data, Task History, and Command Log data
  must stay out of public Overlay State.
- Disabled widgets and unpublished draft settings are dashboard-private until they
  become active saved Overlay State.

## Dashboard-Private Task History

Task History is a dashboard-private record of tasks that left the active Task Widget
state. It supports streamer review and recovery without changing what viewers see in
the public overlay.

Task History entries should keep enough information for the dashboard to explain why
a task left the active list:

```json
{
  "id": "history-1",
  "taskId": "task-1",
  "text": "Review next game idea",
  "createdBy": "viewer-name",
  "createdAt": "2026-06-07T00:00:00.000Z",
  "closedAt": "2026-06-07T00:05:00.000Z",
  "outcome": "completed",
  "closedBy": "streamer-name",
  "source": "chat-command",
  "voteCount": 3
}
```

For the MVP path:

- Task History is not part of `widgets[].data.todos`, `summary`, or any public
  Overlay State field.
- Completed tasks may appear briefly in the active overlay state, but once they leave
  the Task Widget they become dashboard-private history.
- Removed tasks and Task List Reset results are recorded in Task History without
  exposing removed task text in Hosted Overlay.
- `outcome` should use explicit values such as `completed`, `removed`, or `reset` so
  future dashboard filters do not infer meaning from display text.
- `source` should identify the write path, such as `chat-command` or `dashboard`, so
  dashboard audit views can explain where a change came from.

## Current Compatibility Contract

The current StreamElements widget must keep working with the existing Fields format.
That means:

- Chat commands still write task state through StreamElements storage.
- Local preview still uses `localStorage` as a fallback.
- `widget.json` still contains StreamElements field definitions.
- Platform fields are additive and should not replace the existing task controls yet.
- Platform fields in `widget.json` are transitional metadata for the future hosted
  platform. They should not be treated as active StreamElements polling or backend
  integration features.

## State Ownership

The current StreamElements-only widget stores task state in StreamElements storage,
with `localStorage` only as a local preview fallback. When the web platform is
introduced, chat-driven task management and dashboard-driven task management must
write to the same task list state. The dashboard must not manage a separate copy of
tasks, because that would break the single source governance rule.

## Migration Path

1. Keep the StreamElements widget stable.
2. Add platform metadata fields: profile slug, profile display name, schema version,
   and overlay refresh interval.
3. Convert active widget state to the platform snapshot in `widget.js`.
4. Build future dashboard and overlay routes around the same snapshot contract.
5. Move persistence from StreamElements storage to a backend only after the snapshot
   contract is stable.

## Future Dashboard Model

When the web platform is introduced, the dashboard should manage these concepts:

- Streamer profile
- Overlay link
- Widget instances
- Todo widget data
- Theme tokens

The public overlay should stay read-only and render the snapshot for one profile slug.
