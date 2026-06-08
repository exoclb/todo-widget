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

Because the hosted platform now treats Task List State as the write model, "saving
dashboard changes updates Overlay State directly" means the platform persists Task
List State first, then derives saved Overlay State for render surfaces. The MVP does
not keep a separate Draft Preview state.

## Hosted Overlay Routing

Hosted Overlay routing is organized around one Streamer Profile and one active
Overlay Link for the MVP. The public overlay route resolves the Overlay Link, loads
the saved Overlay State for that Streamer Profile, and renders Active Widgets from
that state.

MVP route contract:

- One active Overlay Link maps to one Streamer Profile.
- The public render route returns the complete saved Overlay State for that profile
  to the hosted overlay renderer.
- Hosted Overlay is read-only. It must not accept dashboard writes, chat command
  writes, debug mutations, or task management actions from the public route.
- Hosted Overlay MVP renders the saved Overlay State it receives at initialization
  time. Polling, realtime refresh, and live dashboard/chat updates are follow-up
  work after state ownership is stable.

Inactive Overlay Link behavior:

- An inactive Overlay Link renders an empty or disabled overlay shell.
- It must not expose Overlay State, Streamer Profile display data, widget data,
  Task List State, Task History, Command Log data, or debug details.
- It should be visually safe for OBS/browser-source use: transparent or empty enough
  to avoid disrupting a live scene.
- It may expose only a generic disabled state for local troubleshooting, not
  streamer-specific information.

Saved Preview and dashboard debug behavior are separate from public Hosted Overlay
routing. Saved Preview is dashboard-private and can show the saved Overlay State,
debug information, and streamer-facing diagnostics. Public Hosted Overlay must stay
read-only and stream-safe even when the dashboard has richer inspection tools.

Regenerated Overlay Link behavior is future link lifecycle work. For the MVP,
documenting the inactive-link behavior is enough: old links become inactive and must
stop exposing Overlay State once regeneration is introduced.

## Hosted Overlay Render Input

Hosted Overlay must be able to render directly from saved Overlay State. For the
Task Widget, `widgets[].data.todos` is the public-read task list used by the overlay
link at initialization time.

For the MVP path:

- When initialized with Overlay State, the widget renders `widgets[].data.todos`
  instead of StreamElements storage or local preview storage.
- Hosted Overlay is read-only by default: chat commands and dashboard writes must be
  handled outside the public overlay render surface.
- `voteCount` is render-facing derived data. Public Overlay State must not expose
  private voter records just to display a vote total.
- StreamElements installs remain storage-backed and keep using the existing field
  data path.

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
  "taskListCycleId": "cycle-1",
  "taskId": "task-1",
  "taskNumber": 3,
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
- Task History is created by the Task List State owner when a task leaves the active
  list through completion, removal, or reset. Dashboard and chat paths send the
  intended task change; they do not write Task History directly.
- `taskListCycleId` identifies the Task List Cycle that produced the visible task
  number, so later history views can interpret repeated `taskNumber` values after a
  Task List Reset.
- Completed tasks may appear briefly in the active overlay state, but once they leave
  the Task Widget they become dashboard-private history with `outcome: "completed"`.
- Removed tasks are dashboard-private history with `outcome: "removed"` and should
  preserve who removed them when that actor is known.
- Task List Reset starts a new Task List Cycle. Reset history should be recorded
  without exposing removed task text in Hosted Overlay.
- Ignored Command events are not Task History. They belong in a future Command Log
  because they explain command handling, not tasks that left the active list.
- `outcome` should use explicit values such as `completed`, `removed`, or `reset` so
  future dashboard filters do not infer meaning from display text.
- `source` should identify the write path, such as `chat-command` or `dashboard`, so
  dashboard audit views can explain where a change came from.

Open follow-up decisions before persistence work:

- Retention window for Task History.
- Whether streamers can permanently delete history entries.
- Whether moderator actions need immutable audit records separate from editable
  dashboard history.

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

For the hosted platform, the Widget Platform backend owns Task List State.
Dashboard-Driven Task Management and Chat-Driven Task Management write through that owner.
Hosted Overlay and Saved Preview read public Overlay State derived from the same Task
List State and remain read-only surfaces.

Dashboard writes must target Task List State, not `widgets[].data.todos` directly.
`widgets[].data.todos` is a public-read projection inside Overlay State. It exists so
Hosted Overlay and Saved Preview can render the Task Widget, not so dashboard or chat
paths can treat Overlay State as the write model.

Task Number and Task List Cycle semantics belong to Task List State. Dashboard-created
tasks and chat-created tasks share the same numbering sequence, Task Numbers remain
stable within one Task List Cycle, and Task List Reset starts a new cycle with
numbering from `1`.

Voting Mode also writes to Task List State. Task List State can keep private Task
Vote details needed for duplicate vote behavior, vote changes, cooldowns, and
dashboard-private inspection. Public Overlay State exposes only derived `voteCount`
for each task.

This creates two compatible state paths during migration:

- StreamElements Install keeps using StreamElements storage for the current copied
  widget experience.
- Hosted platform uses backend-owned Task List State as the write model and derives
  Overlay State for public render surfaces.

Dashboard-managed task copies are rejected. If the dashboard needs optimistic UI or
draft controls later, those drafts must not become a second task list owner.

## Migration Path

1. Keep the StreamElements widget stable.
2. Add platform metadata fields: profile slug, profile display name, schema version,
   and overlay refresh interval.
3. Convert active widget state to the platform snapshot in `widget.js`.
4. Build future dashboard and overlay routes around the same snapshot contract.
5. Deepen Task List State behavior into one module before adding dashboard writes.
6. Move hosted platform persistence to backend-owned Task List State only after the
   snapshot contract is stable.

## Future Dashboard Model

When the web platform is introduced, the dashboard should manage these concepts:

- Streamer profile
- Overlay link
- Widget instances
- Todo widget data
- Theme tokens

The public overlay should stay read-only and render the snapshot for one profile slug.
