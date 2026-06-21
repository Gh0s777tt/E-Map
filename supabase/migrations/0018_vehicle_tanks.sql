-- ════════════════════════════════════════════════════════════════════
--  E-LOGISTIC · 0018 · Pojemności zbiorników pojazdu (paliwo + AdBlue)
-- ════════════════════════════════════════════════════════════════════

alter table vehicles add column if not exists fuel_tank_l   int;
alter table vehicles add column if not exists adblue_tank_l int;
