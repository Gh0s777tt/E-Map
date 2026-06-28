import {
  getActiveMembership,
  listExpoPushTokensForUsers,
  listPushSubscriptionsForDelivery,
} from "@e-logistic/api";
import { createSupabaseAdminClient } from "@e-logistic/api/admin";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sendExpoPush } from "@/lib/expoPush";
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
  // Web Push wymaga VAPID; Expo Push (mobile) nie — dlatego nie pomijamy całej
  // trasy, gdy brak konfiguracji web push, tylko wysyłamy tym kanałem, który działa.
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
  const title = `Nowe zlecenie${order.reference_no ? ` ${order.reference_no}` : ""}`;

  // Web Push (przeglądarka/desktop) — tylko gdy skonfigurowane VAPID.
  const web = pushConfigured()
    ? await sendPushTo(
        await listPushSubscriptionsForDelivery(admin, {
          companyId: m.companyId,
          userIds: [order.assigned_to],
        }),
        { title, body: route, url: "/my-orders", tag: "order-assigned" },
      )
    : { sent: 0 };

  // Expo Push (aplikacja mobilna) — bez dodatkowej konfiguracji.
  const expoTokens = await listExpoPushTokensForUsers(admin, [order.assigned_to]).catch(() => []);
  const expo = await sendExpoPush(expoTokens, {
    title,
    body: route,
    data: { url: "/my-orders" },
  });

  return NextResponse.json({ web, expo });
}
