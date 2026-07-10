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

## Utworzenie apki + wysyłka — ZROBIONE (#281)

Rekord apki istnieje: **ASC App ID `6789726653`** (nazwa „E-Logistic", bundle
`com.ghostempire.elogistic`, SKU `ELOGISTIC0001`, język PL). Utworzenie przez API jest
zablokowane (`403 CREATE forbidden`), więc rekord zakłada się **raz** w panelu ASC.

Konfiguracja submit (już w [`eas.json`](../eas.json), `submit.production.ios`) — działa
w pełni non-interactive, klucz ASC API w profilu (env vary NIE wystarczają dla `submit`):

```jsonc
"ios": {
  "ascAppId": "6789726653",
  "appleTeamId": "CM2PFZ4W8J",
  "ascApiKeyPath": "./credentials/AuthKey_CKTYH9UR2C.p8",  // gitignored
  "ascApiKeyId": "CKTYH9UR2C",
  "ascApiKeyIssuerId": "7dcd79de-f80a-4f23-beae-0a0f57b97152"
}
```

Wysyłka builda na TestFlight (podmień `--id` na najnowszy FINISHED build):

```bash
cd apps/mobile
eas submit --profile production --platform ios --id <BUILD_ID> --non-interactive
```

Kolejne kroki (Twoje, w panelu ASC):
1. Karta apki (App Store): opis/zrzuty z `apps/mobile/store/listing.md`, polityka prywatności
   `https://e-logistic-one.vercel.app/privacy`, „App Privacy" wg ściągi Data safety.
2. TestFlight: dodaj testerów (test wewnętrzny — natychmiast po przetworzeniu binarki).
3. Wyślij do recenzji Apple (zwykle 24–48 h).

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
