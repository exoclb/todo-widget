# Use backend-owned platform state schema

For the hosted platform MVP, platform persistence is modeled as backend-owned state
with one public Overlay State projection. Dashboard and Chat Command Handler writes
target Task List State. Hosted Overlay and Saved Preview read derived Overlay State
only.

The selected production stack is Next.js with Supabase Auth and Supabase Postgres.
Supabase Row Level Security should protect dashboard-private tables with
`auth.uid()` ownership checks, while server-side overlay routes can use privileged
server access to resolve Overlay Links and return only the public Overlay State
projection.

## Core tables

`streamer_profiles` owns the streamer-facing platform identity.

- `id`
- `owner_user_id`
- `slug`
- `display_name`
- `created_at`
- `updated_at`

`owner_user_id` references the Supabase Auth user and is the authorization anchor for
dashboard access. A streamer can only read or mutate profile-owned dashboard data
when `auth.uid()` matches `owner_user_id`.

`overlay_links` maps a public link token to one Streamer Profile.

- `id`
- `streamer_profile_id`
- `public_token_hash`
- `status`
- `created_at`
- `activated_at`
- `deactivated_at`
- `regenerated_from_link_id`

The MVP keeps one active Overlay Link per Streamer Profile. A partial unique index
should enforce one `active` link per `streamer_profile_id`. Regenerating a link should
mark the previous link `inactive` and create a new active link in one transaction.
Inactive links must not expose Overlay State or streamer-specific details.

`widgets` stores platform-managed widget instances.

- `id`
- `streamer_profile_id`
- `type`
- `title`
- `enabled`
- `position`
- `sort_order`
- `created_at`
- `updated_at`

Only enabled widgets are included in public Overlay State. Disabled widgets remain
dashboard-private until they are enabled and the public projection is re-derived.

`task_widget_configs` stores Task Widget configuration without mixing render-facing
settings with command-handler-only settings.

- `widget_id`
- `render_settings`
- `command_settings`
- `created_at`
- `updated_at`

`render_settings` contains public-safe overlay inputs such as layout mode, empty
text, task capacity, completed-task visibility, voting display flags, and theme/image
keys. `command_settings` contains private command names, cooldowns, intake mode,
Task Eligibility rules, Task Owner Capacity, Task Manager rules, and moderation
settings. Hosted Overlay must not read `command_settings`.

`task_list_states` is the canonical write model for one Task Widget task list.

- `id`
- `widget_id`
- `current_cycle_id`
- `next_task_number`
- `version`
- `created_at`
- `updated_at`

`version` increments after every accepted dashboard or chat write so projection and
refresh code can identify the Task List State version used to derive Overlay State.

`task_list_cycles` identifies the numbering period for Task Numbers.

- `id`
- `task_list_state_id`
- `cycle_number`
- `started_at`
- `started_by_kind`
- `started_by_label`

Task List Reset creates a new cycle and resets visible Task Number assignment to `1`
without deleting Task History.

`tasks` stores current render-relevant tasks for the active Task List State.

- `id`
- `task_list_state_id`
- `task_list_cycle_id`
- `task_number`
- `text`
- `status`
- `source`
- `author_label`
- `owner_subject_hash`
- `vote_count`
- `created_at`
- `completed_at`
- `visible_until`
- `updated_at`

`task_number` is stable within one Task List Cycle. Active tasks and completed tasks
that are still visible remain in `tasks` so they can be projected to
`widgets[].data.todos`. Removed tasks and completed tasks that leave the overlay move
to dashboard-private Task History. `owner_subject_hash` is private and must not be
included in Overlay State.

`task_votes` stores private Voting Mode records.

- `id`
- `task_list_state_id`
- `task_list_cycle_id`
- `task_id`
- `viewer_subject_hash`
- `viewer_label`
- `last_voted_at`
- `cooldown_until`
- `created_at`
- `updated_at`

