-- ════════════════════════════════════════════════════════════════════
--  0072 · #317 Trip: zdarzenie „przeładunek" (transshipment) —
--  rejestracje pojazdu źródłowego i docelowego (tekst; auta mogą być
--  spoza floty, np. podwykonawca). Reszta pól jak dotąd: lokalizacja,
--  waga, licznik. Kolumny nullable — istniejące wiersze bez zmian.
-- ════════════════════════════════════════════════════════════════════

alter table trip_events add column if not exists from_vehicle_reg text;
alter table trip_events add column if not exists to_vehicle_reg text;

-- Nowa wartość enuma akcji Trip (istniejące wartości bez zmian).
alter type trip_action add value if not exists 'transshipment';
