-- [#396] Druga warstwa tej samej pułapki — i tym razem trafiła w moją własną poprawkę.
--
-- Migracja 0105 odbierała `EXECUTE` roli `PUBLIC`, bo `anon` po niej dziedziczy.
-- To była prawda, ale **niepełna**: Supabase ma ustawione `alter default privileges`
-- nadające `EXECUTE` rolom `anon`, `authenticated` i `service_role` JAWNIE, przy
-- tworzeniu funkcji. Wpis `anon=X/postgres` w `proacl` nie znika po odebraniu `PUBLIC`.
--
-- Skutek: funkcje utworzone po tym, jak ta domyślna reguła zaczęła obowiązywać —
-- w tym `save_expo_push_token` i `delete_expo_push_token`, które sam dodałem
-- w migracji 0107 z myślą o bezpieczeństwie — pozostały wywoływalne bez logowania,
-- mimo `revoke ... from public` i `grant ... to authenticated`.
--
-- Reguła bezwyjątkowa, wynikająca z obu warstw: **odbierać ZAWSZE od `public`
-- ORAZ od `anon`.** Sprawdzać skutek przez `has_function_privilege('anon', …)`,
-- nigdy przez samo istnienie instrukcji `revoke` w migracji.
--
-- Najpoważniejsza pozycja poniżej to `driver_save` — zapisuje dane osobowe kierowcy
-- (imię, nazwisko, data urodzenia, numery uprawnień, paszport, dowód). Przeoczyłem
-- ją przy układaniu listy w 0105.

revoke execute on function public.driver_save(
  uuid, uuid, text, text, text, text[], text[], text, text, text, text, text, text,
  text, text, jsonb, text, text, text, text, text
) from public, anon;

revoke execute on function public.save_expo_push_token(text, text, uuid) from public, anon;
revoke execute on function public.delete_expo_push_token(text) from public, anon;

-- Funkcje wyzwalaczy. Wywołane wprost przez PostgREST i tak by się wywaliły (brak
-- kontekstu NEW/OLD), więc nie były dziurą — ale powierzchnia wystawiona bez powodu
-- jest powierzchnią do usunięcia, a reguła bez wyjątków jest łatwiejsza do pilnowania
-- niż reguła z listą „tych akurat można".
revoke execute on function public.audit_invoice_paid() from public, anon;
revoke execute on function public.audit_invoice_status() from public, anon;
revoke execute on function public.auto_close_order_on_delivery() from public, anon;
revoke execute on function public.checklist_link_driver() from public, anon;
revoke execute on function public.invoice_recalc() from public, anon;
revoke execute on function public.messages_apply_ttl() from public, anon;
revoke execute on function public.notify_order_assignment() from public, anon;

-- `handle_new_user` odpala się z wyzwalacza na `auth.users`, wykonywanego przez
-- `supabase_auth_admin` — nie przez klienta. Odebranie klientom niczego nie psuje.
revoke execute on function public.handle_new_user() from public, anon;

-- Zalogowany zachowuje to, czego aplikacja realnie używa.
grant execute on function public.driver_save(
  uuid, uuid, text, text, text, text[], text[], text, text, text, text, text, text,
  text, text, jsonb, text, text, text, text, text
) to authenticated;
grant execute on function public.save_expo_push_token(text, text, uuid) to authenticated;
grant execute on function public.delete_expo_push_token(text) to authenticated;