A unique constraint on `task_list_state_id`, `task_list_cycle_id`, and
`viewer_subject_hash` supports one current vote per viewer per Task List Cycle.
Duplicate votes can be ignored without changing `vote_count`. Vote changes update
the private vote record and adjust persisted task `vote_count` values. Cooldowns are
evaluated from the private record and do not leak into public Overlay State.

`task_history` stores dashboard-private outcomes for tasks that left the active
render model.

- `id`
- `streamer_profile_id`
- `widget_id`
- `task_list_cycle_id`
- `task_id`
- `task_number`
- `text`
- `author_label`
- `source`
- `outcome`
- `closed_by_kind`
- `closed_by_label`
- `vote_count`
- `created_at`
- `closed_at`

`outcome` should use explicit values such as `completed`, `removed`, and `reset`.
Task History explains task lifecycle outcomes and must not be included in public
Overlay State.

`command_logs` stores dashboard-private Chat Command Handler outcomes.

- `id`
- `streamer_profile_id`
- `widget_id`
- `task_list_state_id`
- `command_name`
- `raw_command_text`
- `actor_label`
- `actor_subject_hash`
- `outcome`
- `ignored_reason`
- `created_task_id`
- `affected_task_id`
- `created_at`

Accepted command outcomes and Ignored Command outcomes both belong here. Command Log
is separate from Task History because it explains command processing, not only task
lifecycle changes.

`overlay_states` stores the derived public read model.

- `id`
- `streamer_profile_id`
- `schema_version`
- `state`
- `derived_from_task_list_version`
- `derived_at`
- `updated_at`

`state` contains the complete public Overlay State for one Streamer Profile. For the
Task Widget, `state.widgets[].data.todos` is derived from public-safe `tasks` fields:
Task Number, Task Text, status, Task Source, Task Author Label, timestamps needed for
rendering, and derived `voteCount`. It must not include Task Vote records, Task
History, Command Log entries, command settings, private owner hashes, diagnostics, or
dashboard-only metadata.

## Access model

Dashboard access uses Supabase Auth and Row Level Security:

- Streamer Profile rows are readable and writable only by their owner.
- Overlay Links, widgets, Task Widget config, Task List State, tasks, Task Votes,
  Task History, Command Log, and Overlay State rows are dashboard-readable only when
  they belong to a profile owned by `auth.uid()`.
- Dashboard writes go through owned profile scope and update Task List State before
  deriving Overlay State.

Hosted Overlay access uses a public Next.js route:

- The route receives an Overlay Link token.
- The server hashes the token and resolves it against active `overlay_links`.
- The server returns only `overlay_states.state` for the linked Streamer Profile.
  Resolver metadata such as link IDs, profile IDs, and task list versions remain
  server-side.
- Unknown or inactive links return an empty or disabled overlay shell with no
  streamer-specific data.

The public overlay route should not expose direct database credentials to the
browser. If server-side privileged access is used to resolve the link, the response
must be limited to the public Overlay State projection.

## Migration and testing implications

Initial persistence work should create migrations in dependency order:

1. Streamer Profile and Overlay Link tables.
2. Widget and Task Widget config tables.
3. Task List State, Task List Cycle, task, and Task Vote tables.
4. Task History and Command Log tables.
5. Overlay State projection table and derivation path.

Focused tests should cover:

- RLS ownership checks for cross-profile dashboard reads and writes.
- One active Overlay Link per Streamer Profile.
- Inactive Overlay Link behavior without private data exposure.
- Task Number stability within one Task List Cycle.
- Task List Reset creating a new cycle.
- Duplicate vote, vote change, and cooldown behavior.
- Command Log accepted and ignored outcomes.
- Overlay State projection excluding private fields.
- Hosted Overlay render compatibility with `widgets[].data.todos`.

This schema keeps the SSG/SSOT boundary explicit: Task List State remains the write
model, and Overlay State remains the public read model for Hosted Overlay and Saved
Preview.
