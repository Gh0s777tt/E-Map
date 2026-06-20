-- ════════════════════════════════════════════════════════════════════
--  E-LOGISTIC · 0004 · Fix: pgcrypto w schemacie `extensions` (Supabase)
--  Funkcje PIN miały search_path=public i nie widziały pgp_sym_*.
--  Dodajemy `extensions` do search_path obu funkcji.
-- ════════════════════════════════════════════════════════════════════

create or replace function public.fuel_card_set_pin(p_card uuid, p_pin text)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare cid uuid;
begin
  select company_id into cid from fuel_cards where id = p_card;
  if cid is null then raise exception 'Karta nie istnieje'; end if;
  if not (public.has_role(cid, array['owner']::role[]) or public.is_developer()) then
    raise exception 'Brak uprawnień: PIN może ustawiać tylko właściciel';
  end if;
  update fuel_cards set pin_encrypted = pgp_sym_encrypt(p_pin, public._card_key())
    where id = p_card;
  insert into audit_log (company_id, actor_id, action, target)
    values (cid, auth.uid(), 'fuel_card.set_pin', p_card::text);
end; $$;

create or replace function public.fuel_card_pin(p_card uuid)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare cid uuid; res text;
begin
  select company_id into cid from fuel_cards where id = p_card;
  if cid is null then raise exception 'Karta nie istnieje'; end if;
  if not (public.is_member_of(cid) or public.is_developer()) then
    raise exception 'Brak uprawnień do PIN-u tej karty';
  end if;
  select pgp_sym_decrypt(pin_encrypted, public._card_key()) into res
    from fuel_cards where id = p_card;
  insert into audit_log (company_id, actor_id, action, target)
    values (cid, auth.uid(), 'fuel_card.read_pin', p_card::text);
  return res;
end; $$;
