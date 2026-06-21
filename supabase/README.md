# Supabase — E‑Logistic

Schema, RLS i funkcje bazodanowe (Postgres 17 + PostGIS).

## Migracje

Migracje `0001`–`0025` (chronologicznie). Kluczowe kamienie:

| Plik | Zawartość |
|:--|:--|
| `0001_init_schema.sql` | rozszerzenia (PostGIS, pgcrypto), enumy, tabele, indeksy, triggery |
| `0002_rls.sql` | funkcje pomocnicze, polityki RLS, bootstrap firmy |
| `0003_card_pin.sql` | Vault `card_key` + `fuel_card_pin` (audytowany) |
| `0013_rls_hardening.sql` | utwardzenie RLS — `developer` odcięty od danych firm i PIN-ów |
| `0021_push_sub_company_check.sql` | izolacja multi-tenant push (`company_id` + `to authenticated`) |
| `0022_driver_identity_encryption.sql` | szyfrowanie tożsamości kierowcy (PII) |
| `0024_pii_encryption.sql` | szyfrowanie PII `profiles`/`driver_profiles`/`invites` (Vault `pii_key`) |
| `0025_fuel_card_pin_guard.sql` | przywrócenie guardu `if cid is null` w `fuel_card_pin` |

> **Konwencja:** zastosowane migracje są **niezmienne** (zapis historii) — poprawki idą zawsze
> jako nowa migracja forward-only.
>
> **Znana kolizja numeracji (historyczna, nieszkodliwa):** po dwa pliki `0017_*` i `0018_*`
> (`0017_fuel_full_tank` + `0017_notifications`; `0018_fix_expiry_onconflict` + `0018_vehicle_tanks`).
> Dotykają **różnych obiektów**, a kolejność alfabetyczna jest poprawna (`notifications` przed
> `fix_expiry_onconflict`, które od niego zależy). Pozostawione bez zmian; nowe numery bez luk i kolizji.

## Zastosowanie

```bash
# 1. Zaloguj i podlinkuj projekt
supabase login
supabase link --project-ref <PROJECT_REF>

# 2. Wypchnij migracje
supabase db push

# lub lokalnie (Docker):
supabase start
supabase db reset
```

## Stan wdrożenia

- **Projekt:** `E-Logistic` (ref `jcmqbqvsvtjtxvmopcxp`, region `eu-central-1`) — `ACTIVE_HEALTHY`.
- **Migracje 0001–0025:** ✅ zastosowane na żywej bazie (RLS aktywne na wszystkich tabelach danych).
- **Realtime:** ✅ `map_reports` w publikacji `supabase_realtime`.
- **Vault:** ✅ `card_key` (PIN-y kart) oraz `pii_key` (PII profili/kierowców/zaproszeń — odrębny klucz, 0024) — utworzone jednorazowo w Supabase Vault.
- **Zweryfikowane E2E:** rejestracja → trigger profilu → login → `bootstrap_company` → zapis tankowania (RLS) → **PIN: owner ustawia, kierowca odczytuje (audytowane)**.
- **Env:** klucze (URL + anon + service_role) w `apps/web/.env.local` (gitignored). Token zarządczy i `service_role` **nie trafiają do repo**.

## Klucz szyfrowania PIN-ów (Vault)

PIN-y kart są szyfrowane `pgp_sym_encrypt` (pgcrypto w schemacie `extensions`). Klucz trzymany
w **Supabase Vault**; `public._card_key()` czyta go z `vault.decrypted_secrets`.

- **Sekret (jednorazowo, wartość NIE w repo):**
  ```sql
  select vault.create_secret('<silny-losowy-klucz>', 'card_key', 'E-Logistic PIN key');
  ```
- **Dostęp do PIN-u:** `fuel_card_pin(card)` — **każdy aktywny członek firmy** (kierowca musi znać
  PIN, by zapłacić w automacie); **developer NIE** (odcięty w 0013); każdy odczyt w `audit_log`.
- **Ustawianie PIN-u:** `fuel_card_set_pin(card, pin)` — tylko `owner`.

## Role i RLS (skrót)

- `developer` — tylko diagnostyka (`dev_stats`); **odcięty od danych firm i PIN-ów** (0013).
- `owner` — pełen dostęp; **ustawia** PIN-y kart.
- `dispatcher` / `driver` — firma; **odczyt** PIN-ów kart (kierowca płaci w automacie), audytowany.
- `driver` — tylko własne formularze + przypisany pojazd.

Nowa firma powstaje przez RPC `bootstrap_company(name)` (tworzy firmę + członkostwo `owner`).

## Realtime

Włącz publikację dla `map_reports` (zgłoszenia na żywo):

```sql
alter publication supabase_realtime add table map_reports;
```
