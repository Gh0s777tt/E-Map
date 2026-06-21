# 📱 Mobile (Expo) — plan dojścia do parytetu z web

Stan: `apps/mobile` to wczesny szkielet (4 ekrany: index/fuel/adblue/trip; bez auth, bez danych z bazy,
bez mapy). Konsumuje tylko `@e-logistic/core`, `@e-logistic/i18n`, `@e-logistic/ui`.

> Dlaczego plan, a nie od razu kod: RN/Expo (auth z `AsyncStorage`, mapa, natywne uprawnienia)
> trzeba weryfikować na **emulatorze/urządzeniu** — robienie tego „na ślepo" grozi szkieletem,
> który kompiluje się, ale nie działa w runtime. Każda faza poniżej kończy się testem na Expo.

## Faza M1 — Warstwa danych + sesja (fundament)
- Deps: `@react-native-async-storage/async-storage`, `react-native-url-polyfill`, dołączyć `@e-logistic/api`.
- `apps/mobile/lib/supabase.ts`: `createClient(EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } })`
  + `import "react-native-url-polyfill/auto"`.
- Ekran logowania (email+hasło, magic‑link) + przechowywanie sesji; guard nawigacji (zalogowany/nie).
- **Test (Expo):** logowanie, utrzymanie sesji po restarcie.

## Faza M2 — Formularze offline‑first na realnych danych
- Wpiąć `useFleet`‑odpowiednik (pojazdy/karty z bazy) zamiast danych demo na ekranach fuel/adblue/trip.
- Outbox na `AsyncStorage` (odpowiednik web `lib/outbox.ts`) + re‑sync po połączeniu.
- **Test:** zapis offline → sync po sieci; widoczne w web „Historia".

## Faza M3 — Mapa i POI
- `@maplibre/maplibre-react-native` (render) + reużycie `@e-logistic/maps` (`/api/route` przez serwer web
  lub bezpośrednio provider). POI z Overpass, „moja lokalizacja" (expo‑location).
- **Test:** trasa TIR + POI na urządzeniu.

## Faza M4 — Powiadomienia push (natywne)
- `expo-notifications` + token urządzenia → tabela `push_subscriptions` (rozszerzyć o typ „expo"/FCM/APNs).
- Most do istniejącego `/api/cron/notify` (osobny kanał wysyłki dla Expo push).
- **Test:** push na zablokowanym ekranie.

## Faza M5 — Offline‑sync (PowerSync) — opcjonalnie
- Jeśli outbox okaże się niewystarczający: PowerSync (lokalny SQLite ↔ Supabase) wg stacku docelowego.

## Porządki przy okazji
- Ujednolicić wersję `apps/mobile` (app.json 0.2.0 / pkg 0.18.0) z resztą lub udokumentować niezależne.
- `apps/mobile/tsconfig.json` ma już zaostrzone reguły (#054) — utrzymać przy nowych ekranach.

## Jak ruszyć
Potrzebny **emulator/urządzenie z Expo Go** (lub podłączenie podglądu). Wtedy realizuję M1→M4 fazami,
każda: kod → `expo` typecheck → test na urządzeniu → wydanie + CHANGELOG.
