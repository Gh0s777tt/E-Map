-- ════════════════════════════════════════════════════════════════════
--  E-LOGISTIC · 0009 · Pojazd: marka, VIN, ubezpieczyciel
--  Marka (z listy), numer VIN, firma ubezpieczająca (OC).
-- ════════════════════════════════════════════════════════════════════

alter table vehicles add column if not exists make    text;
alter table vehicles add column if not exists vin     text;
alter table vehicles add column if not exists insurer text;
