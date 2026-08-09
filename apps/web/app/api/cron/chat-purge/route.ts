/**
 * [#374] Fizyczne kasowanie wiadomości czatu: wygasłych i miękko usuniętych.
 *
 * DLACZEGO TO ISTNIEJE: polityka RLS potrafi wiadomość UKRYĆ, ale nigdy jej nie
 * usuwa. Sam filtr `expires_at > now()` zostawiałby treść w tabeli, w kopiach
 * zapasowych i w replikacji — i sprzedawanie tego użytkownikowi jako „wiadomość
 * znika" byłoby nieprawdą. Ten przebieg zamienia ukrycie w faktyczne usunięcie.
 *
 * Czego ten cron NIE naprawia i o czym trzeba mówić wprost:
 *  • treść wysłana pushem dotarła już na ekran blokady telefonu i tam zostaje,
 *  • klienci, którzy byli online, mają ją w pamięci do czasu odświeżenia,
 *  • podpisany URL zdjęcia wystawiony wcześniej działa jeszcze przez godzinę.
 */

import { timingSafeEqual } from "node:crypto";
import { createSupabaseAdminClient } from "@e-logistic/api/admin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Ile dni trzymamy miękko usunięte wiadomości, zanim znikną fizycznie.
 * Okno karencji, nie retencja: daje szansę na przywrócenie po pomyłce
 * i pozwala klientom offline zsynchronizować fakt usunięcia.
 */
const SOFT_DELETE_GRACE_DAYS = 30;

/** Ile wierszy bierzemy na jeden przebieg. Reszta poczeka na kolejny (co 15 min). */
const BATCH_LIMIT = 2000;

/**
 * Ile identyfikatorów wchodzi do jednego zapytania.
 *
 * `postgrest-js` buduje `in()` jako parametr URL, nie ciało żądania — każdy UUID
 * to 36 znaków plus separator. Przy 5000 pozycjach URL rósł do ~195 KB, czyli
 * wielokrotnie ponad limit bramy, która odpowiadała 414. Efekt: cron wywracał
 * się przy KAŻDYM przebiegu i nic nigdy nie zostało fizycznie usunięte —
 * dokładnie odwrotnie niż obiecuje nagłówek tego pliku.
 */
const DELETE_CHUNK = 200;

/** Dzieli tablicę na partie o zadanym rozmiarze. */
function chunked<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export async function GET(req: Request) {
  // [#376] Fail-CLOSED. Wcześniejsze `if (secret)` pomijało autoryzację, gdy
  // zmienna nie była ustawiona — a każdy deploy Preview ma publiczny URL i
  // dziedziczy produkcyjny `SUPABASE_SERVICE_ROLE_KEY`. Anonim mógł uruchomić
  // tę trasę na produkcyjnej bazie. Ten sam wzorzec co /api/cron/notify.
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET nieustawiony." }, { status: 503 });
  // Porównanie w stałym czasie — chroni sekret przed atakiem czasowym.
  const auth = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (auth.length !== expected.length || !timingSafeEqual(auth, expected)) {
    return NextResponse.json({ error: "Brak autoryzacji." }, { status: 401 });
  }

  try {
    const admin = createSupabaseAdminClient();
    const nowIso = new Date().toISOString();
    const graceIso = new Date(
      Date.now() - SOFT_DELETE_GRACE_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    // Ścieżki zbieramy PRZED skasowaniem wierszy — po `delete` nie ma już czego
    // zapytać, a plik zostałby w Storage na zawsze.
    const { data: doomed, error: selErr } = await admin
      .from("messages")
      .select("id, company_id, photo_path")
      .or(`expires_at.lt.${nowIso},deleted_at.lt.${graceIso}`)
      .limit(BATCH_LIMIT);
    if (selErr) throw selErr;

    const rows = doomed ?? [];
    const ids = rows.map((m) => m.id);

    // Kandydaci na usunięcie ze Storage: TYLKO załączniki czatu tej samej firmy.
    // Bez tego filtra wiersz ze sfałszowaną ścieżką (patrz migracja 0096)
    // kierowałby cron na dowolny plik w buckecie.
    const candidates = rows
      .filter(
        (m): m is typeof m & { photo_path: string } =>
          typeof m.photo_path === "string" && m.photo_path.startsWith(`${m.company_id}/chat/`),
      )
      .map((m) => m.photo_path);

    // Kasujemy WIERSZE najpierw. Odwrotna kolejność (jak było) zostawiała bazę
    // z wpisami wskazującymi nieistniejące pliki, gdy DELETE się nie powiódł.
    // Osierocony plik jest mniejszym problemem niż wiadomość bez zdjęcia.
    let removed = 0;
    for (const chunk of chunked(ids, DELETE_CHUNK)) {
      const { error: delErr, count } = await admin
        .from("messages")
        .delete({ count: "exact" })
        .in("id", chunk);
      if (delErr) throw delErr;
      removed += count ?? chunk.length;
    }

    // Plik bywa WSPÓŁDZIELONY: przekazanie wiadomości tworzy kopię wskazującą
    // tę samą ścieżkę. Kasujemy dopiero to, na co nie wskazuje już żaden żywy
    // wiersz — inaczej wygaśnięcie oryginału zabierało zdjęcie kopii.
    let photosRemoved = 0;
    const orphans: string[] = [];
    for (const chunk of chunked(candidates, DELETE_CHUNK)) {
      const { data: stillUsed, error: useErr } = await admin
        .from("messages")
        .select("photo_path")
        .in("photo_path", chunk);
      if (useErr) throw useErr;
      const used = new Set((stillUsed ?? []).map((r) => r.photo_path));
      orphans.push(...chunk.filter((p) => !used.has(p)));
    }
    for (const chunk of chunked(orphans, DELETE_CHUNK)) {
      // Nieudane sprzątanie Storage nie może wywrócić przebiegu — wiersze są
      // już skasowane, a osierocony plik da się posprzątać później.
      const { error } = await admin.storage.from("cargo-photos").remove(chunk);
      if (!error) photosRemoved += chunk.length;
    }

    // `pending` mówi, czy zostały zaległości — przy stałym limicie partii bez
    // tego nie da się odróżnić „nic nie było do zrobienia" od „nie wyrobiliśmy się".
    return NextResponse.json({ removed, photosRemoved, pending: ids.length === BATCH_LIMIT });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Błąd czyszczenia czatu." },
      { status: 500 },
    );
  }
}
