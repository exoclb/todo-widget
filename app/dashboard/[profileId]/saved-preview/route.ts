import { notFound, redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { createSavedPreviewHtml } from "@/lib/platform/hosted-overlay-render.js";
import { createSupabaseOverlayRepository } from "@/lib/platform/supabase-overlay-repository";
import { createSupabaseStreamerProfileRepository } from "@/lib/platform/supabase-profile-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PlatformAuthorizationError, loadOwnedStreamerProfile } from "@/lib/platform/streamer-profile.js";

export const dynamic = "force-dynamic";

type SavedPreviewRouteContext = {
  params: Promise<{
    profileId: string;
  }>;
};

function htmlResponse(html: string) {
  return new NextResponse(html, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/html; charset=utf-8"
    }
  });
}

export async function GET(_request: Request, { params }: SavedPreviewRouteContext) {
  const { profileId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const profileRepository = createSupabaseStreamerProfileRepository(supabase);

  try {
    const profile = await loadOwnedStreamerProfile(profileRepository, user, profileId);
    const overlayRepository = createSupabaseOverlayRepository(supabase);
    const overlayState = await overlayRepository.findOverlayStateByStreamerProfileId(profile.id);

    return htmlResponse(createSavedPreviewHtml(overlayState?.state ?? null));
  } catch (error) {
    if (error instanceof PlatformAuthorizationError) {
      notFound();
    }

    throw error;
  }
}
