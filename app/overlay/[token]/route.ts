import { NextResponse } from "next/server";
import { resolveOverlayStateForToken, createOverlayRoutePayload } from "@/lib/platform/overlay-link.js";
import { createSupabaseOverlayRepository } from "@/lib/platform/supabase-overlay-repository";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type OverlayRouteContext = {
  params: Promise<{
    token: string;
  }>;
};

function jsonResponse(body: ReturnType<typeof createOverlayRoutePayload>) {
  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

export async function GET(_request: Request, { params }: OverlayRouteContext) {
  const { token } = await params;
  const supabase = createSupabaseServiceRoleClient();
  const repository = createSupabaseOverlayRepository(supabase);
  const resolvedOverlayState = await resolveOverlayStateForToken(repository, token);

  return jsonResponse(createOverlayRoutePayload(resolvedOverlayState));
}
