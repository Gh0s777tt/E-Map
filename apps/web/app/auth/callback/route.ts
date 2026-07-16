import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

/** Wymiana kodu OAuth/magic-link/recovery na sesję, następnie redirect (domyślnie pulpit). */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = await getServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    // Kod wygasły/zużyty (OAuth/magic-link/recovery) — nie odbijaj cicho na pulpit
    // (layout i tak zawróci na /login bez komunikatu). Pokaż błąd na logowaniu.
    if (error) return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  // `next` akceptujemy tylko jako ścieżkę wewnętrzną (ochrona przed open-redirect).
  const dest = next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  return NextResponse.redirect(`${origin}${dest}`);
}
