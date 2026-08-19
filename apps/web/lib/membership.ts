"use client";

import { getActiveMembership } from "@e-logistic/api";
import { invalidateMembershipQueries } from "@/lib/queryClient";

type SbClient = Parameters<typeof getActiveMembership>[0];
type Membership = Awaited<ReturnType<typeof getActiveMembership>>;

/**
 * Cache członkostwa po stronie klienta — eliminuje wielokrotne `getActiveMembership`
 * przy jednym wejściu na stronę (layout + strona + komponenty + useFleet potrafiły
 * odpytać 4–5×). Krótki TTL (20 s) + dedup zapytania w locie zachowuje świeżość
 * (np. po onboardingu firmy) bez nadmiaru round-tripów.
 */
const TTL_MS = 20_000;
let cache: { at: number; value: Membership } | null = null;
let inflight: Promise<Membership> | null = null;

export async function getCachedMembership(client: SbClient): Promise<Membership> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.value;
  if (inflight) return inflight;
  inflight = getActiveMembership(client)
    .then((value) => {
      cache = { at: Date.now(), value };
      inflight = null;
      return value;
    })
    .catch((e) => {
      inflight = null;
      throw e;
    });
  return inflight;
}

/**
 * Czyści cache (np. po utworzeniu firmy / zmianie uprawnień / wylogowaniu).
 *
 * Od migracji części panelu na TanStack Query ten moduł NIE jest już jedynym miejscem,
 * w którym membership leży w pamięci — kopia siedzi też pod kluczem `["membership"]`.
 * Czyszczenie tylko jednego z dwóch cache'y dawało stan, w którym świeżo utworzony
 * właściciel widział na zmigrowanych ekranach „brak firmy" jeszcze przez `staleTime`.
 * Dlatego obie ścieżki unieważnia jedna funkcja: wywołujący ma powiedzieć „członkostwo
 * się zmieniło", a nie pamiętać listę cache'y.
 */
export function clearMembershipCache() {
  cache = null;
  inflight = null;
  invalidateMembershipQueries();
}
