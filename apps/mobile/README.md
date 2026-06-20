# @e-logistic/mobile — aplikacja kierowcy (Expo)

Aplikacja mobilna (iOS / Android) na **Expo SDK 56 · Expo Router · React Native New Architecture**.
Współdzieli rdzeń z webem: `@e-logistic/core`, `@e-logistic/ui`, `@e-logistic/i18n`.

## Status

Pakiet jest w pełni włączony do workspace (pnpm, `node-linker=hoisted`), wersje natywne
zreconciliowane do SDK 56 (`expo install`), **typecheck przechodzi**, a `expo config` ładuje się
poprawnie. Uruchomienie wymaga środowiska natywnego (symulator/urządzenie) — patrz niżej.

## Uruchomienie

```bash
# z katalogu głównego repo
pnpm install

# dev server (QR → Expo Go lub dev build)
pnpm --filter @e-logistic/mobile start
# albo bezpośrednio:
cd apps/mobile && npx expo start
```

- **Android/iOS:** zeskanuj QR w aplikacji **Expo Go**, lub `npx expo run:android` / `run:ios` (dev build).
- **Weryfikacja wersji:** `npx expo install --check`.

## Konfiguracja monorepo

- [`metro.config.js`](metro.config.js) — `watchFolders` na root workspace + `nodeModulesPaths` (Metro widzi `packages/*`).
- [`babel.config.js`](babel.config.js) — `babel-preset-expo` + plugin worklets (Reanimated 4).
- [`.npmrc`](../../.npmrc) (root) — `node-linker=hoisted` (wymóg Metro w pnpm).

## Struktura

```
apps/mobile/
├── app/
│   ├── _layout.tsx   # Stack (Expo Router), motyw red/black
│   ├── index.tsx     # ekran startowy + wejście do formularza
│   └── fuel.tsx      # Formularz Paliwowy (walidacja fuelLogSchema z core)
├── app.json          # Expo (newArchEnabled, scheme, typedRoutes)
├── metro.config.js   # monorepo
└── babel.config.js
```

## Plan (kolejne przyrostki)

- Logowanie Supabase (adapter sesji RN: SecureStore/AsyncStorage).
- Offline-first przez PowerSync (wspólny outbox z webem).
- Mapa (MapLibre Native) + `RoutingProvider`.
