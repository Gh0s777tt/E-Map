import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

/** Wymiana kodu OAuth/magic-link na sesję, następnie redirect na dashboard. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await getServerSupabase();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
