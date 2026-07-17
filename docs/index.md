---
hide:
  - navigation
---

# Dokumentacja E‑Logistic

**Platforma dla kierowców, spedytorów i firm transportowych** — Web · iOS · Android · macOS, offline‑first.
To centrum dokumentacji technicznej i produktowej repozytorium. Kod: [`gitlab.com/Gh0s777tt/e-logistic`](https://gitlab.com/Gh0s777tt/e-logistic).

<div class="grid cards" markdown>

-   :material-sitemap:{ .lg .middle } &nbsp; **Architektura**

    ---

    Stack, granice pakietów, decyzje projektowe.

    [:octicons-arrow-right-24: Przegląd](ARCHITECTURE.md)

-   :material-database:{ .lg .middle } &nbsp; **Model danych**

    ---

    Schemat bazy, 82 migracje, PostGIS, RLS.

    [:octicons-arrow-right-24: Model danych](DATA-MODEL.md)

-   :material-shield-lock:{ .lg .middle } &nbsp; **Bezpieczeństwo**

    ---

    Multi‑tenant, polityki RLS, szyfrowanie PII.

    [:octicons-arrow-right-24: Bezpieczeństwo / RLS](SECURITY-RLS.md)

-   :material-map-marker-path:{ .lg .middle } &nbsp; **Roadmapa**

    ---

    Fazy 0–4 i autorytatywny stan dostarczenia.

    [:octicons-arrow-right-24: Roadmapa](ROADMAP.md)

-   :material-rocket-launch:{ .lg .middle } &nbsp; **Wdrożenie**

    ---

    Vercel (web) + EAS (mobile) + zmienne środowiskowe.

    [:octicons-arrow-right-24: Deploy](DEPLOY.md)

-   :material-code-braces:{ .lg .middle } &nbsp; **API (TypeDoc)**

    ---

    Referencja pakietów `core · api · maps · i18n`.

    [:octicons-arrow-right-24: API](api/index.md)

</div>

## Model hostingu

Rozwój prowadzony jest na **GitLab** (źródło prawdy, całe CI/CD), a **GitHub** służy jako publiczny mirror.

| Rola | Repozytorium |
|:--|:--|
| 🦊 Źródło prawdy | [`gitlab.com/Gh0s777tt/e-logistic`](https://gitlab.com/Gh0s777tt/e-logistic) |
| 🐙 Mirror (publiczny) | [`github.com/Gh0s777tt/E-Map`](https://github.com/Gh0s777tt/E-Map) |

!!! note "Spójność z kodem"
    Dokumentacja jest weryfikowana bramką `pnpm docs:check` (wersja, nagłówki SYNC, istnienie katalogów) — zgodnie z zasadą „na bieżąco, bez rozjazdów" z [`CLAUDE.md`](https://gitlab.com/Gh0s777tt/e-logistic/-/blob/main/CLAUDE.md).
