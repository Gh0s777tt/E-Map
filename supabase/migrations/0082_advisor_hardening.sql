-- 0082: hardening wg Supabase Security Advisors (bezpieczny podzbiór, idempotentny).
-- Nałożone też na prod przez konektor. Reszta warnów definer-funkcji jest CELOWA
-- (RPC z wewnętrznym auth, helpery RLS is_member_of/has_role, token-gated order_tracking)
-- i odcięcie EXECUTE by je zepsuło. ERROR spatial_ref_sys jest nieusuwalny (tabela PostGIS,
-- brak uprawnień roli postgres) — publiczne dane słownikowe, bez ryzyka.

-- function_search_path_mutable: przypnij search_path triggera.
alter function public.set_updated_at() set search_path = '';

-- Wewnętrzne helpery kluczy/PII: wołane WYŁĄCZNIE z wnętrza innych SECURITY DEFINER funkcji
-- (kontekst = definer, więc dalej działają). Klient nie ma powodu wołać ich bezpośrednio.
revoke execute on function public._card_key() from anon, authenticated;
revoke execute on function public._pii_key() from anon, authenticated;

-- dev_stats: statystyki deweloperskie — anon nigdy (authenticated zostaje; panel dev gejtuje is_developer).
revoke execute on function public.dev_stats() from anon;
