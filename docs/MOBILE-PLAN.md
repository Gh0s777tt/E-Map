# 📱 Mobile (Expo) — stan i plan dojścia do pełnego parytetu z web

> Stan: **v1.35.0** · Expo SDK 56 · React Native 0.85 (New Architecture) · zsynchronizowane z v1.129.0 (#276) · 2026-07-04

Aplikacja kierowcy **NIE jest już szkieletem** — to działające MVP na realnych danych z Supabase
(offline-first). Konsumuje `@e-logistic/core`, `@e-logistic/api`, `@e-logistic/i18n`, `@e-logistic/ui`.

## Stan funkcji (z kodu)

| Funkcja | Status | Dowód |
|:--|:--:|:--|
| Logowanie + sesja (szyfrowana: keychain + AES, #251) | ✅ | `app/login.tsx`, `lib/secureSession.ts` |
| Klient Supabase + warstwa `@e-logistic/api` | ✅ | `lib/supabase.ts` |
| Formularze Paliwo / AdBlue / Trip (realne dane) | ✅ | `components/LiquidForm.tsx`, `app/{fuel,adblue,trip}.tsx` |
| Outbox offline (`queued → synced → error`) | ✅ | `lib/outbox.ts` |
| Moje zlecenia + zmiana statusów | ✅ | `app/my-orders.tsx` |
| Zdjęcia ładunku (aparat/galeria) + podpis POD | ✅ | `components/CargoPhotosMobile.tsx`, `SignaturePadMobile.tsx` |
| Push (expo-notifications) | ⚠️ | `lib/push.ts` — wymaga `eas.projectId` |
| Mapa / POI | 🚧 | `app/map.tsx` (M3 fala 1, #253) — routing na mapie: fala 2 |

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

## Faza M3 — Mapa i POI 🚧 FALA 1 DOSTARCZONA (#253)
- [x] Fala 1 (#253): `@maplibre/maplibre-react-native` v11 (config plugin), ekran `app/map.tsx` —
  styl MapTiler dark / fallback OSM (`lib/mapStyle.ts`), „moja lokalizacja" (expo-location),
  POI TIR (parkingi hgv + stacje) z Overpass przez `@e-logistic/maps` (`fetchPois`), i18n `mobileMap.*`.
- [x] Fala 2 (#272): **warstwa trasy na mapie mobile** — web liczy trasę TIR i wysyła (`driver_routes`: przystanki+geometria+podsumowanie), mobile rysuje linię, przystanki i pasek dystans/czas/myto. Chips „🧭" z odebranymi trasami.
- ⚠️ **Natywny moduł** — działa w dev buildach / EAS, NIE w Expo Go. **Test:** mapa + POI na urządzeniu.

## Faza M4 — Powiadomienia push (natywne) ✅ ZREALIZOWANE (z zastrzeżeniem)
- `expo-notifications` + token urządzenia → tabela `expo_push_tokens` (`lib/push.ts`).
- Most do wysyłki serwerowej (`/api/orders/notify-assignment`, kanał Expo Push obok Web Push).
- ⚠️ **Wymaga `eas.projectId`** w `app.json` (z `eas init`) — bez niego token push nie zadziała.

## Faza M5 — Offline-sync (PowerSync) ⬜ OPCJONALNIE
- Jeśli outbox okaże się niewystarczający: PowerSync (lokalny SQLite ↔ Supabase) wg stacku docelowego.

## Do publikacji w sklepach (pozostałe kroki)
1. `eas init` → uzupełnia `extra.eas.projectId` (wymagany także do tokenów push).
2. `npx expo install --fix` (dociągnięcie wersji natywnych do SDK — patrz „aktualizacje" niżej).
3. ~~Finalna grafika~~ ✅ (#255) — monogram „E" + droga (czerń/czerwień), generowane skryptem `scripts/gen-mobile-assets.mjs` (icon/adaptive/splash/favicon).
4. Dev build + **QA na urządzeniu**: login → zlecenia + status → zdjęcia z aparatu → formularze offline → push.
5. `eas build -p android/ios --profile production` → `eas submit`.
6. Konta deweloperskie: Apple Developer + ~~Google Play Console~~ ✅ (konto zweryfikowane). Polityka prywatności ✅ (#256 — `/privacy` na web) + opisy uprawnień w `app.json` ✅. Karta sklepu: gotowe teksty/grafiki w `apps/mobile/store/` (`listing.md`).

## Aktualizacje zależności (Expo)
- **Nie** aktualizuj pakietów `expo-*`/`react-native*` ręcznie wg `pnpm outdated` (pokazuje mylące skoki przez
  unified-versioning Expo). Używaj `npx expo install --fix`, który dopasowuje wersje natywne do SDK.
- Bump dużych wersji = bump **SDK Expo** (np. 56 → następny) razem, nie pojedynczo.

## Wersjonowanie (decyzja — audyt #219)
- **`apps/mobile` wersjonowany niezależnie** (`app.json`/`package.json` = 1.26.0) — własny rytm wydań związany z buildami **EAS** i publikacją w sklepach; unified-versioning Expo czyni lockstep z numerem roota niepraktycznym. **Świadoma decyzja**, nie rozjazd.
- `apps/web` = wersja roota (pilnowane bramką `docs:check` od #214). `packages/*` (0.x) — wewnętrzne, niepublikowane na npm; numer wersji bez znaczenia funkcjonalnego.

## Porządki przy okazji
- `apps/mobile/tsconfig.json` ma już zaostrzone reguły (strict + `noUncheckedIndexedAccess`) — utrzymać przy nowych ekranach.
