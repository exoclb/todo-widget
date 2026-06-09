"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseStreamerProfileRepository } from "@/lib/platform/supabase-profile-repository";
import { updateOwnedStreamerProfile } from "@/lib/platform/streamer-profile.js";

export async function updateStreamerProfile(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const profileId = String(formData.get("profileId") ?? "");
  const displayName = String(formData.get("displayName") ?? "");
  const slug = String(formData.get("slug") ?? "");

  const repository = createSupabaseStreamerProfileRepository(supabase);
  await updateOwnedStreamerProfile(repository, user, profileId, {
    displayName,
    slug
  });

  redirect("/dashboard");
}
