create table if not exists public.widgets (
  id uuid primary key default gen_random_uuid(),
  streamer_profile_id uuid not null references public.streamer_profiles(id) on delete cascade,
  type text not null,
  title text not null,
  enabled boolean not null default true,
  position text not null default 'top-right',
  sort_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint widgets_type_check check (type in ('todo'))
);

create index if not exists widgets_streamer_profile_id_idx
  on public.widgets(streamer_profile_id);

create table if not exists public.task_widget_configs (
  widget_id uuid primary key references public.widgets(id) on delete cascade,
  render_settings jsonb not null default '{}'::jsonb,
  command_settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint task_widget_configs_render_settings_object check (jsonb_typeof(render_settings) = 'object'),
  constraint task_widget_configs_command_settings_object check (jsonb_typeof(command_settings) = 'object')
);

create table if not exists public.task_list_states (
  id uuid primary key default gen_random_uuid(),
  widget_id uuid not null references public.widgets(id) on delete cascade,
  current_cycle_id uuid,
  next_task_number integer not null default 1,
  version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint task_list_states_next_task_number_positive check (next_task_number > 0),
  constraint task_list_states_version_non_negative check (version >= 0)
);

create unique index if not exists task_list_states_widget_id_key
  on public.task_list_states(widget_id);

create table if not exists public.task_list_cycles (
  id uuid primary key default gen_random_uuid(),
  task_list_state_id uuid not null references public.task_list_states(id) on delete cascade,
  cycle_number integer not null,
  started_at timestamptz not null default now(),
  started_by_kind text not null default 'streamer',
  started_by_label text not null default 'Streamer',
  constraint task_list_cycles_cycle_number_positive check (cycle_number > 0),
  constraint task_list_cycles_started_by_kind_check check (started_by_kind in ('streamer', 'chat-command', 'system'))
);

create unique index if not exists task_list_cycles_state_cycle_number_key
  on public.task_list_cycles(task_list_state_id, cycle_number);

alter table public.task_list_states
  drop constraint if exists task_list_states_current_cycle_id_fkey;

alter table public.task_list_states
  add constraint task_list_states_current_cycle_id_fkey
  foreign key (current_cycle_id) references public.task_list_cycles(id) on delete restrict;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  task_list_state_id uuid not null references public.task_list_states(id) on delete cascade,
  task_list_cycle_id uuid not null references public.task_list_cycles(id) on delete restrict,
  task_number integer not null,
  text text not null,
  status text not null default 'active',
  source text not null,
  author_label text not null,
  owner_subject_hash text,
  vote_count integer not null default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  visible_until timestamptz,
  updated_at timestamptz not null default now(),
  constraint tasks_status_check check (status in ('active', 'completed')),
  constraint tasks_source_check check (source in ('dashboard', 'chat-command')),
  constraint tasks_task_number_positive check (task_number > 0),
  constraint tasks_vote_count_non_negative check (vote_count >= 0)
);

create unique index if not exists tasks_cycle_task_number_key
  on public.tasks(task_list_cycle_id, task_number);

create index if not exists tasks_task_list_state_id_idx
  on public.tasks(task_list_state_id);

