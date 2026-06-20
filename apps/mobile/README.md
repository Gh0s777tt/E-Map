# @e-logistic/mobile — aplikacja kierowcy (Expo)

Szkielet aplikacji mobilnej (iOS / Android) na **Expo SDK 56 + Expo Router + React Native
New Architecture**. Współdzieli rdzeń z webem: `@e-logistic/core`, `@e-logistic/ui`, `@e-logistic/i18n`.

## Status

Kod ekranów i konfiguracja są w repo, ale pakiet jest **chwilowo wyłączony z instalacji
workspace** (`pnpm-workspace.yaml`). Pełna inicjalizacja Expo następuje w **przyrostku #003**:

```bash
# 1. Włącz mobile w pnpm-workspace.yaml (apps/*) i ustaw hoisting pod Metro:
#    .npmrc → node-linker=hoisted
# 2. Zainstaluj i zreconciluj dokładne wersje natywne narzędziem Expo:
cd apps/mobile
npx expo install --fix
# 3. Dev:
npx expo start
```

> Dlaczego tak: poprawne wersje natywnych modułów dobiera `expo install`, nie ręczne
> pinowanie. Ręczne wersje w `package.json` to punkt startowy, który `expo install --fix`
> doprowadzi do zgodności z SDK 56.

## Struktura

```
apps/mobile/
├── app/
│   ├── _layout.tsx   # Stack (Expo Router), motyw red/black
│   └── index.tsx     # ekran startowy (współdzieli ui + i18n)
├── app.json          # konfiguracja Expo (newArchEnabled, scheme, typedRoutes)
└── tsconfig.json     # extends expo/tsconfig.base
```

## Plan (kolejne przyrostki)

- Logowanie (Supabase Auth: e-mail/Google/Apple + magic link).
- Formularze offline-first (PowerSync) + kolejka synchronizacji.
- Mapa (MapLibre Native) + `RoutingProvider`.
