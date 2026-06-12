import { NextResponse } from "next/server";
import { createHostedOverlayHtml } from "@/lib/platform/hosted-overlay-render.js";
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

function htmlResponse(html: string) {
  return new NextResponse(html, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/html; charset=utf-8"
    }
  });
}

function wantsJson(request: Request) {
  const accept = request.headers.get("accept") || "";
  return accept.includes("application/json") && !accept.includes("text/html");
}

export async function GET(request: Request, { params }: OverlayRouteContext) {
  const { token } = await params;
  const supabase = createSupabaseServiceRoleClient();
  const repository = createSupabaseOverlayRepository(supabase);
  const resolvedOverlayState = await resolveOverlayStateForToken(repository, token);
  const payload = createOverlayRoutePayload(resolvedOverlayState);

  if (wantsJson(request)) {
    return jsonResponse(payload);
  }

  return htmlResponse(createHostedOverlayHtml(payload.state));
}
