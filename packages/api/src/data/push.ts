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
 * Ile subskrypcji przypada na jednego odbiorcę: przeglądarka służbowa, prywatna,
 * drugi komputer, plus wpisy, których przeglądarka nie zdążyła unieważnić.
 *
 * Z zapasem z tego samego powodu co przy tokenach Expo: wiersze wracają bez
 * kolejności, więc jeden użytkownik z zaległymi subskrypcjami wypchnąłby
 * z wyniku CUDZE. Sufit to granica, nie rozmiar pobrania — podniesienie go nic
 * nie kosztuje, a zbyt niskie ustawienie kosztuje niedostarczone powiadomienie.
 */
const PUSH_SUBS_PER_USER = 10;

/**
 * Sufit przy wysyłce do CAŁEJ firmy. Nie ma tu listy odbiorców, z której dałoby
 * się go wyliczyć, więc musi pokryć załogę największego przewoźnika razem z jej
 * urządzeniami — a że to jedyny wariant ze stałą liczbą, ma mieć wyraźny zapas.
 */
const PUSH_SUBS_COMPANY_LIMIT = 5000;

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
  opts?: { companyId?: string; userIds?: string[]; limit?: number },
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
  /*
   * Sufit dobierany do WĘŻSZEGO z filtrów. Gdy znamy adresatów, próg wynika
   * z ich liczby i nie da się go przekroczyć wzrostem firmy — a to on decyduje,
   * czy powiadomienie w ogóle dojdzie. Ciche obcięcie oznacza tu kierowcę,
   * któremu przydział zlecenia nie przyszedł na telefon, i nikogo, kto by to
   * zgłosił: brak powiadomienia jest nieodróżnialny od braku zdarzenia.
   */
  const limit =
    opts?.limit ??
    (hasUsers ? (opts?.userIds?.length ?? 0) * PUSH_SUBS_PER_USER : PUSH_SUBS_COMPANY_LIMIT);
  const { data, error } = await q.limit(limit);
  if (error) throw error;
  return (data ?? []) as StoredPushSubscription[];
}
