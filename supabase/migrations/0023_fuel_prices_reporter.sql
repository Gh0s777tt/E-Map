-- 0023: anty-spam cen paliwa (P2 z audytu). Wcześniej insert `with check (true)` pozwalał
-- każdemu zalogowanemu wstrzykiwać dowolne ceny bez powiązania z autorem.
-- Dodajemy reporter i wymagamy, by wstawiający był autorem (umożliwia moderację/usuwanie).

alter table public.fuel_prices add column if not exists reported_by uuid references auth.users (id);

drop policy if exists fuel_prices_insert on public.fuel_prices;
create policy fuel_prices_insert on public.fuel_prices
  for insert to authenticated
  with check (reported_by = auth.uid());

-- Autor może usunąć własny wpis (moderacja własnych zgłoszeń cen).
drop policy if exists fuel_prices_delete on public.fuel_prices;
create policy fuel_prices_delete on public.fuel_prices
  for delete to authenticated
  using (reported_by = auth.uid());
