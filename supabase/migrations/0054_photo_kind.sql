-- 0054: typ załącznika (`kind`) jako kolumna GENEROWANA z `caption` — twarde filtrowanie po typie.
-- Aplikacja NIE zmienia zapisu (kategoria dalej trafia do `caption`, #248); Postgres wylicza
-- `kind` i utrzymuje indeks. Dzięki temu:
--   • zero zmian w insertach (bezpieczne przed i po migracji),
--   • backfill istniejących zdjęć automatyczny (kolumna generowana liczy się dla wszystkich wierszy),
--   • POD wykrywane po prefiksie 'POD' (patrz packages/core/pod.ts).
-- Idempotentne (`if not exists`).

alter table order_photos
  add column if not exists kind text generated always as (
    case
      when caption like 'POD%' then 'pod'
      when caption = 'CMR' then 'cmr'
      when caption = 'Dokument' then 'document'
      when caption = 'Inne' then 'other'
      else 'cargo'
    end
  ) stored;

create index if not exists order_photos_kind_idx on order_photos(kind);
