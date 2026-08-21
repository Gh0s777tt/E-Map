-- ════════════════════════════════════════════════════════════════════
--  E-LOGISTIC · 0111 · Bieżący przebieg per pojazd liczony W BAZIE (#423)
--
--  Problem, który to zamyka, jest starszy niż stronicowanie i stronicowanie go
--  NIE naprawiło. `latestOdometers` potrzebuje jednej liczby na pojazd — maksimum
--  licznika z tankowań — a dostawała ją, ściągając do przeglądarki całą historię
--  `fuel_logs` firmy i licząc `max` w pętli. Historia rośnie bez końca (300 ciągników
--  × 3 tankowania tygodniowo × 3 lata ≈ 140 000 wierszy), więc pobranie musiało mieć
--  sufit — 50 stron × 1000 wierszy. Powyżej sufitu wynikiem był `max` z PRÓBKI, i to
--  próbki jednolicie losowej: strony schodzą po `id`, a `id` to `gen_random_uuid()`,
--  więc kolejność pobierania nie ma nic wspólnego z czasem. Ucięcie nie zabierało
--  „starszych" tankowań, tylko losowe 64% wszystkich — razem z tymi najświeższymi.
--
--  Skutek nie wygląda jak brak danych. Zaniżony przebieg wygląda jak niższy przebieg:
--  `serviceStatus(zaniżony, …)` odpowiada „ok" albo „soon" zamiast „expired", więc auto
--  po terminie wymiany oleju wypada z panelu „Wymaga uwagi" i z pozycji przeterminowanych
--  w harmonogramie. Jedynym śladem był stały baner „przebiegi niekompletne", identyczny
--  każdego dnia — czyli ostrzeżenie, które operator przestaje czytać dokładnie na flocie,
--  dla której powstało.
--
--  Agregat należy do bazy i tylko baza umie go policzyć bez sufitu: `max(...) group by`
--  czyta indeks i oddaje JEDEN wiersz na pojazd. Flota liczy się w setkach, nie w setkach
--  tysięcy, więc odpowiedź mieści się w `api.max_rows` z zapasem trzech rzędów wielkości.
--  Ten sam rachunek robi już `generate_expiry_notifications` (0028/0031) bocznym złączeniem
--  `lateral (select max(odometer_km) …)` — powiadomienia były więc CAŁY CZAS liczone
--  z prawdziwego przebiegu, a ekrany z próbki.
--
--  `security invoker`: RLS `fuel_logs` obowiązuje wywołującego, więc funkcja nie może
--  wydać przebiegów cudzej firmy nawet przy podstawionym `p_company`. Odczyt agregatu nie
--  potrzebuje ani odrobiny więcej uprawnień, niż ma sam odczyt tankowań — a `security
--  definer` byłby tu dokładnie tą odrobiną za dużo.
-- ════════════════════════════════════════════════════════════════════

-- Indeks pod ten agregat. `fuel_logs_stat_idx` (company_id, vehicle_id, created_at)
-- prowadzi do właściwych wierszy, ale bez `odometer_km` w kluczu każdy z nich trzeba
-- odwiedzić w stercie. Z tą kolumną na końcu klucza maksimum per pojazd czyta się
-- skanem wyłącznie po indeksie.
create index if not exists fuel_logs_odometer_idx
  on public.fuel_logs (company_id, vehicle_id, odometer_km desc);

-- Kolumny wyniku są w ciele funkcji widoczne jako parametry wyjściowe, więc każde
-- odwołanie do kolumny tabeli jest KWALIFIKOWANE aliasem — inaczej `vehicle_id` byłoby
-- odwołaniem niejednoznacznym i funkcja nie powstałaby w ogóle.
create or replace function public.vehicle_odometers(p_company uuid)
returns table (vehicle_id uuid, odometer_km integer)
language sql
stable
security invoker
set search_path to 'public'
as $$
  select f.vehicle_id, max(f.odometer_km)::integer
  from public.fuel_logs f
  where f.company_id = p_company
  group by f.vehicle_id
$$;

-- Reguła bez wyjątków z 0108: odbierać ZAWSZE od `public` ORAZ od `anon` — Supabase
-- nadaje `EXECUTE` obu rolom jawnie przy tworzeniu funkcji, więc samo `revoke … from
-- public` zostawiłoby ją wywoływalną bez logowania.
revoke execute on function public.vehicle_odometers(uuid) from public, anon;
grant execute on function public.vehicle_odometers(uuid) to authenticated;

comment on function public.vehicle_odometers(uuid) is
  '[#423] Biezacy przebieg per pojazd = max(odometer_km) z tankowan firmy. RLS wywolujacego.';
