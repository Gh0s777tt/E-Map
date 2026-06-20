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
- **Migracje 0001 + 0002:** ✅ zastosowane na żywej bazie (przez Management API, **24 tabele** w `public`, RLS aktywne).
- **Realtime:** ✅ `map_reports` w publikacji `supabase_realtime`.
- **Zweryfikowane E2E:** rejestracja usera → trigger `handle_new_user` (profil) → logowanie → RPC `bootstrap_company` (firma + membership `owner`).
- **Env:** klucze (URL + anon + service_role) w `apps/web/.env.local` (gitignored). Token zarządczy i `service_role` **nie trafiają do repo**.
- ⏳ **TODO `app.card_key`:** Management API odmawia `alter database ... set` własnego parametru — klucz szyfrowania PIN-ów wdrożymy przez **Supabase Vault** lub prywatną tabelę config przy budowie UI kart paliwowych.

## Klucz szyfrowania PIN-ów

PIN-y kart paliwowych są szyfrowane (`pgp_sym_encrypt`) i odszyfrowywane wyłącznie przez
funkcję `fuel_card_pin()` — dostęp tylko dla roli `owner`, z wpisem do `audit_log`.

- **Produkcja:** klucz w **Supabase Vault**; funkcję `_card_key()` podmienić na odczyt z Vault.
- **Dev:** ustaw klucz sesyjnie/bazowo:
  ```sql
  alter database postgres set app.card_key = '<silny-losowy-klucz>';
  ```

## Role i RLS (skrót)

- `developer` — globalny wgląd (audytowany).
- `owner` — pełen dostęp do swojej firmy (w tym PIN-y kart).
- `dispatcher` — firma bez PIN-ów kart.
- `driver` — tylko własne formularze + przypisany pojazd.

Nowa firma powstaje przez RPC `bootstrap_company(name)` (tworzy firmę + członkostwo `owner`).

## Realtime

Włącz publikację dla `map_reports` (zgłoszenia na żywo):

```sql
alter publication supabase_realtime add table map_reports;
```
