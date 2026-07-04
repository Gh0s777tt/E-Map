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
