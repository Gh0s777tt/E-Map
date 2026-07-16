import "server-only";

import { createSupabaseAdminClient } from "@e-logistic/api/admin";
import { getServerSupabase } from "@/lib/supabase/server";

/**
 * Uwierzytelnia żądanie do trasy API dwoma równorzędnymi torami (jak `/api/chat/notify`):
 *  - nagłówek `Authorization: Bearer <access_token>` — aplikacja mobilna (brak ciasteczek),
 *  - ciasteczko sesji Supabase — panel web (fetch względny z przeglądarki).
 *
 * Zwraca `userId` zalogowanego użytkownika albo `null` (wtedy trasa odpowiada 401).
 * Płatne/zewnętrzne API (HERE/TomTom/GraphHopper) wolno wołać dopiero po pozytywnym wyniku —
 * rate-limit to uzupełnienie, nie jedyna bariera (audyt Ś16).
 */
export async function authenticateRequest(request: Request): Promise<string | null> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (token) {
    const admin = createSupabaseAdminClient();
    const {
      data: { user },
    } = await admin.auth.getUser(token);
    if (user) return user.id;
  }
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}
