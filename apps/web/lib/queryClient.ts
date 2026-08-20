"use client";

import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";

/**
 * Uchwyt do zamontowanego `QueryClient` dla kodu, który NIE jest komponentem.
 *
 * Powód jest konkretny, nie architektoniczny: `clearMembershipCache()` w
 * [`lib/membership.ts`](./membership.ts) to zwykła funkcja modułowa i po utworzeniu firmy
 * czyściła wyłącznie swój własny cache. Wpis `["membership"]` w TanStack Query zostawał
 * nietknięty, a `QueryProvider` żyje w layoucie grupy `(app)` — miękka nawigacja
 * (/pulpit → /kontrahenci) go NIE odmontowuje. Efekt: przez `staleTime` (30 s) zmigrowane
 * ekrany dalej widziały `membership = null`, czyli świeżo utworzony WŁAŚCICIEL dostawał
 * „brak dostępu", pusty formularz i „tryb podglądu". Przed migracją każdy `load()` czytał
 * membership po wyczyszczonym cache i widział nową firmę od razu.
 *
 * Rejestr jest jednoelementowy i celowo NIE jest singletonem klienta: `QueryProvider`
 * nadal tworzy własny `QueryClient` przez `useState`, więc wyjście poza grupę `(app)`
 * (wylogowanie, /join) dalej daje pusty cache przy powrocie — to jest bariera między
 * kontami na jednej przeglądarce i nie wolno jej znieść dla wygody unieważniania.
 */
let aktywny: QueryClient | null = null;

/** Wywołuje wyłącznie `QueryProvider` — przy montowaniu klienta i przy jego zdjęciu. */
export function setActiveQueryClient(client: QueryClient | null): void {
  aktywny = client;
}

/**
 * Zmieniło się aktywne członkostwo (utworzenie firmy, przyjęcie zaproszenia).
 *
 * Unieważniamy sam klucz `["membership"]`, a nie cały cache: każdy pozostały klucz niesie
 * `companyId`, więc po odświeżeniu członkostwa dane nowej firmy to po prostu INNE wpisy
 * cache, które muszą się dociągnąć same. Kasowanie wszystkiego wywalałoby przy okazji
 * dane wspólne (np. ceny ON w UE), których zmiana firmy nie dotyczy.
 *
 * Gdy panel `(app)` nie jest zamontowany (np. /join), nie ma czego unieważniać — przy
 * wejściu do panelu i tak powstanie świeży klient.
 */
export function invalidateMembershipQueries(): void {
  void aktywny?.invalidateQueries({ queryKey: queryKeys.membership() });
}
