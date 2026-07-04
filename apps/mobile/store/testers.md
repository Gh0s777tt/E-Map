# Test zamknięty — zestaw rekrutacyjny (12+ testerów × 14 dni)

Cel: **≥12 testerów z opt-in nieprzerwanie przez 14 dni** (wymóg konta osobistego).
Rekrutujemy **15–16 osób** na zapas — jak ktoś się wypisze, licznik nie spadnie poniżej 12.

## Wiadomość do wysłania (Discord / WhatsApp / SMS) — szablon

> **Pomożesz mi opublikować aplikację w Google Play? Zajmie Ci to 2 minuty. 🙏**
>
> Robię aplikację **E-Logistic** (zarządzanie flotą i zleceniami dla transportu).
> Google wymaga, żeby przed publikacją przez 14 dni było zapisanych 12 testerów.
>
> Co musisz zrobić (Android):
> 1. Kliknij link: `<< LINK OPT-IN — wklej z Play Console >>`
> 2. Kliknij **„Zostań testerem"** (zaloguj się na konto Google, jeśli poprosi)
> 3. Zainstaluj aplikację ze Sklepu Play (link pokaże się po zapisaniu)
> 4. **Nie odinstalowuj i nie wypisuj się przez 2 tygodnie** — to wszystko!
>
> Nie musisz nic testować ani używać — wystarczy być zapisanym. Ale jak klikniesz
> po aplikacji i powiesz co Ci zgrzyta, stawiam piwo. 🍺

## Instrukcja krok po kroku (Play Console)

1. **Utwórz aplikację** (jeśli jeszcze nie): Wszystkie aplikacje → Utwórz aplikację.
2. Dokończ **checklistę konfiguracji** (polityka prywatności = `https://e-logistic-one.vercel.app/privacy`,
   Data safety wg ściągi z `listing.md`, IARC, grupa docelowa 18+).
3. **Testy → Test zamknięty** → ścieżka „Beta" → **Utwórz wydanie** → wgraj `.aab`
   (z `eas build --profile production -p android`) → zapisz i opublikuj ścieżkę.
4. Zakładka **Testerzy** → „Utwórz listę e-mail" → wklej adresy Gmail testerów →
   zaznacz listę → **Zapisz**.
5. Skopiuj **„Skopiuj link"** (opt-in) → wklej do szablonu powyżej → roześlij.
6. Monitoruj: Test zamknięty → Testerzy → licznik zapisanych. Cel: ≥12 bez przerwy.

## Pula testerów — tracking (wpisuj na bieżąco)

| # | Kto (skąd) | E-mail (Gmail) | Zaproszony | Opt-in ✓ |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |
| 6 | | | | |
| 7 | | | | |
| 8 | | | | |
| 9 | | | | |
| 10 | | | | |
| 11 | | | | |
| 12 | | | | |
| 13 (zapas) | | | | |
| 14 (zapas) | | | | |
| 15 (zapas) | | | | |
| 16 (zapas) | | | | |

Źródła: kierowcy/rodzina/znajomi · społeczność Discorda (E-Bot) · r/AndroidClosedTesting
(wzajemne testowanie — Ty zapisujesz się komuś, ktoś Tobie).

## Kalendarz

- **Dzień 0:** upload `.aab` + lista testerów + rozesłanie linku.
- **Dzień 0–2:** dopchnięcie do ≥12 opt-in (licznik w konsoli!). Od tego momentu liczy się 14 dni.
- **Dzień 1–14:** QA własne (mapa M3, szyfrowana sesja, push, offline) + screenshoty do karty; można wgrywać poprawki do tej samej ścieżki.
- **Dzień 14+:** Konsola → **„Złóż wniosek o dostęp do wersji produkcyjnej"** → formularz (opisz realne QA) → po akceptacji: wydanie produkcyjne.
