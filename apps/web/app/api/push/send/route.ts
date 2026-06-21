import {
  createSupabaseAdminClient,
  getActiveMembership,
  listPushSubscriptionsForDelivery,
} from "@e-logistic/api";
import { NextResponse } from "next/server";
import { pushConfigured, sendPushTo } from "@/lib/push";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Ręczna/testowa wysyłka push do firmy zalogowanego owner/spedytora.
 * Body: { title, body?, url? }. Wysyła do wszystkich subskrypcji firmy.
 */
export async function POST(request: Request) {
  if (!pushConfigured()) {
    return NextResponse.json({ error: "Push nie skonfigurowany (VAPID)." }, { status: 503 });
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

  const payload = (await request.json().catch(() => ({}))) as {
    title?: string;
    body?: string;
    url?: string;
  };
  const admin = createSupabaseAdminClient();
  const subs = await listPushSubscriptionsForDelivery(admin, { companyId: m.companyId });
  const res = await sendPushTo(subs, {
    title: payload.title || "E-Logistic",
    body: payload.body || "Powiadomienie testowe.",
    url: payload.url || "/dashboard",
  });
  return NextResponse.json(res);
}
