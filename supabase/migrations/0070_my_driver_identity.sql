-- ════════════════════════════════════════════════════════════════════
--  0070 · #314 Karta kierowcy: RPC my_driver_identity()
--  Kierowca odczytuje WŁASNE imię i nazwisko z kartoteki (deszyfrowanie
--  jak w list_drivers, ale wyłącznie wiersz user_id = auth.uid()) —
--  bez nadawania dostępu do cudzych danych HR.
-- ════════════════════════════════════════════════════════════════════

create or replace function public.my_driver_identity()
returns json language plpgsql security definer set search_path = public, extensions as $$
declare res json;
begin
  select json_build_object(
    'first_name', case when first_name_enc is not null then pgp_sym_decrypt(first_name_enc, public._card_key()) else '' end,
    'last_name',  case when last_name_enc  is not null then pgp_sym_decrypt(last_name_enc,  public._card_key()) else '' end
  ) into res
  from drivers
  where user_id = auth.uid()
  limit 1;
  return coalesce(res, json_build_object('first_name', '', 'last_name', ''));
end; $$;

revoke all on function public.my_driver_identity() from public;
grant execute on function public.my_driver_identity() to authenticated;
