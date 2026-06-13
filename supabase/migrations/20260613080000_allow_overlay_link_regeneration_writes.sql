drop policy if exists "Overlay links are owner insertable" on public.overlay_links;
create policy "Overlay links are owner insertable"
  on public.overlay_links
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.streamer_profiles
      where streamer_profiles.id = overlay_links.streamer_profile_id
        and streamer_profiles.owner_user_id = (select auth.uid())
    )
  );

drop policy if exists "Overlay links are owner updatable" on public.overlay_links;
create policy "Overlay links are owner updatable"
  on public.overlay_links
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.streamer_profiles
      where streamer_profiles.id = overlay_links.streamer_profile_id
        and streamer_profiles.owner_user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.streamer_profiles
      where streamer_profiles.id = overlay_links.streamer_profile_id
        and streamer_profiles.owner_user_id = (select auth.uid())
    )
  );
