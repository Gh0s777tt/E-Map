/** Warstwa danych: subskrypcje Web Push (powiadomienia przeglądarki/OS). */
import type { TypedSupabaseClient as SupabaseClient } from "../client";

export interface PushSubscriptionJSON {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface StoredPushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
  user_id: string;
}

/** Zapisuje (upsert po `endpoint`) subskrypcję bieżącego użytkownika. RLS: user_id = auth.uid(). */
export async function savePushSubscription(
  client: SupabaseClient,
  sub: PushSubscriptionJSON,
  ctx: { userId: string; companyId?: string | null; userAgent?: string },
) {
  const { error } = await client.from("push_subscriptions").upsert(
    {
      user_id: ctx.userId,
      company_id: ctx.companyId ?? null,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      user_agent: ctx.userAgent ?? null,
    },
    { onConflict: "endpoint" },
  );
  if (error) throw error;
}

/** Usuwa subskrypcję po `endpoint` (np. po wyłączeniu push w przeglądarce). */
export async function deletePushSubscription(client: SupabaseClient, endpoint: string) {
  const { error } = await client.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) throw error;
}

/**
 * Subskrypcje do wysyłki (TYLKO serwer / service-role — omija RLS).
 * Filtruje po firmie i/lub konkretnych użytkownikach.
 *
 * GUARD anty-wyciek (audyt/QA): wymaga ≥1 efektywnego filtra (`companyId` lub
 * niepusty `userIds`). Bez filtra zapytanie service-role zwróciłoby subskrypcje
 * WSZYSTKICH firm (cross-tenant) — dlatego twardo rzucamy, zamiast polegać na
 * konwencji wołających. Świadomy broadcast należy zaimplementować osobno/jawnie.
 */
export async function listPushSubscriptionsForDelivery(
  admin: SupabaseClient,
  opts?: { companyId?: string; userIds?: string[] },
) {
  const hasCompany = Boolean(opts?.companyId);
  const hasUsers = Boolean(opts?.userIds?.length);
  if (!hasCompany && !hasUsers) {
    throw new Error(
      "listPushSubscriptionsForDelivery: wymagany filtr (companyId lub userIds) — ochrona przed wysyłką cross-tenant.",
    );
  }
  let q = admin.from("push_subscriptions").select("endpoint, p256dh, auth, user_id");
  if (opts?.companyId) q = q.eq("company_id", opts.companyId);
  if (opts?.userIds?.length) q = q.in("user_id", opts.userIds);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as StoredPushSubscription[];
}
