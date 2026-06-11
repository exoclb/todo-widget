import type { SupabaseClient } from "@supabase/supabase-js";

export type ActiveOverlayLinkRecord = {
  id: string;
  streamerProfileId: string;
};

export type OverlayStateRecord = {
  id: string;
  streamerProfileId: string;
  schemaVersion: number;
  state: Record<string, unknown>;
  derivedFromTaskListVersion: number | null;
  derivedAt: string | null;
  updatedAt?: string;
};

type OverlayLinkRow = {
  id: string;
  streamer_profile_id: string;
};

type OverlayStateRow = {
  id: string;
  streamer_profile_id: string;
  schema_version: number;
  state: Record<string, unknown>;
  derived_from_task_list_version: number | null;
  derived_at: string | null;
  updated_at?: string;
};

function mapActiveOverlayLink(row: OverlayLinkRow): ActiveOverlayLinkRecord {
  return {
    id: row.id,
    streamerProfileId: row.streamer_profile_id
  };
}

function mapOverlayState(row: OverlayStateRow): OverlayStateRecord {
  return {
    id: row.id,
    streamerProfileId: row.streamer_profile_id,
    schemaVersion: row.schema_version,
    state: row.state,
    derivedFromTaskListVersion: row.derived_from_task_list_version,
    derivedAt: row.derived_at,
    updatedAt: row.updated_at
  };
}

export function createSupabaseOverlayRepository(supabase: SupabaseClient) {
  return {
    async findActiveOverlayLinkByTokenHash(publicTokenHash: string) {
      const { data, error } = await supabase
        .from("overlay_links")
        .select("id, streamer_profile_id")
        .eq("public_token_hash", publicTokenHash)
        .eq("status", "active")
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data ? mapActiveOverlayLink(data as OverlayLinkRow) : null;
    },

    async findOverlayStateByStreamerProfileId(streamerProfileId: string) {
      const { data, error } = await supabase
        .from("overlay_states")
        .select("id, streamer_profile_id, schema_version, state, derived_from_task_list_version, derived_at, updated_at")
        .eq("streamer_profile_id", streamerProfileId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data ? mapOverlayState(data as OverlayStateRow) : null;
    }
  };
}
