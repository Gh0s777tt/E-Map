import { getActiveMembership, listPushSubscriptionsForDelivery } from "@e-logistic/api";
import { createSupabaseAdminClient } from "@e-logistic/api/admin";
import { NextResponse } from "next/server";
import { z } from "zod";
import { pushConfigured, sendPushTo } from "@/lib/push";
import { pushUrlSchema } from "@/lib/pushUrl";
import { rateLimit } from "@/lib/ratelimit";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Walidacja body (P2 #8). `url` MUSI być ścieżką względną (zaczyna się od „/", ale nie „//")
// — inaczej kliknięcie powiadomienia mogłoby otworzyć dowolną domenę (open-redirect).
// Dodatkowo (defense-in-depth) odrzucamy „..", backslash i znaki kontrolne.
const sendSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  body: z.string().trim().max(500).optional(),
  url: pushUrlSchema.optional(),
});

/**
 * Ręczna/testowa wysyłka push do firmy zalogowanego owner/spedytora.
 * Body: { title, body?, url? }. Wysyła do wszystkich subskrypcji firmy.
 */
export async function POST(request: Request) {
  if (!pushConfigured()) {
    return NextResponse.json({ error: "Push nie skonfigurowany (VAPID)." }, { status: 503 });
  }
  // Rate-limit (audyt #214): blokuje spam push do całej firmy (sliding window per IP+akcja).
  if (!(await rateLimit(request, "push-send")).ok) {
    return NextResponse.json({ error: "Za dużo żądań — spróbuj za chwilę." }, { status: 429 });
  }
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Brak sesji." }, { status: 401 });

  const m = await getActiveMembership(supabase).catch(() => null);
  if (!m || (m.role !== "owner" && m.role !== "dispatcher")) {
    return NextResponse.json({ error: "Brak uprawnień." }, { status: 403 });
  }

  const parsed = sendSchema.safeParse((await request.json().catch(() => ({}))) ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "Nieprawidłowe dane powiadomienia." }, { status: 400 });
  }
  const payload = parsed.data;
  const admin = createSupabaseAdminClient();
  const subs = await listPushSubscriptionsForDelivery(admin, { companyId: m.companyId });
  const res = await sendPushTo(subs, {
    title: payload.title || "E-Logistic",
    body: payload.body || "Powiadomienie testowe.",
    url: payload.url || "/dashboard",
  });
  return NextResponse.json(res);
}
