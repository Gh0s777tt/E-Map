# 🔒 Audyt RLS — bramka izolacji multi-tenant

Automatyczna, **powtarzalna** kontrola żywej bazy pod kątem izolacji między firmami.
Operacjonalizuje ustalenia jednorazowego [audytu z 2026‑06‑21](AUDIT-2026-06-21.md): zamiast
ręcznego przeglądu polityk po każdej migracji, jeden skrypt sprawdza prod i zwraca kod wyjścia
nadający się do CI. Migracje aplikujemy bezpośrednio na prod, więc realne ryzyko to **rozjazd**
żywych polityk z plikami — ten skrypt go wyłapie.

## Uruchomienie

```bash
NODE_PATH=.git/tmpdeps/node_modules node scripts/audit-rls.mjs
# albo:  pnpm audit:rls
```

Połączenie jak w [apply-migration.mjs](../scripts/apply-migration.mjs): pooler
`aws-1-eu-central-1` + `SUPABASE_DB_PASSWORD` z `apps/web/.env.local` (lub `SUPABASE_DB_URL`).
Skrypt jest **tylko do odczytu** (pyta katalog systemowy `pg_*`, nic nie zmienia).
Kod wyjścia: `0` = czysto, `1` = wykryto problem, `2` = błąd połączenia.

## W CI (GitHub Actions)

Job **Audyt RLS** w [.github/workflows/ci.yml](../.github/workflows/ci.yml) odpala `pnpm audit:rls`
przy każdym `push`/`pull_request` na `main`. Łączenie przez sekret repo **`SUPABASE_DB_URL`**:

```
postgresql://postgres.<REF>:<HASŁO>@aws-1-eu-central-1.pooler.supabase.com:5432/postgres
```

Skrypt rozkłada URL ręcznie i wymusza `ssl: { rejectUnauthorized: false }` (pooler ma
self-signed chain), więc sufiks `?sslmode=...` nie ma znaczenia. Gdy sekret nie jest ustawiony,
job pomija się z ostrzeżeniem (nie blokuje PR). Sekret ustawia się raz:

```bash
gh secret set SUPABASE_DB_URL --repo <owner>/<repo>   # wartość ze stdin (bez śladu w historii)
```

## Co sprawdza ([scripts/audit-rls.mjs](../scripts/audit-rls.mjs))

| # | Reguła | Dlaczego |
|---|--------|----------|
| 1 | RLS włączone na każdej tabeli `public` | Tabela bez RLS = każdy zalogowany czyta cudze dane. |
| 2 | Każda tabela z RLS ma ≥1 policy | RLS bez policy = ciche deny‑all = ukryty bug. |
| 3 | Brak `USING (true)` na SELECT/ALL | Szeroki odczyt = wyciek między firmami (poza tabelami wspólnotowymi). |
| 4 | Zapisy ograniczone do autora/roli | INSERT→`WITH CHECK`, UPDATE/DELETE→`USING`; `true` = każdy może pisać. |
| 5 | `SECURITY DEFINER` ma `search_path` | Brak przypięcia = ryzyko hijacku przez podmianę ścieżki schematu. |
| 6 | Helpery `is_member_of` / `has_role` istnieją i są `SECURITY DEFINER` | Filary RLS — bez nich polityki nie izolują. |

Obiekty należące do **rozszerzeń** (PostGIS: `spatial_ref_sys`, `st_*`) są pomijane
automatycznie (`pg_depend deptype='e'`) — zarządza nimi Supabase, nie nasze migracje.

## Tabele wspólnotowe (świadomy `USING (true)`)

Cztery tabele są czytane globalnie **z założenia** — to dane rynkowe/społecznościowe **bez
`company_id`**. Odczyt globalny jest poprawny; integralność opiera się na ograniczeniu **zapisów**
do autora/roli (krok 4 to egzekwuje). Lista jest jawna w skrypcie (`GLOBAL_READ_OK`) — dodanie
nowej pozycji wymaga świadomej decyzji.

| Tabela | Zawartość | Zapis ograniczony do |
|--------|-----------|----------------------|
| `fuel_prices` | ceny paliw (crowdsourcing) | `reported_by = auth.uid()` |
| `map_reports` | zgłoszenia na mapie (wypadki/policja/wagi) | autor lub `is_developer()` |
| `pois` | katalog POI (stacje, parkingi) | `is_developer()` |
| `poi_reviews` | opinie o POI | autor lub `is_developer()` |

## Ostatni wynik (2026‑06‑27, #195)

```
Tabele public: 41 (rozszerzeń: 1) · policy: 97 · SECDEF fn: 31
✓ Pokrycie RLS: 40/40 tabel (RLS + ≥1 policy); 4 oznaczone [wspólnotowa]
WYNIK: ✓ izolacja multi-tenant spójna (brak błędów)
```

Wszystkie tabele firmowe (`orders`, `invoices`, `invoice_items`, `documents`, `drivers`,
`vehicles`, `fuel_cards`, `fuel_logs`, …) izolują przez `is_member_of` (odczyt) i `has_role`
(zapis) — bezpośrednio przez `company_id` lub pośrednio przez firmę rodzica (np. `invoice_items`
→ `invoices.company_id`). Wszystkie 31 naszych funkcji `SECURITY DEFINER` mają przypięty
`search_path`.
