import { getActiveMembership } from "@e-logistic/api";
import { createSupabaseAdminClient } from "@e-logistic/api/admin";
import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/ratelimit";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ companyId: z.string().uuid() });

/**
 * [#400] Usunięcie PLIKÓW firmy z bucketów — brakujący element czyszczenia danych.
 *
 * `_company_purge` (migracja 0090) kasuje wiersze: `documents`, `order_photos`,
 * `messages`, `driver_expenses`, `checklist_submissions`. Nie kasuje ani jednego
 * OBIEKTU w Storage. Skany dokumentów kierowców, zdjęcia ładunku, zdjęcia z czatu
 * i paragony zostawały na dysku po „wyczyść dane firmy" i po usunięciu konta
 * właściciela — czyli dokładnie te dane osobowe, których usunięcia zażądano.
 *
 * DLACZEGO TO NIE MOGŁO BYĆ ZROBIONE W SQL-u. Kuszące `delete from storage.objects`
 * w migracji kasuje wyłącznie WIERSZ METADANYCH w Postgresie; plik leży w backendzie
 * obiektowym zarządzanym przez storage-api i po takim usunięciu zostaje tam jako blob
 * bez żadnego wpisu — stan gorszy niż wyjściowy, bo znika nawet ewidencja tego, co
 * należałoby posprzątać. Skasować plik można tylko przez API Storage, a to znaczy:
 * po stronie serwera, kluczem `service_role`.
 *
 * KOLEJNOŚĆ MA ZNACZENIE i jest wymuszona przez uprawnienia: tę trasę trzeba wołać
 * PRZED czyszczeniem bazy. Po usunięciu `memberships` nie da się już potwierdzić, że
 * proszący jest właścicielem tej firmy — a wtedy pliki zostają nieusuwalne dla
 * kogokolwiek poza kluczem serwisowym (polityki `documents_obj_delete`
 * i `cargo_photos_obj_delete` wymagają aktywnego członkostwa).
 *
 * Trasa jest idempotentna: powtórzenie na pustym już prefiksie kończy się `0`.
 */
export async function POST(request: Request) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Brak sesji." }, { status: 401 });

  if (!(await rateLimit(request, "purge-storage")).ok) {
    return NextResponse.json({ error: "Zbyt wiele żądań." }, { status: 429 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Błędne dane." }, { status: 400 });

  /*
   * Wyłącznie WŁAŚCICIEL i wyłącznie SWOJEJ firmy. Kasowanie plików jest
   * nieodwracalne, więc sprawdzamy `companyId` z żądania wobec członkostwa
   * z sesji, zamiast ufać temu, co przyszło w treści.
   */
  const m = await getActiveMembership(supabase).catch(() => null);
  if (m?.role !== "owner" || m.companyId !== parsed.data.companyId) {
    return NextResponse.json({ error: "Brak uprawnień." }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();
  const companyId = parsed.data.companyId;

  /*
   * Ścieżki są prefiksowane identyfikatorem firmy (`${companyId}/…` — patrz
   * `documents.ts` i `orderPhotos.ts`), więc listujemy prefiks i kasujemy partiami.
   * `list` zwraca maksymalnie `limit` pozycji, więc pętlimy do wyczerpania —
   * inaczej firma z tysiącami zdjęć zostałaby posprzątana tylko częściowo,
   * i to bez śladu.
   */
  const usuniete: Record<string, number> = {};
  for (const bucket of ["documents", "cargo-photos"] as const) {
    let razem = 0;
    for (let runda = 0; runda < 200; runda++) {
      const { data: pliki, error } = await admin.storage
        .from(bucket)
        .list(companyId, { limit: 100 });
      if (error) {
        return NextResponse.json(
          { error: `Nie udało się odczytać bucketu ${bucket}: ${error.message}` },
          { status: 502 },
        );
      }
      if (!pliki || pliki.length === 0) break;
      const sciezki = pliki.map((p) => `${companyId}/${p.name}`);
      const { error: delErr } = await admin.storage.from(bucket).remove(sciezki);
      if (delErr) {
        /*
         * Zwracamy błąd zamiast przemilczeć: wywołujący MUSI wiedzieć, że nie
         * może przejść do czyszczenia bazy. Gdyby poszedł dalej, pliki zostałyby
         * osierocone i nieusuwalne — a użytkownik dostałby potwierdzenie
         * usunięcia danych, które nadal leżą na dysku.
         */
        return NextResponse.json(
          { error: `Nie udało się usunąć plików z ${bucket}: ${delErr.message}`, usuniete },
          { status: 502 },
        );
      }
      razem += sciezki.length;
      // Krótsza partia niż limit oznacza koniec listy.
      if (pliki.length < 100) break;
    }
    usuniete[bucket] = razem;
  }

  return NextResponse.json({ usuniete });
}
