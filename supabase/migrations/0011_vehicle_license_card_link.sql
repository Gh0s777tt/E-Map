-- ════════════════════════════════════════════════════════════════════
--  E-LOGISTIC · 0011 · Licencja pojazdu + powiązanie karty z pojazdem
--  - vehicles.license_number: numer licencji transportowej przypisanej do auta
--  - fuel_cards.vehicle_id: karta przypisana do konkretnego pojazdu
-- ════════════════════════════════════════════════════════════════════

alter table vehicles   add column if not exists license_number text;
alter table fuel_cards add column if not exists vehicle_id uuid
  references vehicles(id) on delete set null;

create index if not exists fuel_cards_vehicle_idx on fuel_cards(vehicle_id);
