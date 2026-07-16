import { timingSafeEqual } from "node:crypto";
import { listExpoPushTokensForUsers, listPushSubscriptionsForDelivery } from "@e-logistic/api";
import { createSupabaseAdminClient } from "@e-logistic/api/admin";
import { NextResponse } from "next/server";
import { generateOperationalAlerts, generateWeeklyReports } from "@/lib/alerts";
import { emailConfigured, sendEmail } from "@/lib/email";
import { sendExpoPush } from "@/lib/expoPush";
import { pushConfigured, sendPushTo } from "@/lib/push";
import { weeklyReportPdf } from "@/lib/weeklyPdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cron (np. Vercel Cron, codziennie): dosyła nieprzeczytane powiadomienia z aplikacji
 * jako push (przeładowanie, wygasające terminy, usterki). Agreguje per użytkownik.
 * Autoryzacja: nagłówek `Authorization: Bearer <CRON_SECRET>` (ustawiany przez Vercel Cron).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET nieustawiony." }, { status: 503 });
  // Porównanie w stałym czasie (audyt N22) — zabezpiecza sekret przed atakiem czasowym.
  // Najpierw równa długość (timingSafeEqual rzuca dla różnych długości), potem stały czas.
  const auth = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (auth.length !== expected.length || !timingSafeEqual(auth, expected)) {
    return NextResponse.json({ error: "Brak autoryzacji." }, { status: 401 });
  }
  const admin = createSupabaseAdminClient();

  // #292: najpierw wygeneruj alerty (idempotentne dedup_key), potem dosyłka push.
  const generated = await generateOperationalAlerts(admin).catch(() => -1);
  const isMonday = new Date().getUTCDay() === 1;
  const weeklyResult = isMonday
    ? await generateWeeklyReports(admin).catch(() => null)
    : { inserted: 0, reports: [] };
  const weekly = weeklyResult ? weeklyResult.inserted : -1;

  // #301: poniedziałkowy raport tygodniowy jako PDF na e-maile zarządu (Resend).
  let emailed = 0;
  const emailErrors: string[] = [];
  if (isMonday && emailConfigured() && weeklyResult) {
    for (const r of weeklyResult.reports) {
      if (r.emails.length === 0) continue;
      try {
        const pdf = await weeklyReportPdf(r);
        const res = await sendEmail({
          to: r.emails,
          subject: `📊 E-Logistic — raport tygodniowy ${r.fromDate}–${r.toDate} (${r.companyName})`,
          html: `<p>W załączniku raport tygodniowy firmy <strong>${r.companyName}</strong> za okres ${r.fromDate}–${r.toDate}.</p><p>Dostawy: <strong>${r.delivered}</strong> · Paliwo: <strong>${Math.round(r.liters)} l</strong> · Wydatki kierowców: <strong>${r.expenses}</strong></p><p>Szczegóły: <a href="https://e-logistic-one.vercel.app/reports">panel E-Logistic</a>.</p>`,
          attachments: [{ filename: `e-logistic-raport-${r.fromDate}.pdf`, content: pdf }],
        });
        if (res.ok) emailed++;
        else emailErrors.push(`${r.companyName}: ${res.error}`);
      } catch (e) {
        emailErrors.push(e instanceof Error ? e.message : "pdf/email error");
      }
    }
  }
  const since = new Date(Date.now() - 25 * 3600 * 1000).toISOString();
  const { data: notifs, error } = await admin
    .from("notifications")
    .select("user_id, title, body, created_at")
    .is("read_at", null)
    .gte("created_at", since)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const byUser = new Map<string, { count: number; title: string; body: string | null }>();
  for (const n of (notifs ?? []) as {
    user_id: string;
    title: string;
    body: string | null;
  }[]) {
    const cur = byUser.get(n.user_id);
    if (cur) cur.count++;
    else byUser.set(n.user_id, { count: 1, title: n.title, body: n.body });
  }

  let sent = 0;
  let removed = 0;
  let expoSent = 0;
  for (const [userId, info] of byUser) {
    const title = info.count > 1 ? `E-Logistic: ${info.count} nowych powiadomień` : info.title;
    const body = info.count > 1 ? `Najnowsze: ${info.title}` : (info.body ?? "");
    if (pushConfigured()) {
      const subs = await listPushSubscriptionsForDelivery(admin, { userIds: [userId] });
      const r = await sendPushTo(subs, { title, body, url: "/dashboard", tag: "elog-notif" });
      sent += r.sent;
      removed += r.removed;
    }
    // #292: kanał Expo — właściciel/kierowcy z aplikacją dostają alerty na telefon.
    const tokens = await listExpoPushTokensForUsers(admin, [userId]).catch(() => []);
    expoSent += (await sendExpoPush(tokens, { title, body, data: { url: "/" } })).sent;
  }

  return NextResponse.json({
    users: byUser.size,
    generated,
    weekly,
    sent,
    expoSent,
    removed,
    emailed,
    emailErrors,
  });
}
