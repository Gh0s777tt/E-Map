# Karta sklepu Google Play — materiały (E-Logistic)

Gotowe do wklejenia w Play Console → Obecność w sklepie → Główna karta sklepu.

## Nazwa aplikacji (maks. 30 znaków)

```
E-Logistic — flota i zlecenia
```

## Krótki opis (maks. 80 znaków)

```
Flota, zlecenia, CMR/POD, paliwo i mapa TIR — działa offline, w Twojej firmie.
```

## Pełny opis (maks. 4000 znaków)

```
E-Logistic to platforma dla firm transportowych: aplikacja kierowcy + panel dla właściciela i spedytora.

DLA KIEROWCY
• Zlecenia z pełnymi danymi załadunku i rozładunku, zmiana statusów jednym dotknięciem
• Dokumentacja ładunku: zdjęcia z aparatu, CMR oraz podpis odbiorcy (POD) na ekranie
• Formularze Paliwo / AdBlue / Trasa — działają BEZ ZASIĘGU i synchronizują się po powrocie sieci
• Mapa TIR: Twoja pozycja, parkingi dla ciężarówek i stacje paliw w okolicy
• Powiadomienia push o nowych zleceniach i terminach

DLA WŁAŚCICIELA I SPEDYTORA (panel web)
• Flota: pojazdy, naczepy, przeglądy, OC, leasing, karty paliwowe z rabatami
• Zlecenia, faktury VAT z eksportem do Fakturowni, rentowność tras i klientów
• Rozliczenia kierowców: diety, czas pracy, wypłaty
• Statystyki spalania i kosztów liczone z realnych tankowań
• Przypomnienia o terminach: przeglądy, ubezpieczenia, badania kierowców

BEZPIECZEŃSTWO
• Dane firmy odizolowane od innych firm (Row Level Security)
• Sesja na urządzeniu szyfrowana (klucz w systemowym keychainie)
• Dane osobowe kierowców szyfrowane w bazie, transmisja wyłącznie HTTPS
• Logowanie z 2FA i passkey

Aplikacja przeznaczona dla firm — konto kierowcy tworzy Twoja firma transportowa (zaproszenie link/QR).

Polityka prywatności: https://e-logistic-one.vercel.app/privacy
```

## Grafiki (w tym katalogu)

| Plik | Zastosowanie | Wymiar |
|---|---|---|
| `icon-512.png` | Ikona aplikacji (karta sklepu) | 512×512 |
| `feature-graphic-1024x500.png` | Grafika promocyjna (feature graphic) | 1024×500 |

Regeneracja: `node scripts/gen-store-assets.mjs` (motyw i geometria wspólne z ikonami aplikacji).

## Zrzuty ekranu (do zrobienia podczas QA na urządzeniu)

Minimum 2, zalecane 4–8 (telefon, 16:9 lub natywne):
1. Pulpit z kaflami (zlecenia / paliwo / mapa)
2. Mapa z POI (parkingi + stacje)
3. Lista „Moje zlecenia"
4. Formularz Trasa (offline)

## Deklaracja „Data safety" (ściąga — zgodna z /privacy)

- Lokalizacja (dokładna): zbierana, tylko podczas używania, cel: funkcje aplikacji (mapa). NIE udostępniana.
- Zdjęcia: zbierane, cel: funkcje aplikacji (dokumentacja ładunku/POD). NIE udostępniane.
- Dane osobowe (imię, e-mail): zbierane, cel: zarządzanie kontem/flotą. NIE udostępniane.
- Identyfikatory urządzenia (token push): zbierane, cel: powiadomienia.
- Dane szyfrowane w tranzycie: TAK. Możliwość żądania usunięcia: TAK (e-mail z polityki).

## Test zamknięty — wymóg konta osobistego (12 testerów × 14 dni)

Konto dewelopera jest **osobiste** (zweryfikowane 2026-07), więc przed pierwszą publikacją
produkcyjną Google wymaga testu zamkniętego: **min. 12 testerów zapisanych nieprzerwanie
przez 14 ostatnich dni**. Procedura:

1. Play Console → **Testy → Test zamknięty** → utwórz ścieżkę (np. "Beta") → wgraj `.aab`.
2. Zakładka **Testerzy** → utwórz listę e-mail (konta Google testerów) → zapisz → skopiuj
   **link do dołączenia** (web + Android) i roześlij.
3. Każdy tester MUSI kliknąć opt-in w linku i zainstalować apkę ze Sklepu. Licznik
   aktywnych testerów widać w konsoli — pilnuj, żeby nie spadł poniżej 12 (dodaj 15–16 osób
   na zapas).
4. Po **14 nieprzerwanych dniach** w konsoli pojawi się **"Złóż wniosek o dostęp do
   produkcji"** → formularz (jak testowano, co poprawiono) → zwykle akceptacja w kilka dni.
5. W trakcie 14 dni można normalnie wgrywać kolejne wersje do tej samej ścieżki.

Skąd wziąć 12 testerów: kierowcy/znajomi firmy · społeczność Discorda (E-Bot!) ·
r/AndroidClosedTesting i grupy "closed testing" (wzajemne testowanie). Testerem może być
każde konto Google — nie musi być aktywnym użytkownikiem logistyki.
