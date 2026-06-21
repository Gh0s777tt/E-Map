-- ════════════════════════════════════════════════════════════════════
--  E-LOGISTIC · 0017 · Tankowanie „do pełna" (full tank)
--  Flaga potrzebna do poprawnego liczenia spalania metodą full-to-full
--  (tank-to-tank). Kolumna na fuel_logs i adblue_logs (wspólny mapper).
-- ════════════════════════════════════════════════════════════════════

alter table fuel_logs   add column if not exists is_full boolean not null default true;
alter table adblue_logs add column if not exists is_full boolean not null default true;
