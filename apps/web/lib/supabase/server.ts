import "server-only";

import { createSupabaseServerClient } from "@e-logistic/api";
import { cookies } from "next/headers";

/** Klient Supabase dla Server Components / Route Handlers (adapter ciasteczek Next). */
export async function getServerSupabase() {
  const cookieStore = await cookies();
  return createSupabaseServerClient({
    getAll: () => cookieStore.getAll(),
    setAll: (cookiesToSet) => {
      try {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      } catch {
        // Wywołane z Server Component (ciasteczka tylko do odczytu) —
        // odświeżenie sesji realizuje middleware.
      }
    },
  });
}
