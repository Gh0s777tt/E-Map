# Polityka bezpieczeństwa — E‑Logistic

Bezpieczeństwo danych kierowców i firm transportowych traktujemy priorytetowo
(multi‑tenant przez RLS, szyfrowanie PII, PIN‑y kart w Vault). Dziękujemy za
odpowiedzialne zgłaszanie podatności.

## Jak zgłosić podatność

**Nie otwieraj publicznego zgłoszenia (issue) dla luk bezpieczeństwa.**

Preferowane kanały:
1. **E‑mail:** `admin@e-logistic.app` — w temacie dopisz `[SECURITY]`.
2. **GitLab:** poufne zgłoszenie (issue z zaznaczoną opcją *Confidential*)
   w repozytorium źródłowym `gitlab.com/Gh0s777tt/e-logistic`.

W zgłoszeniu opisz: wektor, kroki reprodukcji, wpływ i (jeśli możliwe) sugestię
naprawy. Nie testuj na cudzych danych produkcyjnych ani nie eksfiltruj danych.

## Czego oczekiwać

- **Potwierdzenie** przyjęcia zgłoszenia: do 72 h.
- **Wstępna ocena** i klasyfikacja istotności: do 7 dni.
- **Naprawa**: krytyczne — możliwie najszybciej; pozostałe wg priorytetu.
- Po naprawie i wdrożeniu — uznanie autora zgłoszenia (jeśli sobie życzy).

## Zakres

- Kod w tym repozytorium (`apps/*`, `packages/*`, `supabase/*`).
- Aplikacja web (Vercel) i mobilna (iOS/Android).

Poza zakresem: ataki wymagające dostępu fizycznego do odblokowanego urządzenia,
socjotechnika, DoS/wolumetria, raporty z automatycznych skanerów bez dowodu wpływu.

## Ujawnianie

Prosimy o **skoordynowane ujawnianie**: nie publikuj szczegółów przed wydaniem
poprawki i uzgodnieniem terminu. Repozytorium jest publiczne poglądowo, ale
szczegóły podatności (w tym wewnętrzne raporty audytowe) nie są upubliczniane.
