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

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  try {
    const admin = createSupabaseAdminClient();
    const nowIso = new Date().toISOString();
    const graceIso = new Date(
      Date.now() - SOFT_DELETE_GRACE_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    // Zdjęcia trzeba zebrać PRZED skasowaniem wierszy — po `delete` nie ma już
    // czego zapytać o ścieżkę, a plik zostałby w Storage na zawsze.
    const { data: doomed, error: selErr } = await admin
      .from("messages")
      .select("id, photo_path")
      .or(`expires_at.lt.${nowIso},deleted_at.lt.${graceIso}`)
      .limit(5000);
    if (selErr) throw selErr;

    const paths = (doomed ?? [])
      .map((m) => m.photo_path)
      .filter((p): p is string => typeof p === "string" && p.length > 0);
    if (paths.length > 0) {
      // Nieudane sprzątanie Storage nie może zablokować kasowania wierszy —
      // osierocony plik jest mniejszym problemem niż treść żyjąca dalej w bazie.
      await admin.storage.from("cargo-photos").remove(paths);
    }

    const ids = (doomed ?? []).map((m) => m.id);
    let removed = 0;
    if (ids.length > 0) {
      const { error: delErr, count } = await admin
        .from("messages")
        .delete({ count: "exact" })
        .in("id", ids);
      if (delErr) throw delErr;
      removed = count ?? ids.length;
    }

    return NextResponse.json({ removed, photosRemoved: paths.length });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Błąd czyszczenia czatu." },
      { status: 500 },
    );
  }
}
