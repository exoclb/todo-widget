import { NextResponse } from "next/server";
import {
  isAuthorizedHostedChatCommandRequest,
  processHostedChatCommandPayload
} from "@/lib/platform/hosted-chat-command-endpoint.js";
import { createSupabaseTaskListRepository } from "@/lib/platform/supabase-task-list-repository";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { requireEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const expectedToken = requireEnv("HOSTED_CHAT_COMMAND_API_TOKEN");

  if (!isAuthorizedHostedChatCommandRequest(request, expectedToken)) {
    return NextResponse.json(
      { status: "error", error: "Unauthorized" },
      {
        status: 401,
        headers: { "Cache-Control": "no-store" }
      }
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { status: "error", error: "Request body must be valid JSON" },
      {
        status: 400,
        headers: { "Cache-Control": "no-store" }
      }
    );
  }

  const supabase = createSupabaseServiceRoleClient();
  const repository = createSupabaseTaskListRepository(supabase);
  const response = await processHostedChatCommandPayload(repository, payload);

  return NextResponse.json(response.body, {
    status: response.status,
    headers: { "Cache-Control": "no-store" }
  });
}
