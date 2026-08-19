/**
 * Jedno źródło kluczy zapytań TanStack Query w panelu (#310 → fala 2).
 *
 * Każdy klucz danych firmowych niesie `companyId`. To wymóg BEZPIECZEŃSTWA, nie
 * porządkowania importów: panel jest multi-tenant, a aktywne członkostwo potrafi
 * zmienić się BEZ przeładowania strony — `clearMembershipCache()` woła
 * `components/CompanyBanner.tsx` po utworzeniu firmy i `app/join/page.tsx` po
 * przyjęciu zaproszenia (ta funkcja unieważnia też klucz `membership()`, patrz
 * `lib/queryClient.ts` — sam `companyId` w kluczu nic by nie dał, gdyby wpis
 * `["membership"]` przeżył zmianę firmy). Gdyby klucz brzmiał samo `["contractors"]`, wpis w cache
 * przeżyłby tę zmianę i panel przez `staleTime` (30 s w `components/QueryProvider.tsx`)
 * pokazywałby dane POPRZEDNIEJ firmy — wyciek między najemcami widoczny gołym okiem,
 * którego RLS już nie zatrzyma, bo wiersze zdążyły dotrzeć do przeglądarki.
 * Z `companyId` w kluczu inna firma to po prostu inny wpis cache i nie ma czego mylić.
 *
 * Dotyczy to również list, których zapytanie NIE przyjmuje `companyId` i opiera się
 * na RLS (karty paliwowe, wydatki kierowcy) — zasięg wiersza zmienia się razem
 * z członkostwem, więc klucz musi się zmienić tak samo.
 */

/** Firma z aktywnego członkostwa. `null` = użytkownik bez firmy albo jeszcze nie wiadomo. */
export type CompanyScope = string | null;

export const queryKeys = {
  /** Aktywne członkostwo — jedyny klucz firmowy bez `companyId`, bo to on go dostarcza. */
  membership: () => ["membership"] as const,
  /** Wydatki kierowców (zasięg z RLS: kierowca widzi swoje, zarząd całą firmę). */
  driverExpenses: (company: CompanyScope) => ["driver-expenses", company] as const,
  contractors: (company: CompanyScope) => ["contractors", company] as const,
  /** Lista członków firmy — RPC `company_members`, zasięg z RLS. */
  companyMembers: (company: CompanyScope) => ["company-members", company] as const,
  documents: (company: CompanyScope) => ["documents", company] as const,
  serviceTasks: (company: CompanyScope) => ["service-tasks", company] as const,
  /** Bieżące przebiegi per pojazd (max licznika z tankowań) — osobno, bo zmieniają je tankowania. */
  odometers: (company: CompanyScope) => ["odometers", company] as const,
  fuelCards: (company: CompanyScope) => ["fuel-cards", company] as const,
  vehicles: (company: CompanyScope) => ["vehicles", company] as const,
  auditLog: (company: CompanyScope) => ["audit-log", company] as const,
  /** Ranking kierowców liczony z zamówień i checklist ostatnich 90 dni. */
  driverScoring: (company: CompanyScope) => ["driver-scoring", company] as const,
  /**
   * Ceny ON w UE z `/api/fuel-eu` — dane publiczne, identyczne dla każdej firmy.
   * Jedyny klucz bez najemcy, bo nie ma tu czego rozdzielać.
   */
  euFuelPrices: () => ["eu-fuel-prices"] as const,
} as const;

/**
 * Prefiksy do unieważniania z ekranów, których jeszcze NIE przepięto na TanStack Query.
 *
 * Migracja idzie falami i to tworzy asymetrię, która sama z siebie psuje dane: pojazdy
 * zmienia wyłącznie niezmigrowane `/pojazdy` (dodanie, edycja, usunięcie, import floty),
 * a rejestr kontrahentów rośnie „organicznie" z `/zlecenia` i `/faktury` (`upsertContractor`
 * z nadawcy/odbiorcy i z nabywcy faktury). Żaden z tych ekranów nie ma własnego zapytania
 * do unieważnienia, więc bez tego wpisy w cache zostawały świeże przez `staleTime` i:
 * nowy ciągnik nie pojawiał się na liście „Pojazd" przy karcie paliwowej, a nowy kontrahent
 * znikał z rejestru — po czym dyspozytor dodawał go ręcznie i `upsertContractor` przy
 * różnicy w NIP/adresie robił DRUGI wpis.
 *
 * Świadomie prefiksem, a nie pełnym kluczem: TanStack dopasowuje klucze po prefiksie,
 * więc `["vehicles"]` trafia w każdy `["vehicles", <firma>]`. Te ekrany nie zawsze trzymają
 * `companyId` w stanie (usuwanie pojazdu go nie potrzebuje), a nadmiarowe unieważnienie
 * jest tanie i NIE narusza izolacji najemców — samo tylko oznacza wpis jako nieświeży,
 * a ponowne pobranie i tak idzie kluczem z `companyId` i przez RLS.
 */
export const queryKeyPrefixes = {
  vehicles: () => ["vehicles"] as const,
  contractors: () => ["contractors"] as const,
} as const;
