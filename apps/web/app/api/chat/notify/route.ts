import { listExpoPushTokensForUsers } from "@e-logistic/api";
import { createSupabaseAdminClient } from "@e-logistic/api/admin";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sendExpoPush } from "@/lib/expoPush";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  threadId: z.string().uuid().nullable().optional(),
  preview: z.string().min(1).max(140),
});

/**
 * #291: push (Expo) do odbiorców wiadomości czatu — wywoływane fire-and-forget
 * przez nadawcę po udanym INSERT. Autoryzacja: Bearer access token Supabase
 * (działa z aplikacji mobilnej i z panelu). Odbiorcy: członkowie wątku, a dla
 * kanału ogólnego — wszyscy aktywni członkowie firmy (bez nadawcy).
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

  // Firma nadawcy (aktywne członkostwo) — spójnie z RLS czatu.
  const { data: membership } = await admin
    .from("memberships")
    .select("company_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (!membership) return NextResponse.json({ error: "Brak firmy." }, { status: 403 });
  const companyId = membership.company_id as string;

  let recipients: string[] = [];
  if (threadId) {
    // Wątek musi należeć do firmy nadawcy, a nadawca być jego członkiem/zarządem.
    const { data: thread } = await admin
      .from("chat_threads")
      .select("company_id")
      .eq("id", threadId)
      .maybeSingle();
    if (!thread || thread.company_id !== companyId) {
      return NextResponse.json({ error: "Nieznany kanał." }, { status: 404 });
    }
    const { data: members } = await admin
      .from("chat_members")
      .select("user_id")
      .eq("thread_id", threadId);
    recipients = (members ?? []).map((m) => m.user_id as string);
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

  const tokens = await listExpoPushTokensForUsers(admin, recipients);
  const { sent } = await sendExpoPush(tokens, {
    title: "💬 Nowa wiadomość",
    body: preview,
    data: { url: "/chat" },
  });
  return NextResponse.json({ sent });
}
