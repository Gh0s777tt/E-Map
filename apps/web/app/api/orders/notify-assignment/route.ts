import {
  createSupabaseAdminClient,
  getActiveMembership,
  listPushSubscriptionsForDelivery,
} from "@e-logistic/api";
import { NextResponse } from "next/server";
import { z } from "zod";
import { pushConfigured, sendPushTo } from "@/lib/push";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ orderId: z.string().uuid() });

/**
 * Natychmiastowy push do kierowcy przypisanego do zlecenia (nie czeka na cron).
 * Wywoływane przez spedytora po przypisaniu. Autoryzacja: sesja + rola
 * owner/dispatcher; zlecenie musi należeć do firmy wywołującego.
 */
export async function POST(request: Request) {
  if (!pushConfigured()) {
    // Push nieskonfigurowany → cicho pomijamy (powiadomienie w aplikacji i tak powstaje przez trigger).
    return NextResponse.json({ skipped: "push" });
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

  const parsed = schema.safeParse((await request.json().catch(() => ({}))) ?? {});
  if (!parsed.success) return NextResponse.json({ error: "Nieprawidłowe dane." }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, company_id, assigned_to, reference_no, origin, destination")
    .eq("id", parsed.data.orderId)
    .maybeSingle();
  if (!order || order.company_id !== m.companyId) {
    return NextResponse.json({ error: "Zlecenie nie istnieje." }, { status: 404 });
  }
  if (!order.assigned_to || order.assigned_to === user.id) {
    return NextResponse.json({ sent: 0 });
  }

  const route = `${order.origin || "?"} → ${order.destination || "?"}`;
  const subs = await listPushSubscriptionsForDelivery(admin, {
    companyId: m.companyId,
    userIds: [order.assigned_to],
  });
  const res = await sendPushTo(subs, {
    title: `Nowe zlecenie${order.reference_no ? ` ${order.reference_no}` : ""}`,
    body: route,
    url: "/my-orders",
    tag: "order-assigned",
  });
  return NextResponse.json(res);
}
