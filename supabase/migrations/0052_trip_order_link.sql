-- 0052: powiązanie zdarzenia trasy ze zleceniem + auto-zamykanie zlecenia.
-- Kierowca przy załadunku/rozładunku wskazuje zlecenie (order_id). Gdy zlecenie ma
-- komplet (i 'load', i 'unload') → status przechodzi automatycznie na 'delivered'.
-- Koszt transportu per zlecenie liczony w aplikacji z okna load→unload (packages/core).
-- Idempotentne (if not exists / or replace / drop if exists) — bezpieczne przy ponownym uruchomieniu.

alter table trip_events
  add column if not exists order_id uuid references orders(id) on delete set null;

create index if not exists trip_events_order_idx on trip_events(order_id);

-- Auto-zamknięcie: po wstawieniu zdarzenia trasy z order_id sprawdź komplet load+unload
-- i przesuń status zlecenia na 'delivered' (tylko z new/assigned/in_progress — nie nadpisuje
-- delivered/invoiced/cancelled). SECURITY DEFINER: akcja systemowa (nie zależy od roli piszącego).
create or replace function auto_close_order_on_delivery()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.order_id is not null then
    if exists (select 1 from trip_events where order_id = new.order_id and action = 'load')
       and exists (select 1 from trip_events where order_id = new.order_id and action = 'unload')
    then
      update orders
        set status = 'delivered'
        where id = new.order_id
          and status in ('new', 'assigned', 'in_progress');
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_auto_close_order on trip_events;
create trigger trg_auto_close_order
  after insert on trip_events
  for each row
  execute function auto_close_order_on_delivery();