create table if not exists public.task_votes (
  id uuid primary key default gen_random_uuid(),
  task_list_state_id uuid not null references public.task_list_states(id) on delete cascade,
  task_list_cycle_id uuid not null references public.task_list_cycles(id) on delete restrict,
  task_id uuid not null references public.tasks(id) on delete cascade,
  viewer_subject_hash text not null,
  viewer_label text not null,
  last_voted_at timestamptz not null default now(),
  cooldown_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists task_votes_one_vote_per_viewer_cycle_key
  on public.task_votes(task_list_state_id, task_list_cycle_id, viewer_subject_hash);

create index if not exists task_votes_task_id_idx
  on public.task_votes(task_id);

create table if not exists public.task_history (
  id uuid primary key default gen_random_uuid(),
  streamer_profile_id uuid not null references public.streamer_profiles(id) on delete cascade,
  widget_id uuid not null references public.widgets(id) on delete cascade,
  task_list_cycle_id uuid not null references public.task_list_cycles(id) on delete restrict,
  task_id uuid,
  task_number integer not null,
  text text not null,
  author_label text not null,
  source text not null,
  outcome text not null,
  closed_by_kind text not null,
  closed_by_label text not null,
  vote_count integer not null default 0,
  created_at timestamptz,
  closed_at timestamptz not null default now(),
  constraint task_history_outcome_check check (outcome in ('completed', 'removed', 'reset')),
  constraint task_history_source_check check (source in ('dashboard', 'chat-command')),
  constraint task_history_closed_by_kind_check check (closed_by_kind in ('streamer', 'task-manager', 'system'))
);

create index if not exists task_history_streamer_profile_id_idx
  on public.task_history(streamer_profile_id);

create table if not exists public.command_logs (
  id uuid primary key default gen_random_uuid(),
  streamer_profile_id uuid not null references public.streamer_profiles(id) on delete cascade,
  widget_id uuid not null references public.widgets(id) on delete cascade,
  task_list_state_id uuid references public.task_list_states(id) on delete set null,
  command_name text not null,
  raw_command_text text not null,
  actor_label text not null,
  actor_subject_hash text,
  outcome text not null,
  ignored_reason text,
  created_task_id uuid,
  affected_task_id uuid,
  created_at timestamptz not null default now(),
  constraint command_logs_outcome_check check (outcome in ('accepted', 'ignored'))
);

create index if not exists command_logs_streamer_profile_id_idx
  on public.command_logs(streamer_profile_id);

alter table public.widgets enable row level security;
alter table public.task_widget_configs enable row level security;
alter table public.task_list_states enable row level security;
alter table public.task_list_cycles enable row level security;
alter table public.tasks enable row level security;
alter table public.task_votes enable row level security;
alter table public.task_history enable row level security;
alter table public.command_logs enable row level security;

drop policy if exists "Widgets are owner scoped" on public.widgets;
create policy "Widgets are owner scoped"
  on public.widgets
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.streamer_profiles
      where streamer_profiles.id = widgets.streamer_profile_id
        and streamer_profiles.owner_user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.streamer_profiles
      where streamer_profiles.id = widgets.streamer_profile_id
        and streamer_profiles.owner_user_id = (select auth.uid())
    )
  );

drop policy if exists "Task widget configs are owner scoped" on public.task_widget_configs;
create policy "Task widget configs are owner scoped"
  on public.task_widget_configs
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.widgets
      join public.streamer_profiles on streamer_profiles.id = widgets.streamer_profile_id
      where widgets.id = task_widget_configs.widget_id
        and streamer_profiles.owner_user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.widgets
      join public.streamer_profiles on streamer_profiles.id = widgets.streamer_profile_id
      where widgets.id = task_widget_configs.widget_id
        and streamer_profiles.owner_user_id = (select auth.uid())
    )
  );

drop policy if exists "Task List State is owner scoped" on public.task_list_states;
create policy "Task List State is owner scoped"
  on public.task_list_states
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.widgets
      join public.streamer_profiles on streamer_profiles.id = widgets.streamer_profile_id
      where widgets.id = task_list_states.widget_id
        and streamer_profiles.owner_user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.widgets
      join public.streamer_profiles on streamer_profiles.id = widgets.streamer_profile_id
      where widgets.id = task_list_states.widget_id
        and streamer_profiles.owner_user_id = (select auth.uid())
    )
  );

