-- ════════════════════════════════════════════════════════════════════
--  E-LOGISTIC · 0003 · PIN-y kart: Vault + dostęp dla kierowców (audyt)
--  Kierowca musi znać PIN, by zapłacić w automacie na stacji.
--  PIN szyfrowany (pgcrypto), klucz w Supabase Vault, każdy odczyt audytowany.
-- ════════════════════════════════════════════════════════════════════

create extension if not exists supabase_vault;

-- Klucz szyfrowania PIN-ów czytany z Vault (sekret `card_key` — tworzony jednorazowo,
-- patrz supabase/README.md; wartość NIE jest w repo).
create or replace function public._card_key()
returns text language sql stable security definer set search_path = public, vault as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'card_key' limit 1;
$$;

-- Odczyt PIN-u: dla aktywnych członków firmy (kierowca/spedytor/owner) + developer.
-- Każdy odczyt zapisywany w audit_log.
create or replace function public.fuel_card_pin(p_card uuid)
returns text language plpgsql security definer set search_path = public as $$
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
