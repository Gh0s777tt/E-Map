-- ════════════════════════════════════════════════════════════════════
--  E-LOGISTIC · 0035 · Powiązanie kartoteki kierowcy z kontem (karta 360°)
--  `drivers.user_id` → konto aplikacji (auth.users) tego kierowcy. Dzięki temu
--  karta kierowcy łączy dokumenty/terminy (kartoteka) z historią zleceń
--  (orders.assigned_to). list_drivers zwraca user_id; driver_link_user ustawia link.
-- ════════════════════════════════════════════════════════════════════

alter table drivers add column if not exists user_id uuid references auth.users(id) on delete set null;

-- ── list_drivers: + user_id ─────────────────────────────────────────
create or replace function public.list_drivers(p_company uuid)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare res json;
begin
  if not public.has_role(p_company, array['owner','dispatcher']::role[]) then
    raise exception 'Brak uprawnień do kartoteki kierowców';
  end if;
  select coalesce(json_agg(r order by lname), '[]'::json) into res from (
    select
      json_build_object(
        'id', id,
        'first_name', case when first_name_enc is not null then pgp_sym_decrypt(first_name_enc, public._card_key()) else '' end,
        'last_name',  case when last_name_enc  is not null then pgp_sym_decrypt(last_name_enc,  public._card_key()) else '' end,
        'birth_date', case when birth_date_enc is not null then pgp_sym_decrypt(birth_date_enc, public._card_key()) else null end,
        'license_categories', coalesce(license_categories, '{}'),
        'qualifications', coalesce(qualifications, '{}'),
        'notes', notes,
        'license_expiry', license_expiry,
        'code95_expiry', code95_expiry,
        'medical_expiry', medical_expiry,
        'adr_expiry', adr_expiry,
        'user_id', user_id
      ) as r,
      case when last_name_enc is not null then pgp_sym_decrypt(last_name_enc, public._card_key()) else '' end as lname
    from drivers where company_id = p_company
  ) t;
  return res;
end; $$;

-- ── driver_link_user: powiąż/odłącz konto kierowcy (owner/dispatcher) ──
create or replace function public.driver_link_user(p_driver uuid, p_company uuid, p_user uuid)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.has_role(p_company, array['owner','dispatcher']::role[]) then
    raise exception 'Brak uprawnień';
  end if;
  if p_user is not null and not exists (
    select 1 from memberships m
    where m.user_id = p_user and m.company_id = p_company and m.status = 'active'
  ) then
    raise exception 'Użytkownik nie należy do firmy';
  end if;
  update drivers set user_id = p_user where id = p_driver and company_id = p_company;
  if not found then raise exception 'Kierowca nie istnieje w tej firmie'; end if;
  insert into audit_log (company_id, actor_id, action, target)
    values (p_company, auth.uid(), 'driver.link_user', p_driver::text);
end; $$;
