create table if not exists public.overlay_links (
  id uuid primary key default gen_random_uuid(),
  streamer_profile_id uuid not null references public.streamer_profiles(id) on delete cascade,
  public_token_hash text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  activated_at timestamptz not null default now(),
  deactivated_at timestamptz,
  regenerated_from_link_id uuid references public.overlay_links(id) on delete set null,
  constraint overlay_links_status_check check (status in ('active', 'inactive')),
  constraint overlay_links_token_hash_length check (char_length(public_token_hash) between 32 and 256),
  constraint overlay_links_deactivation_matches_status check (
    (status = 'active' and deactivated_at is null)
    or (status = 'inactive')
  )
);

create unique index if not exists overlay_links_public_token_hash_key
  on public.overlay_links(public_token_hash);

create unique index if not exists overlay_links_one_active_per_profile_key
  on public.overlay_links(streamer_profile_id)
  where status = 'active';

create index if not exists overlay_links_streamer_profile_id_idx
  on public.overlay_links(streamer_profile_id);

create table if not exists public.overlay_states (
  id uuid primary key default gen_random_uuid(),
  streamer_profile_id uuid not null references public.streamer_profiles(id) on delete cascade,
  schema_version integer not null default 1,
  state jsonb not null,
  derived_from_task_list_version integer,
  derived_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint overlay_states_schema_version_positive check (schema_version > 0),
  constraint overlay_states_state_is_object check (jsonb_typeof(state) = 'object')
);

create unique index if not exists overlay_states_streamer_profile_id_key
  on public.overlay_states(streamer_profile_id);

alter table public.overlay_links enable row level security;
alter table public.overlay_states enable row level security;

drop policy if exists "Overlay links are owner readable" on public.overlay_links;
create policy "Overlay links are owner readable"
  on public.overlay_links
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.streamer_profiles
      where streamer_profiles.id = overlay_links.streamer_profile_id
        and streamer_profiles.owner_user_id = (select auth.uid())
    )
  );

drop policy if exists "Overlay states are owner readable" on public.overlay_states;
create policy "Overlay states are owner readable"
  on public.overlay_states
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.streamer_profiles
      where streamer_profiles.id = overlay_states.streamer_profile_id
        and streamer_profiles.owner_user_id = (select auth.uid())
    )
  );

drop trigger if exists set_overlay_states_updated_at on public.overlay_states;
create trigger set_overlay_states_updated_at
  before update on public.overlay_states
  for each row
  execute function public.set_updated_at();
