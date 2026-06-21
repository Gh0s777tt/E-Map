-- ════════════════════════════════════════════════════════════════════
--  E-LOGISTIC · 0026 · Moduł „Rozliczenia" jako osobne uprawnienie
--
--  Dotąd /settlements było gatowane modułem `stats`. Wydzielamy `settlements`
--  jako osobny moduł (APP_MODULES). Aby istniejący członkowie nie stracili
--  dostępu: każdemu, kto MA WŁASNĄ listę `modules` z `stats`, dopisujemy
--  `settlements`. Członkowie z `modules = NULL` korzystają z domyślnych dla roli
--  (owner/dispatcher/manager mają wszystkie — w tym `settlements`), więc ich
--  nie ruszamy.
-- ════════════════════════════════════════════════════════════════════

update memberships
set modules = array_append(modules, 'settlements')
where modules is not null
  and 'stats' = any(modules)
  and not ('settlements' = any(modules));
