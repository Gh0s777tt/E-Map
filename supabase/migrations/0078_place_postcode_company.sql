-- ════════════════════════════════════════════════════════════════════
--  0078 · #343 Kod pocztowy i nazwa firmy w miejscu (formularze).
--  • trip_events: postcode + company (miejsce załadunku/rozładunku),
--  • fuel_logs / adblue_logs: station_postcode + station_company (stacja).
--  Opcjonalne; kod pocztowy przydatny szczególnie dla UK (Anglia).
-- ════════════════════════════════════════════════════════════════════

alter table trip_events  add column if not exists postcode text;
alter table trip_events  add column if not exists company text;

alter table fuel_logs    add column if not exists station_postcode text;
alter table fuel_logs    add column if not exists station_company text;

alter table adblue_logs  add column if not exists station_postcode text;
alter table adblue_logs  add column if not exists station_company text;
