# iOS + macOS — runbook publikacji (E-Logistic)

Konto **Apple Developer opłacone** ✅. Poniżej dwie ścieżki buildu iOS i publikacja
na macOS (App Store dla Apple Silicon). Panel na macOS jako PWA już działa (#279).

## Ścieżka A — najszybsza (interaktywna, 2FA raz)

```bash
cd apps/mobile
eas build --profile production --platform ios
```

Na pytania: zaloguj Apple ID → **2FA** → „Generate new Apple Distribution Certificate?" **Yes**
→ „Generate new Provisioning Profile?" **Yes**. Certyfikaty zapisują się na serwerze Expo,
więc **kolejne buildy iOS są już automatyczne** (jak Android). Wynik: plik `.ipa`.

## Ścieżka B — bez 2FA przy każdym buildzie (App Store Connect API Key)

1. App Store Connect → **Users and Access → Integrations → App Store Connect API** →
   wygeneruj klucz roli **App Manager** → pobierz plik `AuthKey_XXXX.p8` (jednorazowo!),
   zapisz **Key ID** i **Issuer ID**.
2. `eas credentials` → platforma iOS → wgraj klucz API do konta Expo (albo trzymaj `.p8`
   POZA repo i podawaj przy `eas submit --api-key-path`).
3. Od teraz build/submit iOS działają non-interactive (CI/skrypty).

## Utworzenie apki + wysyłka

1. App Store Connect → **Apps → +** → nowa apka iOS, bundle ID `com.ghostempire.elogistic`,
   nazwa „E-Logistic", język PL. Skopiuj **Apple ID apki** (numeryczne) → wpisz jako
   `submit.production.ios.ascAppId` w `eas.json`.
2. `eas submit --profile production --platform ios` → apka trafia do **TestFlight**.
3. Karta apki (App Store): opis/zrzuty z `apps/mobile/store/listing.md`, polityka prywatności
   `https://e-logistic-one.vercel.app/privacy`, „App Privacy" wg ściągi Data safety.
4. Wyślij do recenzji Apple (zwykle 24–48 h).

## macOS

- **PWA panelu (już działa)**: Safari → Udostępnij → „Dodaj do Docka" (albo Chrome/Edge
  „Zainstaluj aplikację"). Manifest: `apps/web/app/manifest.ts`.
- **Aplikacja kierowcy na Apple Silicon**: w App Store Connect → apka iOS → sekcja
  **Pricing and Availability / App Availability** → zaznacz „Make available on Mac"
  (Apple udostępnia binarkę iPad na Macach M-serii, **bez osobnego buildu**).
- Pełny natywny macOS (Mac Catalyst) tylko gdy PWA + iPad-on-Mac okażą się niewystarczające.

## Compliance — już ustawione w `app.json`

- `ITSAppUsesNonExemptEncryption: false` (tylko HTTPS/standard) — brak papierologii
  eksportowej przy każdym buildzie TestFlight.
- Opisy uprawnień (Info.plist): lokalizacja / aparat / zdjęcia — wymagane do recenzji.
