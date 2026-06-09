import type { SupabaseClient } from "@supabase/supabase-js";

export type StreamerProfileRecord = {
  id: string;
  ownerUserId: string;
  slug: string;
  displayName: string;
  createdAt?: string;
  updatedAt?: string;
};

type StreamerProfileRow = {
  id: string;
  owner_user_id: string;
  slug: string;
  display_name: string;
  created_at?: string;
  updated_at?: string;
};

type CreateStreamerProfileInput = {
  ownerUserId: string;
  slug: string;
  displayName: string;
};

type UpdateStreamerProfileInput = {
  slug: string;
  displayName: string;
};

function mapStreamerProfile(row: StreamerProfileRow): StreamerProfileRecord {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    slug: row.slug,
    displayName: row.display_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function createSupabaseStreamerProfileRepository(supabase: SupabaseClient) {
  return {
    async findByOwnerUserId(ownerUserId: string) {
      const { data, error } = await supabase
        .from("streamer_profiles")
        .select("id, owner_user_id, slug, display_name, created_at, updated_at")
        .eq("owner_user_id", ownerUserId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data ? mapStreamerProfile(data as StreamerProfileRow) : null;
    },

    async findById(profileId: string) {
      const { data, error } = await supabase
        .from("streamer_profiles")
        .select("id, owner_user_id, slug, display_name, created_at, updated_at")
        .eq("id", profileId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data ? mapStreamerProfile(data as StreamerProfileRow) : null;
    },

    async create(input: CreateStreamerProfileInput) {
      const { data, error } = await supabase
        .from("streamer_profiles")
        .insert({
          owner_user_id: input.ownerUserId,
          slug: input.slug,
          display_name: input.displayName
        })
        .select("id, owner_user_id, slug, display_name, created_at, updated_at")
        .single();

      if (error) {
        throw error;
      }

      return mapStreamerProfile(data as StreamerProfileRow);
    },

    async update(profileId: string, ownerUserId: string, input: UpdateStreamerProfileInput) {
      const { data, error } = await supabase
        .from("streamer_profiles")
        .update({
          slug: input.slug,
          display_name: input.displayName
        })
        .eq("id", profileId)
        .eq("owner_user_id", ownerUserId)
        .select("id, owner_user_id, slug, display_name, created_at, updated_at")
        .single();

      if (error) {
        throw error;
      }

      return mapStreamerProfile(data as StreamerProfileRow);
    }
  };
}
