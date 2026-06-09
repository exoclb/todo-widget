import { NextResponse } from "next/server";
import { createSupabaseWritableServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createSupabaseWritableServerClient();
  await supabase.auth.signOut();

  return NextResponse.redirect(new URL("/auth/login", request.url), 303);
}
