import { listExpoPushTokensForUsers, listPushSubscriptionsForDelivery } from "@e-logistic/api";
import { createSupabaseAdminClient } from "@e-logistic/api/admin";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sendExpoPush } from "@/lib/expoPush";
import { pushConfigured, sendPushTo } from "@/lib/push";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  threadId: z.string().uuid().nullable().optional(),
  preview: z.string().min(1).max(140),
  // #368: firma, w której pisano wiadomość. Opcjonalne dla zgodności ze starszymi
  // buildami mobile (build 61 jeszcze tego nie wysyła) — wtedy wymagamy, by użytkownik
  // miał DOKŁADNIE jedno aktywne członkostwo, zamiast zgadywać `limit(1)`.
  companyId: z.string().uuid().optional(),
});

/**
 * #291/#368: powiadomienie o nowej wiadomości czatu — wywoływane fire-and-forget
 * przez nadawcę po udanym INSERT. Autoryzacja: Bearer access token Supabase
 * (działa z aplikacji mobilnej i z panelu). Odbiorcy: członkowie wątku, a dla
 * kanału ogólnego — wszyscy aktywni członkowie firmy (nigdy nadawca).
 *
 * #368 — do tej pory szedł WYŁĄCZNIE kanał Expo (mobile): panel web nie dostawał
 * nic, a dzwonek nie miał czego pokazać. Teraz, dokładnie wzorem
 * `orders/notify-assignment`, lecą trzy kanały: Web Push (VAPID) + Expo Push +
 * wpis do `notifications` (centrum powiadomień w panelu).
 */
export async function POST(request: Request) {
  if (!(await rateLimit(request, "chat-notify")).ok) {
    return NextResponse.json({ error: "Zbyt wiele żądań." }, { status: 429 });
  }

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Brak sesji." }, { status: 401 });

  const admin = createSupabaseAdminClient();
  const {
    data: { user },
  } = await admin.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Brak sesji." }, { status: 401 });

  const parsed = schema.safeParse((await request.json().catch(() => ({}))) ?? {});
  if (!parsed.success) return NextResponse.json({ error: "Nieprawidłowe dane." }, { status: 400 });
  const { threadId, preview } = parsed.data;

  // #368 KRYTYCZNE (wyciek między firmami): wcześniej firmę wybierało `limit(1)` z
  // członkostw nadawcy. Użytkownik należący do DWÓCH firm, piszący w kanale ogólnym
  // firmy B, rozsyłał podgląd treści członkom firmy A — a od #368 treść jest dodatkowo
  // TRWALE zapisywana w `notifications` i wysyłana Web Pushem. Teraz firma pochodzi
  // z żądania i jest weryfikowana; bez niej dopuszczamy tylko jednoznaczny przypadek.
  const { data: memberships } = await admin
    .from("memberships")
    .select("company_id, role")
    .eq("user_id", user.id)
    .eq("status", "active");
  const active = memberships ?? [];
  if (active.length === 0) return NextResponse.json({ error: "Brak firmy." }, { status: 403 });

  const requestedCompany = parsed.data.companyId;
  const membership = requestedCompany
    ? active.find((m) => m.company_id === requestedCompany)
    : active.length === 1
      ? active[0]
      : undefined;
  if (!membership) {
    return NextResponse.json({ error: "Brak dostępu do firmy." }, { status: 403 });
  }
  const companyId = membership.company_id as string;
  const isManager = membership.role === "owner" || membership.role === "dispatcher";

  let recipients: string[] = [];
  let channelName: string | null = null;
  if (threadId) {
    // Wątek musi należeć do firmy nadawcy, a nadawca mieć do niego dostęp.
    const { data: thread } = await admin
      .from("chat_threads")
      .select("company_id, name, created_by")
      .eq("id", threadId)
      .maybeSingle();
    if (!thread || thread.company_id !== companyId) {
      return NextResponse.json({ error: "Nieznany kanał." }, { status: 404 });
    }
    channelName = thread.name;
    const { data: members } = await admin
      .from("chat_members")
      .select("user_id")
      .eq("thread_id", threadId);
    recipients = (members ?? []).map((m) => m.user_id as string);

    // #368 KRYTYCZNE: samo „wątek jest z mojej firmy" NIE wystarczy — bez tego dowolny
    // członek firmy mógł wstrzyknąć dowolny tekst do centrum powiadomień i pusha
    // członkom PRYWATNEGO kanału, do którego nie należy (i poznać ich liczbę).
    // Warunek odzwierciedla RLS `chat_threads_select` z 0067: zarząd / twórca / członek.
    const allowed = isManager || thread.created_by === user.id || recipients.includes(user.id);
    if (!allowed) {
      return NextResponse.json({ error: "Brak dostępu do kanału." }, { status: 403 });
    }
  } else {
    const { data: members } = await admin
      .from("memberships")
      .select("user_id")
      .eq("company_id", companyId)
      .eq("status", "active");
    recipients = (members ?? []).map((m) => m.user_id as string);
  }
  recipients = recipients.filter((id) => id !== user.id);
  if (recipients.length === 0) return NextResponse.json({ sent: 0 });

  const title = channelName ? `💬 ${channelName}` : "💬 Nowa wiadomość";
  const body = user.email ? `${user.email}: ${preview}` : preview;

  // Centrum powiadomień (dzwonek w panelu). Jeden świeży wpis na kanał i odbiorcę:
  // najpierw kasujemy poprzedni tego kanału, potem wstawiamy nowy — dzięki temu
  // rozmowa nie zalewa listy, a wpis wraca jako nieprzeczytany. Świadomie NIE
  // używamy upsert(onConflict) — indeks `notifications_dedup` jest częściowy
  // (WHERE dedup_key IS NOT NULL) i PostgREST nie umie wskazać predykatu (0069).
  // Klucz zawiera firmę — ten sam użytkownik może należeć do więcej niż jednej,
  // a `chat:general` bez firmy kasowałby wpis z drugiej (dedup jest per user).
  const dedupKey = `chat:${companyId}:${threadId ?? "general"}`;
  await admin
    .from("notifications")
    .delete()
    .eq("company_id", companyId)
    .eq("dedup_key", dedupKey)
    .in("user_id", recipients);
  const { error: notifError } = await admin.from("notifications").insert(
    recipients.map((userId) => ({
      company_id: companyId,
      user_id: userId,
      type: "chat_message",
      title,
      body,
      severity: "info",
      dedup_key: dedupKey,
    })),
  );
  // Wyścig dwóch wiadomości naraz → 23505 na indeksie dedup. Powiadomienie to
  // dodatek (realtime i tak dostarczy treść) — nie psujemy przez to wysyłki push.
  const notified = notifError ? 0 : recipients.length;

  // Web Push (przeglądarka/panel) — tylko gdy skonfigurowane VAPID.
  const web = pushConfigured()
    ? await sendPushTo(
        await listPushSubscriptionsForDelivery(admin, { companyId, userIds: recipients }),
        { title, body, url: "/chat", tag: "chat-message" },
      )
    : { sent: 0, removed: 0 };

  // Expo Push (aplikacja mobilna) — bez dodatkowej konfiguracji.
  const tokens = await listExpoPushTokensForUsers(admin, recipients).catch(() => []);
  const expo = await sendExpoPush(tokens, { title, body, data: { url: "/chat" } });

  return NextResponse.json({ sent: expo.sent, expo, web, notified });
}
