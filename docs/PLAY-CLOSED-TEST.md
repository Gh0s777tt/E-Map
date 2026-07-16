<!-- Procedura odblokowania produkcji w Google Play dla KONTA PRYWATNEGO (E-Forge). -->

# 🔓 Google Play — test zamknięty → dostęp do produkcji (E-Logistic)

Konto **E-Forge** to **konto prywatne**, więc Google wymaga przed produkcją:
**12 testerów** w torze **zamkniętym**, opt-in, przez **min. 14 dni ciągiem**.
Stan obecnie: **0 testerów**, test nie ruszył. To jedyny blocker czasowy.

> ⚠️ **Testy WEWNĘTRZNE się NIE liczą.** Liczy się wyłącznie tor **zamknięty** (closed / „alpha").
> ⚠️ 14 dni to czas kalendarzowy — nie da się skrócić.

---

## Krok 1 — Wersja na torze zamkniętym ✅ (w toku)
`eas.json` → `submit.production.android.track = "alpha"` (zmienione). Build **#356** po zakończeniu
auto-submit trafi na tor **zamknięty (alpha)**. To spełnia „Opublikuj wersję do testów zamkniętych".
*(Jeśli tor „alpha" nie istnieje w konsoli, submit zgłosi błąd — wtedy utwórz tor: krok 2.)*

## Krok 2 — Utwórz/otwórz tor zamknięty i dodaj testerów
Play Console → **E-Logistic → Testuj i publikuj → Testowanie → Testy zamknięte**.
1. Otwórz tor **Alpha** (lub „Utwórz tor").
2. Zakładka **Testerzy** → dodaj listę:
   - **Rekomendacja: Grupa Google** (np. `elogistic-testerzy@googlegroups.com`) — łatwiej zarządzać niż lista e-maili.
   - albo **lista e-mail** — wklej ≥12 adresów Gmail testerów.
3. Skopiuj **link opt-in** („Jak testerzy dołączają") i wyślij go testerom.

## Krok 3 — Testerzy akceptują (opt-in)
Każdy z 12 testerów otwiera link opt-in → „Zostań testerem" → instaluje apkę z Google Play.
**Musi zaakceptować co najmniej 12 różnych kont** — inaczej licznik nie dojdzie do 12.

## Krok 4 — Odczekaj 14 dni
Utrzymuj **≥12 testerów opted-in przez 14 kolejnych dni**. Panel pokaże licznik
„W teście bierze udział X testerów" i postęp.

## Krok 5 — Poproś o produkcję
Po 14 dniach z 12+ testerami przycisk **„Poproś o opublikowanie wersji produkcyjnej"**
przestaje być wyszarzony. Kliknij → odpowiedz na krótki kwestionariusz o teście →
Google zweryfikuje → odblokowuje tor **Produkcja**. Wtedy promujesz build z zamkniętego do produkcji.

---

## Checklist równoległy (rób w tym samym czasie, żeby nie tracić dni)
- [ ] **Główna strona sklepu** (11/11 konfiguracji) — teksty w [PLAY-STORE-LISTING.md](PLAY-STORE-LISTING.md), grafiki do dostarczenia.
- [ ] 12 testerów (konta Gmail) — zbierz e-maile / załóż Grupę Google.
- [ ] Wyślij testerom link opt-in.
- [ ] Zacznij liczyć 14 dni od momentu, gdy jest 12 opted-in.

## Czego NIE mogę zrobić za Ciebie
- Dostarczyć **realnych 12 testerów** (potrzebne prawdziwe konta Gmail).
- Skrócić **14 dni**.
- Zrobić **zrzutów ekranu / grafiki promocyjnej** (trzeba z realnej apki).

Mogę natomiast: **założyć tor i wpisać listę testerów w konsoli**, gdy podasz 12 e-maili lub adres Grupy Google;
oraz **wkleić teksty strony sklepu**, gdy dasz zielone światło.
