-- 0056: czyszczenie danych firmy przez właściciela (strefa niebezpieczna w /settings, #259).
-- RPC `company_wipe_data(p_company, p_confirm_name)`:
--   • wyłącznie OWNER danej firmy (has_role) + potwierdzenie DOKŁADNĄ nazwą firmy,
--   • kasuje dane operacyjne, flotę, HR i katalogi firmy (dzieci lecą przez ON DELETE CASCADE:
--     rewizje logów, pozycje faktur, przypisania kart/kierowców),
--   • ZOSTAWIA: firmę, zespół (memberships), dziennik audytu (dopisuje wpis `company.wipe_data`),
--     tokeny push (web/expo) i profile użytkowników — konto działa dalej „na czysto",
--   • zwraca jsonb {tabela: liczba_usuniętych}.
-- Idempotentne (create or replace). Owner stosuje `supabase db push` (lub zastosowane via API).

create or replace function company_wipe_data(p_company uuid, p_confirm_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_counts jsonb := '{}'::jsonb;
  v_n bigint;
begin
  if not has_role(p_company, array['owner']::role[]) then
    raise exception 'Tylko właściciel firmy może wyczyścić jej dane.';
  end if;

  select name into v_name from companies where id = p_company;
  if v_name is null then
    raise exception 'Firma nie istnieje.';
  end if;
  if btrim(coalesce(p_confirm_name, '')) is distinct from btrim(v_name) then
    raise exception 'Potwierdzenie nie zgadza się z nazwą firmy.';
  end if;

  -- Kolejność wg kluczy obcych (najpierw tabele wskazujące na inne).
  delete from trip_events where company_id = p_company;
  get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('trip_events', v_n);

  delete from invoices where company_id = p_company;
  get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('invoices', v_n);

  delete from order_photos where company_id = p_company;
  get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('order_photos', v_n);

  delete from orders where company_id = p_company;
  get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('orders', v_n);

  delete from fuel_logs where company_id = p_company;
  get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('fuel_logs', v_n);

  delete from adblue_logs where company_id = p_company;
  get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('adblue_logs', v_n);

  delete from damage_claims where company_id = p_company;
  get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('damage_claims', v_n);

  delete from documents where company_id = p_company;
  get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('documents', v_n);

  delete from service_tasks where company_id = p_company;
  get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('service_tasks', v_n);

  delete from vehicle_costs where company_id = p_company;
  get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('vehicle_costs', v_n);

  delete from vehicle_defects where company_id = p_company;
  get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('vehicle_defects', v_n);

  delete from rates where company_id = p_company;
  get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('rates', v_n);

  delete from invites where company_id = p_company;
  get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('invites', v_n);

  delete from fuel_cards where company_id = p_company;
  get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('fuel_cards', v_n);

  delete from vehicles where company_id = p_company;
  get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('vehicles', v_n);

  delete from drivers where company_id = p_company;
  get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('drivers', v_n);

  delete from driver_payouts where company_id = p_company;
  get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('driver_payouts', v_n);

  delete from per_diem_trips where company_id = p_company;
  get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('per_diem_trips', v_n);

  delete from work_time_entries where company_id = p_company;
  get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('work_time_entries', v_n);

  delete from contractors where company_id = p_company;
  get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('contractors', v_n);

  delete from saved_places where company_id = p_company;
  get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('saved_places', v_n);

  delete from notifications where company_id = p_company;
  get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('notifications', v_n);

  insert into audit_log (company_id, actor_id, action, target, meta)
  values (p_company, auth.uid(), 'company.wipe_data', v_name, v_counts);

  return v_counts;
end;
$$;

revoke all on function company_wipe_data(uuid, text) from public, anon;
grant execute on function company_wipe_data(uuid, text) to authenticated;
