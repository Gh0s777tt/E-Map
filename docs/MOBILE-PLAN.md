# 📱 Mobile (Expo) — stan i plan dojścia do pełnego parytetu z web

> Stan: **v1.26.0** · Expo SDK 56 · React Native 0.85 (New Architecture) · zsynchronizowane z v1.64.0 (#208) · 2026-06-27

Aplikacja kierowcy **NIE jest już szkieletem** — to działające MVP na realnych danych z Supabase
(offline-first). Konsumuje `@e-logistic/core`, `@e-logistic/api`, `@e-logistic/i18n`, `@e-logistic/ui`.

## Stan funkcji (z kodu)

| Funkcja | Status | Dowód |
|:--|:--:|:--|
| Logowanie + sesja (AsyncStorage, guard tras) | ✅ | `app/login.tsx`, `components/AuthProvider.tsx` |
| Klient Supabase + warstwa `@e-logistic/api` | ✅ | `lib/supabase.ts` |
| Formularze Paliwo / AdBlue / Trip (realne dane) | ✅ | `components/LiquidForm.tsx`, `app/{fuel,adblue,trip}.tsx` |
| Outbox offline (`queued → synced → error`) | ✅ | `lib/outbox.ts` |
| Moje zlecenia + zmiana statusów | ✅ | `app/my-orders.tsx` |
| Zdjęcia ładunku (aparat/galeria) + podpis POD | ✅ | `components/CargoPhotosMobile.tsx`, `SignaturePadMobile.tsx` |
| Push (expo-notifications) | ⚠️ | `lib/push.ts` — wymaga `eas.projectId` |
| Mapa / POI | ❌ | brak (faza M3) |

> Odpowiada to ukończeniu faz **M1, M2, M4**. Pozostaje **M3** (mapa) i opcjonalnie **M5** (PowerSync).

## Faza M1 — Warstwa danych + sesja ✅ ZREALIZOWANE
- `@react-native-async-storage/async-storage` + `react-native-url-polyfill` + `@e-logistic/api`.
- `lib/supabase.ts`: `createClient(EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } })`.
- Ekran logowania (email+hasło) + sesja persystentna; guard nawigacji (`AuthProvider` + `useProtectedRoute`).

## Faza M2 — Formularze offline-first na realnych danych ✅ ZREALIZOWANE
- Pojazdy/karty z bazy przez `lib/useFleet.ts` (RLS zawęża do firmy) — zamiast danych demo.
- Outbox na `AsyncStorage` (`lib/outbox.ts`: `enqueue`/`trySync`/`flushQueued`) + re-sync po połączeniu.
- Walidacja współdzielona (`fuelLogSchema`/`tripEventSchema` z `@e-logistic/core`).

## Faza M3 — Mapa i POI ⬜ DO ZROBIENIA (następny krok mobile)
- `@maplibre/maplibre-react-native` (render) + reużycie `@e-logistic/maps` (`/api/route` przez web
  lub bezpośrednio provider). POI z Overpass, „moja lokalizacja" (expo-location).
- **Test:** trasa TIR + POI na urządzeniu.

## Faza M4 — Powiadomienia push (natywne) ✅ ZREALIZOWANE (z zastrzeżeniem)
- `expo-notifications` + token urządzenia → tabela `expo_push_tokens` (`lib/push.ts`).
- Most do wysyłki serwerowej (`/api/orders/notify-assignment`, kanał Expo Push obok Web Push).
- ⚠️ **Wymaga `eas.projectId`** w `app.json` (z `eas init`) — bez niego token push nie zadziała.

## Faza M5 — Offline-sync (PowerSync) ⬜ OPCJONALNIE
- Jeśli outbox okaże się niewystarczający: PowerSync (lokalny SQLite ↔ Supabase) wg stacku docelowego.

## Do publikacji w sklepach (pozostałe kroki)
1. `eas init` → uzupełnia `extra.eas.projectId` (wymagany także do tokenów push).
2. `npx expo install --fix` (dociągnięcie wersji natywnych do SDK — patrz „aktualizacje" niżej).
3. **Finalna grafika**: ikony/splash 1024² + adaptive (zastąpić czerwone placeholdery z `assets/`).
4. Dev build + **QA na urządzeniu**: login → zlecenia + status → zdjęcia z aparatu → formularze offline → push.
5. `eas build -p android/ios --profile production` → `eas submit`.
6. Konta deweloperskie: Apple Developer + Google Play Console; polityka prywatności + opisy uprawnień (już w `app.json`).

## Aktualizacje zależności (Expo)
- **Nie** aktualizuj pakietów `expo-*`/`react-native*` ręcznie wg `pnpm outdated` (pokazuje mylące skoki przez
  unified-versioning Expo). Używaj `npx expo install --fix`, który dopasowuje wersje natywne do SDK.
- Bump dużych wersji = bump **SDK Expo** (np. 56 → następny) razem, nie pojedynczo.

## Porządki przy okazji
- Ujednolicić wersję `apps/mobile` (`app.json` / `package.json` = 1.26.0) z resztą lub udokumentować niezależne.
- `apps/mobile/tsconfig.json` ma już zaostrzone reguły (strict + `noUncheckedIndexedAccess`) — utrzymać przy nowych ekranach.
