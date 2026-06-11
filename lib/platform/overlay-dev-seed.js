import { hashOverlayLinkToken, normalizeOverlayLinkToken } from "./overlay-link.js";

const DEFAULT_OVERLAY_TOKEN = "dev-overlay-token";
const DEFAULT_PROFILE_SLUG = "dev-streamer";
const DEFAULT_PROFILE_DISPLAY_NAME = "Dev Streamer";

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlJson(value) {
  return `${sqlString(JSON.stringify(value, null, 2))}::jsonb`;
}

function assertUuid(value, fieldName) {
  const text = String(value || "").trim();

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)) {
    throw new Error(`${fieldName} must be an existing Supabase auth user UUID`);
  }

  return text;
}

export function createSampleOverlayState({ slug = DEFAULT_PROFILE_SLUG, displayName = DEFAULT_PROFILE_DISPLAY_NAME } = {}) {
  return {
    schemaVersion: 1,
    profile: {
      slug,
      displayName,
    },
    overlay: {
      refreshIntervalMs: 5000,
    },
    summary: {},
    theme: {
      tokens: {
        themePreset: "tokyo-night",
        accentColor: "#7aa2f7",
      },
    },
    widgets: [
      {
        id: "todo-main",
        type: "todo",
        title: "DEV STREAM TASKS",
        enabled: true,
        position: "top-right",
        sortOrder: 1,
        settings: {
          emptyText: "No stream tasks",
          maxItems: 5,
          showCompleted: true,
          showProgress: true,
          enableVoting: true,
          votePrioritySort: true,
          layoutMode: "compact",
        },
        data: {
          todos: [
            {
              id: "task-1",
              taskNumber: 1,
              title: "Check mic levels",
              authorName: displayName,
              isDone: false,
              voteCount: 2,
              sortOrder: 1,
            },
            {
              id: "task-2",
              taskNumber: 2,
              title: "Pick next game",
              authorName: "ViewerOne",
              isDone: false,
              voteCount: 1,
              sortOrder: 2,
            },
          ],
        },
      },
    ],
  };
}

export function createOverlayDevSeedSql(input) {
  const ownerUserId = assertUuid(input?.ownerUserId, "ownerUserId");
  const token = normalizeOverlayLinkToken(input?.token || DEFAULT_OVERLAY_TOKEN);
  const slug = String(input?.slug || DEFAULT_PROFILE_SLUG).trim();
  const displayName = String(input?.displayName || DEFAULT_PROFILE_DISPLAY_NAME).trim();
  const publicTokenHash = hashOverlayLinkToken(token);
  const overlayState = input?.overlayState || createSampleOverlayState({ slug, displayName });

  if (!token) {
    throw new Error("token is required");
  }

  if (!slug) {
    throw new Error("slug is required");
  }

  if (!displayName) {
    throw new Error("displayName is required");
  }

  return `-- Generated dev Overlay Link seed.
-- Token: ${token}
-- Open after applying: /overlay/${token}
-- Requires an existing auth.users row with id ${ownerUserId}.

begin;

with profile as (
  insert into public.streamer_profiles (owner_user_id, slug, display_name)
  values (${sqlString(ownerUserId)}::uuid, ${sqlString(slug)}, ${sqlString(displayName)})
  on conflict (owner_user_id) do update
    set slug = excluded.slug,
        display_name = excluded.display_name
  returning id
),
inactive_links as (
  update public.overlay_links
  set status = 'inactive',
      deactivated_at = now()
  where streamer_profile_id = (select id from profile)
    and status = 'active'
  returning id
),
active_link as (
  insert into public.overlay_links (streamer_profile_id, public_token_hash, status, activated_at)
  select id, ${sqlString(publicTokenHash)}, 'active', now()
  from profile
  on conflict (public_token_hash) do update
    set status = 'active',
        activated_at = now(),
        deactivated_at = null
    where public.overlay_links.streamer_profile_id = excluded.streamer_profile_id
  returning streamer_profile_id
)
insert into public.overlay_states (
  streamer_profile_id,
  schema_version,
  state,
  derived_from_task_list_version,
  derived_at
)
select
  id,
  1,
  ${sqlJson(overlayState)},
  1,
  now()
from profile
on conflict (streamer_profile_id) do update
  set schema_version = excluded.schema_version,
      state = excluded.state,
      derived_from_task_list_version = excluded.derived_from_task_list_version,
      derived_at = excluded.derived_at;

commit;
`;
}
