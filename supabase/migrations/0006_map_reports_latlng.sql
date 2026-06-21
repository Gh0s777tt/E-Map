-- ════════════════════════════════════════════════════════════════════
--  E-LOGISTIC · 0006 · lat/lng dla zgłoszeń na mapie (łatwy odczyt przez REST)
--  geo (geography) zostaje do zapytań przestrzennych; lat/lng do renderu.
-- ════════════════════════════════════════════════════════════════════

alter table map_reports add column if not exists lat double precision;
alter table map_reports add column if not exists lng double precision;
