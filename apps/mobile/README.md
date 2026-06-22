# @e-logistic/mobile — aplikacja kierowcy (Expo)

Aplikacja mobilna (iOS / Android) na **Expo SDK 56 · Expo Router · React Native New Architecture**.
Współdzieli rdzeń z webem: `@e-logistic/core`, `@e-logistic/api`, `@e-logistic/ui`, `@e-logistic/i18n`.

## Funkcje (stan)

- 🔐 **Logowanie + sesja** (Supabase Auth, sesja w AsyncStorage) — bramka tras.
- ⛽💧🚚 **Formularze** paliwo / AdBlue / trasa → zapis do Supabase z **offline outbox** (AsyncStorage).
- 📋 **Moje zlecenia** — lista przypisanych, zmiana statusu (w trakcie/dostarczone), pull-to-refresh.
- 📸 **Zdjęcia towaru z aparatu/galerii** → bucket `cargo-photos`.
- 🔔 **Push** o przypisaniu zlecenia (Expo Notifications; serwer wysyła z `/api/orders/notify-assignment`).

## Uruchomienie (dev)

```bash
pnpm install                       # z roota repo
cd apps/mobile && npx expo start   # QR → Expo Go / dev build
```

Konfiguracja Supabase: skopiuj [`.env.example`](.env.example) → `.env` i uzupełnij
`EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

## Ikony / splash

Brandowane placeholdery (czerwień `#E50914` na czerni `#0a0a0a`) w [`assets/`](assets),
generowane skryptem [`scripts/gen-assets.mjs`](scripts/gen-assets.mjs) (`node scripts/gen-assets.mjs`).
**Przed publikacją** zastąp finalną grafiką (ikona 1024², adaptive-icon, splash).

## Publikacja w sklepach (EAS) — runbook

Wymaga **realnej maszyny** (nie środowiska CI tego repo) + kont deweloperskich
Apple/Google. Konfiguracja profili: [`eas.json`](eas.json).

```bash
npm i -g eas-cli
eas login
eas init                 # tworzy projekt EAS i wpisuje extra.eas.projectId do app.json
                         # (potrzebny też do tokenów push Expo — getExpoPushTokenAsync)

# wersje natywne dociągnięte do SDK:
npx expo install --fix

# build:
eas build -p android --profile production
eas build -p ios     --profile production

# wysyłka do sklepów:
eas submit -p android --profile production    # Google Play (service account JSON)
eas submit -p ios     --profile production    # App Store (Apple ID / ASC API key)
```

### Sekrety serwerowe powiązane z mobile

- Push: serwer używa **Expo Push API** (bez sekretu); opcjonalnie `EXPO_ACCESS_TOKEN`
  na wyższe limity (ustaw w env aplikacji web na Vercel).
- Konfiguracja Supabase mobilna idzie przez `EXPO_PUBLIC_*` (publiczne — anon key,
  bezpieczne pod RLS).

## Konfiguracja monorepo

- [`metro.config.js`](metro.config.js) — `watchFolders` na root + `nodeModulesPaths`.
- [`babel.config.js`](babel.config.js) — `babel-preset-expo` (+ worklets Reanimated).
- [`.npmrc`](../../.npmrc) (root) — `node-linker=hoisted` (wymóg Metro w pnpm).

> Uwaga: w środowisku Claude nie uruchamiamy symulatora/EAS — bramką jakości jest
> `tsc --noEmit`. Realny build/test na urządzeniu wykonaj wg powyższego runbooka.
