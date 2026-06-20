# Supabase — E‑Logistic

Schema, RLS i funkcje bazodanowe (Postgres 17 + PostGIS).

## Migracje

| Plik | Zawartość |
|:--|:--|
| `migrations/0001_init_schema.sql` | rozszerzenia (PostGIS, pgcrypto), enumy, tabele, indeksy, triggery |
| `migrations/0002_rls.sql` | funkcje pomocnicze, polityki RLS, bezpieczny PIN, bootstrap firmy |

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
- **Migracje 0001–0004:** ✅ zastosowane na żywej bazie (przez Management API, **24 tabele** w `public`, RLS aktywne).
- **Realtime:** ✅ `map_reports` w publikacji `supabase_realtime`.
- **Vault:** ✅ sekret `card_key` (klucz szyfrowania PIN-ów) utworzony jednorazowo w Supabase Vault.
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
  PIN, by zapłacić w automacie) + developer; każdy odczyt zapisywany w `audit_log`.
- **Ustawianie PIN-u:** `fuel_card_set_pin(card, pin)` — tylko `owner`.

## Role i RLS (skrót)

- `developer` — globalny wgląd (audytowany).
- `owner` — pełen dostęp; **ustawia** PIN-y kart.
- `dispatcher` / `driver` — firma; **odczyt** PIN-ów kart (kierowca płaci w automacie), audytowany.
- `driver` — tylko własne formularze + przypisany pojazd.

Nowa firma powstaje przez RPC `bootstrap_company(name)` (tworzy firmę + członkostwo `owner`).

## Realtime

Włącz publikację dla `map_reports` (zgłoszenia na żywo):

```sql
alter publication supabase_realtime add table map_reports;
```
