import { createSupabaseServerClient } from "@e-logistic/api";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Proxy (Next.js 16, dawniej „middleware") — odświeża sesję Supabase
 * przy każdym żądaniu i propaguje ciasteczka.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createSupabaseServerClient({
    getAll: () => request.cookies.getAll(),
    setAll: (cookiesToSet) => {
      for (const { name, value } of cookiesToSet) {
        request.cookies.set(name, value);
      }
      response = NextResponse.next({ request });
      for (const { name, value, options } of cookiesToSet) {
        response.cookies.set(name, value, options);
      }
    },
  });

  // Ważne: nie wstawiaj logiki między utworzenie klienta a getUser().
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|login|auth|.*\\.).*)"],
};
