import { getActiveMembership } from "@e-logistic/api";
import { type AppModule, effectivePermission, type PermissionLevel } from "@e-logistic/core";
import { useEffect, useState } from "react";
import { getSupabase, supabaseConfigured } from "./supabase";

/**
 * #278: poziom uprawnień zalogowanego do modułu (matryca właściciela).
 *
 * Fail-open: offline/bez danych → "edit". Kierowca w trasie nie może zostać
 * zablokowany przez brak zasięgu — to zostaje i jest świadome.
 *
 * [#393] SPROSTOWANIE. Poprzednia wersja tego komentarza kończyła się słowami
 * „serwerowe RLS i tak pilnuje zapisu". **To nieprawda.** Żadna polityka w repo
 * nie czyta `memberships.permissions` — kolumna istnieje (0062/0063) i jest
 * używana przez `company_members()` oraz `create_invite`, ale ani jedna reguła
 * INSERT/UPDATE się do niej nie odwołuje.
 *
 * Fałszywa deklaracja zabezpieczenia jest groźniejsza niż jego brak: następna
 * osoba czyta ją, uznaje ścieżkę za osłoniętą i nie dokłada kontroli tam, gdzie
 * jej naprawdę nie ma.
 *
 * CO NAPRAWDĘ OGRANICZA członka firmy (i to działa, jest przetestowane):
 *   • RLS zawęża zapis do WŁASNYCH wierszy we WŁASNEJ firmie
 *     (`driver_id = auth.uid() and is_member_of(company_id)`),
 *   • role `owner`/`dispatcher` bramkują operacje zarządcze.
 *
 * CZEGO NIE MA: poziom „view" z matrycy jest wyłącznie **wskazówką dla
 * interfejsu**. Ekrany mobilne go respektują (`perm === "view"` chowa formularz),
 * web nie, a baza nie zna go w ogóle. Członek z poziomem „view" może więc dodać
 * własne tankowanie przez panel albo wprost przez API.
 *
 * Egzekwowanie w bazie wymaga decyzji projektowej, nie samej poprawki: trzeba
 * ustalić, czy poziom rozstrzyga o INSERT, o UPDATE cudzych wierszy, czy o obu,
 * i co ma się stać z wpisami zakolejkowanymi offline zanim uprawnienie odebrano.
 * Do czasu tej decyzji: **traktować matrycę jako wygodę interfejsu, nie granicę
 * bezpieczeństwa.** Opisane w docs/SECURITY-RLS.md.
 */
export function usePermission(module: AppModule): PermissionLevel {
  const [level, setLevel] = useState<PermissionLevel>("edit");
  useEffect(() => {
    if (!supabaseConfigured) return;
    getActiveMembership(getSupabase())
      .then((m) => {
        if (m) setLevel(effectivePermission(m.role, m.modules, m.permissions, module));
      })
      .catch(() => {});
  }, [module]);
  return level;
}
