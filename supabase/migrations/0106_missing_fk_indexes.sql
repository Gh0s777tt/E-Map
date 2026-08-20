-- [#390] Indeksy na kluczach obcych — 52 brakujące.
--
-- Produkcyjna baza jest dziś prawie pusta (2 pojazdy, 20 tankowań), więc żaden
-- z tych braków NIE ujawni się przy ręcznym klikaniu. Docelowy klient to
-- przewoźnik z 30–50 autami i kilkuletnią historią — i wtedy jest już za późno,
-- bo `create index` na tabeli z milionem wierszy blokuje zapisy, a na pustej
-- trwa milisekundy. Dlatego robimy to teraz, a nie „gdy zacznie zwalniać".
--
-- Dwa różne powody, dla których brak indeksu na kluczu obcym boli:
--
-- 1. ODCZYT. Kolumny takie jak `fuel_logs.vehicle_id` czy `trip_events.vehicle_id`
--    są w tym produkcie najgorętsze, jakie istnieją: rachunek wyjazdu, statystyki
--    spalania, rentowność pojazdu i rozliczenie — wszystko filtruje po pojeździe.
--    Bez indeksu każde z tych zapytań przechodzi całą historię tabeli.
--
-- 2. USUWANIE. Postgres przy `ON DELETE CASCADE` i `ON DELETE SET NULL` musi
--    znaleźć wiersze wskazujące na kasowany rekord. Bez indeksu robi pełny skan
--    KAŻDEJ tabeli potomnej. Dotyczy to zwłaszcza kolumn typu `created_by`,
--    `edited_by`, `uploaded_by`, `reported_by` — nikt po nich nie filtruje, ale
--    wszystkie wskazują na `auth.users`, a **usuwanie konta jest tu funkcją
--    produktu** (wymóg Apple, migracja 0090). Bez tych indeksów skasowanie
--    jednego konta oznacza skan kilkunastu tabel naraz.
--
-- Koszt zapisu jest realny, ale mały: to tabele dopisywane, nie aktualizowane
-- w kółko, a indeks na pojedynczej kolumnie uuid jest wąski.
--
-- `if not exists` — migracja ma być bezpieczna do ponownego uruchomienia.


-- ── Ścieżki gorące: filtrowanie po pojeździe, kierowcy, wątku, zleceniu ──

create index if not exists idx_adblue_log_revisions_adblue_log_id on public.adblue_log_revisions (adblue_log_id);
create index if not exists idx_adblue_logs_driver_id on public.adblue_logs (driver_id);
create index if not exists idx_adblue_logs_fuel_card_id on public.adblue_logs (fuel_card_id);
create index if not exists idx_adblue_logs_vehicle_id on public.adblue_logs (vehicle_id);
create index if not exists idx_card_assignments_fuel_card_id on public.card_assignments (fuel_card_id);
create index if not exists idx_card_assignments_user_id on public.card_assignments (user_id);
create index if not exists idx_card_assignments_vehicle_id on public.card_assignments (vehicle_id);
create index if not exists idx_chat_members_user_id on public.chat_members (user_id);
create index if not exists idx_chat_reads_thread_id on public.chat_reads (thread_id);
create index if not exists idx_chat_threads_company_id on public.chat_threads (company_id);
create index if not exists idx_checklist_submissions_driver_id on public.checklist_submissions (driver_id);
create index if not exists idx_checklist_submissions_template_id on public.checklist_submissions (template_id);
create index if not exists idx_checklist_templates_company_id on public.checklist_templates (company_id);
create index if not exists idx_driver_expenses_user_id on public.driver_expenses (user_id);
create index if not exists idx_driver_expenses_vehicle_id on public.driver_expenses (vehicle_id);
create index if not exists idx_driver_routes_driver_id on public.driver_routes (driver_id);
create index if not exists idx_drivers_user_id on public.drivers (user_id);
create index if not exists idx_fuel_log_revisions_fuel_log_id on public.fuel_log_revisions (fuel_log_id);
create index if not exists idx_fuel_logs_fuel_card_id on public.fuel_logs (fuel_card_id);
create index if not exists idx_fuel_logs_vehicle_id on public.fuel_logs (vehicle_id);
create index if not exists idx_invites_vehicle_id on public.invites (vehicle_id);
create index if not exists idx_messages_reply_to_id on public.messages (reply_to_id);
create index if not exists idx_notifications_company_id on public.notifications (company_id);
create index if not exists idx_orders_vehicle_id on public.orders (vehicle_id);
create index if not exists idx_pause_events_fuel_card_id on public.pause_events (fuel_card_id);
create index if not exists idx_pause_events_vehicle_id on public.pause_events (vehicle_id);
create index if not exists idx_poi_reviews_poi_id on public.poi_reviews (poi_id);
create index if not exists idx_poi_reviews_user_id on public.poi_reviews (user_id);
create index if not exists idx_rates_vehicle_id on public.rates (vehicle_id);
create index if not exists idx_route_extra_costs_fuel_card_id on public.route_extra_costs (fuel_card_id);
create index if not exists idx_route_extra_costs_order_id on public.route_extra_costs (order_id);
create index if not exists idx_tacho_downloads_driver_id on public.tacho_downloads (driver_id);
create index if not exists idx_tacho_downloads_vehicle_id on public.tacho_downloads (vehicle_id);
create index if not exists idx_trip_event_revisions_trip_event_id on public.trip_event_revisions (trip_event_id);
create index if not exists idx_trip_events_vehicle_id on public.trip_events (vehicle_id);

-- ── Kolumny „kto to zrobił”: nie filtruje się po nich, ale trzymają więz
--    do `auth.users`, więc bez indeksu usunięcie konta skanuje te tabele. ──
create index if not exists idx_adblue_log_revisions_edited_by on public.adblue_log_revisions (edited_by);
create index if not exists idx_audit_log_actor_id on public.audit_log (actor_id);
create index if not exists idx_chat_threads_created_by on public.chat_threads (created_by);
create index if not exists idx_damage_claims_created_by on public.damage_claims (created_by);
create index if not exists idx_documents_uploaded_by on public.documents (uploaded_by);
create index if not exists idx_driver_payouts_created_by on public.driver_payouts (created_by);
create index if not exists idx_fuel_log_revisions_edited_by on public.fuel_log_revisions (edited_by);
create index if not exists idx_fuel_prices_reported_by on public.fuel_prices (reported_by);
create index if not exists idx_map_reports_reported_by on public.map_reports (reported_by);
create index if not exists idx_messages_sender_id on public.messages (sender_id);
create index if not exists idx_order_photos_uploaded_by on public.order_photos (uploaded_by);
create index if not exists idx_per_diem_trips_created_by on public.per_diem_trips (created_by);
create index if not exists idx_saved_places_created_by on public.saved_places (created_by);
create index if not exists idx_trip_event_revisions_edited_by on public.trip_event_revisions (edited_by);
create index if not exists idx_vehicle_defects_reported_by on public.vehicle_defects (reported_by);
create index if not exists idx_vehicle_defects_resolved_by on public.vehicle_defects (resolved_by);
create index if not exists idx_work_time_entries_created_by on public.work_time_entries (created_by);

-- ─── Czego świadomie NIE robimy ──────────────────────────────────────────────
--
-- `chat_reads` bez klucza głównego (ostrzeżenie dostawcy, poziom INFO) —
--   tabela ma unikalny indeks `chat_reads_key (company_id, user_id, thread_key)`,
--   który pełni rolę klucza i jest celem `on conflict` przy zapisie odczytania
--   wątku. Klucz główny wymaga kolumn NOT NULL, a `thread_key` jest nullowalne —
--   dodanie PK zmieniłoby cel konfliktu i zepsuło upsert. Unikalność jest
--   wymuszona tam, gdzie trzeba; brak PK jest tu formalnością, nie luką.
--
-- Indeksy oznaczone przez dostawcę jako `unused_index` (36 sztuk) — statystyka
--   użycia na bazie bez ruchu produkcyjnego nie mówi nic o tym, czy indeks jest
--   potrzebny. Kasowanie ich teraz to zgadywanie; wracamy do tego, gdy będą
--   prawdziwe dane i prawdziwe zapytania.
