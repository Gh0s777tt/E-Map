import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

/** Wymiana kodu OAuth/magic-link/recovery na sesję, następnie redirect (domyślnie pulpit). */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = await getServerSupabase();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // `next` akceptujemy tylko jako ścieżkę wewnętrzną (ochrona przed open-redirect).
  const dest = next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  return NextResponse.redirect(`${origin}${dest}`);
}