drop policy if exists "Task List Cycles are owner scoped" on public.task_list_cycles;
create policy "Task List Cycles are owner scoped"
  on public.task_list_cycles
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.task_list_states
      join public.widgets on widgets.id = task_list_states.widget_id
      join public.streamer_profiles on streamer_profiles.id = widgets.streamer_profile_id
      where task_list_states.id = task_list_cycles.task_list_state_id
        and streamer_profiles.owner_user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.task_list_states
      join public.widgets on widgets.id = task_list_states.widget_id
      join public.streamer_profiles on streamer_profiles.id = widgets.streamer_profile_id
      where task_list_states.id = task_list_cycles.task_list_state_id
        and streamer_profiles.owner_user_id = (select auth.uid())
    )
  );

drop policy if exists "Tasks are owner scoped" on public.tasks;
create policy "Tasks are owner scoped"
  on public.tasks
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.task_list_states
      join public.widgets on widgets.id = task_list_states.widget_id
      join public.streamer_profiles on streamer_profiles.id = widgets.streamer_profile_id
      where task_list_states.id = tasks.task_list_state_id
        and streamer_profiles.owner_user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.task_list_states
      join public.widgets on widgets.id = task_list_states.widget_id
      join public.streamer_profiles on streamer_profiles.id = widgets.streamer_profile_id
      where task_list_states.id = tasks.task_list_state_id
        and streamer_profiles.owner_user_id = (select auth.uid())
    )
  );

drop policy if exists "Task Votes are owner scoped" on public.task_votes;
create policy "Task Votes are owner scoped"
  on public.task_votes
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.task_list_states
      join public.widgets on widgets.id = task_list_states.widget_id
      join public.streamer_profiles on streamer_profiles.id = widgets.streamer_profile_id
      where task_list_states.id = task_votes.task_list_state_id
        and streamer_profiles.owner_user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.task_list_states
      join public.widgets on widgets.id = task_list_states.widget_id
      join public.streamer_profiles on streamer_profiles.id = widgets.streamer_profile_id
      where task_list_states.id = task_votes.task_list_state_id
        and streamer_profiles.owner_user_id = (select auth.uid())
    )
  );

drop policy if exists "Task History is owner scoped" on public.task_history;
create policy "Task History is owner scoped"
  on public.task_history
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.streamer_profiles
      where streamer_profiles.id = task_history.streamer_profile_id
        and streamer_profiles.owner_user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.streamer_profiles
      where streamer_profiles.id = task_history.streamer_profile_id
        and streamer_profiles.owner_user_id = (select auth.uid())
    )
  );

drop policy if exists "Command Logs are owner scoped" on public.command_logs;
create policy "Command Logs are owner scoped"
  on public.command_logs
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.streamer_profiles
      where streamer_profiles.id = command_logs.streamer_profile_id
        and streamer_profiles.owner_user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.streamer_profiles
      where streamer_profiles.id = command_logs.streamer_profile_id
        and streamer_profiles.owner_user_id = (select auth.uid())
    )
  );

drop policy if exists "Overlay State writes are owner scoped" on public.overlay_states;
create policy "Overlay State writes are owner scoped"
  on public.overlay_states
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.streamer_profiles
      where streamer_profiles.id = overlay_states.streamer_profile_id
        and streamer_profiles.owner_user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.streamer_profiles
      where streamer_profiles.id = overlay_states.streamer_profile_id
        and streamer_profiles.owner_user_id = (select auth.uid())
    )
  );

drop trigger if exists set_widgets_updated_at on public.widgets;
create trigger set_widgets_updated_at
  before update on public.widgets
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_task_widget_configs_updated_at on public.task_widget_configs;
create trigger set_task_widget_configs_updated_at
  before update on public.task_widget_configs
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_task_list_states_updated_at on public.task_list_states;
create trigger set_task_list_states_updated_at
  before update on public.task_list_states
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_tasks_updated_at on public.tasks;
create trigger set_tasks_updated_at
  before update on public.tasks
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_task_votes_updated_at on public.task_votes;
create trigger set_task_votes_updated_at
  before update on public.task_votes
  for each row
  execute function public.set_updated_at();
