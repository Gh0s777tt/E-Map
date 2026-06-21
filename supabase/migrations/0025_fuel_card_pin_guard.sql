-- ════════════════════════════════════════════════════════════════════
--  E-LOGISTIC · 0025 · Porządki P3 z audytu 2026-06-21
--
--  P3 #12: `fuel_card_pin` (zredefiniowany w 0013) zgubił guard `if cid is null`
--  z oryginału (0003). Przy nieistniejącej karcie `cid` jest NULL, a `is_member_of(NULL)`
--  daje mylący komunikat „Brak uprawnień" zamiast „Karta nie istnieje". Przywracamy guard.
--  (`fuel_card_set_pin` guard już ma — 0013.)
--
--  Uwaga (P3 #12, część „is_developer w 0012"): polityki `drivers` z 0012 zostały
--  poprawnie NADPISANE w 0013 (drop+create, te same nazwy, bez `is_developer`) — live DB
--  jest czyste. Historycznych migracji 0012/0013 NIE edytujemy (zachowanie zapisu zmian).
--  P3 #13 (kolizje numeracji 0017/0018) udokumentowane w supabase/README.md — pliki dotykają
--  różnych obiektów, kolejność alfabetyczna jest poprawna; bez zmian w DB.
-- ════════════════════════════════════════════════════════════════════

create or replace function public.fuel_card_pin(p_card uuid)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare cid uuid; res text;
begin
  select company_id into cid from fuel_cards where id = p_card;
  if cid is null then raise exception 'Karta nie istnieje'; end if;
  if not public.is_member_of(cid) then
    raise exception 'Brak uprawnień do PIN-u tej karty';
  end if;
  select pgp_sym_decrypt(pin_encrypted, public._card_key()) into res
    from fuel_cards where id = p_card;
  insert into audit_log (company_id, actor_id, action, target)
    values (cid, auth.uid(), 'fuel_card.read_pin', p_card::text);
  return res;
end; $$;
