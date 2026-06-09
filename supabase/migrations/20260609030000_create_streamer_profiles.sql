create table if not exists public.streamer_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint streamer_profiles_slug_length check (char_length(slug) between 1 and 48),
  constraint streamer_profiles_display_name_length check (char_length(display_name) between 1 and 80)
);

create unique index if not exists streamer_profiles_owner_user_id_key
  on public.streamer_profiles(owner_user_id);

create unique index if not exists streamer_profiles_slug_key
  on public.streamer_profiles(slug);

alter table public.streamer_profiles enable row level security;

drop policy if exists "Streamer profiles are owner readable" on public.streamer_profiles;
create policy "Streamer profiles are owner readable"
  on public.streamer_profiles
  for select
  to authenticated
  using ((select auth.uid()) = owner_user_id);

drop policy if exists "Streamers can create their own profile" on public.streamer_profiles;
create policy "Streamers can create their own profile"
  on public.streamer_profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = owner_user_id);

drop policy if exists "Streamers can update their own profile" on public.streamer_profiles;
create policy "Streamers can update their own profile"
  on public.streamer_profiles
  for update
  to authenticated
  using ((select auth.uid()) = owner_user_id)
  with check ((select auth.uid()) = owner_user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_streamer_profiles_updated_at on public.streamer_profiles;
create trigger set_streamer_profiles_updated_at
  before update on public.streamer_profiles
  for each row
  execute function public.set_updated_at();
