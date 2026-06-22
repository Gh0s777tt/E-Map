<!-- SYNC: v0.71.0 · #095 · 2026-06-22 — utrzymywane ręcznie do czasu `pnpm docs:check` (badge wersji + blurb „Najnowsze") -->
<!-- ╔══════════════════════════════════════════════════════════════════╗ -->
<!-- ║                       E - L O G I S T I C                         ║ -->
<!-- ╚══════════════════════════════════════════════════════════════════╝ -->

<div align="center">

# 🚛 E‑LOGISTIC &nbsp;·&nbsp; GH0ST EMPIRE

### ⟣ Platforma dla kierowców, spedytorów i firm transportowych ⟣
### ⟣ Web · iOS · Android · macOS — offline-first ⟣

<br/>

![Wersja](https://img.shields.io/badge/wersja-0.69.0-E50914?style=for-the-badge&labelColor=0a0a0a)
![Status](https://img.shields.io/badge/status-Faza_2-E50914?style=for-the-badge&labelColor=0a0a0a)
![Licencja](https://img.shields.io/badge/licencja-PROPRIETARY-E50914?style=for-the-badge&labelColor=0a0a0a)
![Repo](https://img.shields.io/badge/repo-publiczne-E50914?style=for-the-badge&labelColor=0a0a0a)

<br/>

**[ ▶ Demo na żywo » e-logistic-one.vercel.app ](https://e-logistic-one.vercel.app)** &nbsp;·&nbsp; **[ ☁️ Wdrożenie »](DEPLOY.md)**

<br/>

**[ 🧠 Architektura »](docs/ARCHITECTURE.md)** &nbsp;·&nbsp;
**[ 🗺️ Roadmapa »](docs/ROADMAP.md)** &nbsp;·&nbsp;
**[ 🧱 Model danych »](docs/DATA-MODEL.md)** &nbsp;·&nbsp;
**[ 📐 Analiza/Right-sizing »](docs/ANALIZA.md)** &nbsp;·&nbsp;
**[ 📜 Changelog »](CHANGELOG.md)**

</div>

<br/>

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## ✨ O projekcie

**E‑Logistic** to wieloplatformowy ekosystem dla branży transportowej: aplikacja
dla **kierowców** (telefon/tablet, działa **bez zasięgu**), panel dla **spedytorów**,
dashboard dla **właścicieli firm** oraz **panel developerski** do kontroli całości.

Trzy filary produktu:

1. **Operacje floty** — pojazdy, kierowcy, formularze Paliwo / AdBlue / Trip, pełna
   historia i edycja, działanie offline z synchronizacją po odzyskaniu sieci.
2. **Statystyki i rozliczenia** — spalanie, koszty paliwa po rabatach kart, AdBlue,
   uszkodzenia, stawka za km, **zysk z trasy** liczony automatycznie z formularzy.
3. **Mapa ciężarówkowa** — routing dla TIR-ów (wymiary/waga), myto liczone na odcinki,
   omijanie krajów/promów/płatnych dróg, parkingi/stacje z udogodnieniami, zgłoszenia
   społecznościowe (wypadki, policja, wagi) i ceny paliw budowane z danych kierowców.

> **Right-sized** (patrz [`docs/ANALIZA.md`](docs/ANALIZA.md)): startujemy od wąskiego,
> działającego produktu (flota + formularze + statystyki — **bez drogich API map**),
> a mapę dokładamy warstwami. Część zarobkowa działa od Fazy 1.

<br/>

## 🧩 Moduły

| Moduł | Opis | Status |
|:--|:--|:--:|
| 🚚 **Flota** | Pojazdy (wymiary, zbiorniki, przeglądy, OC, leasing, VIN), kierowcy (PII szyfrowane), zaproszenia (link/QR) | ![](https://img.shields.io/badge/-gotowe-22c55e?labelColor=0a0a0a) |
| ⛽ **Formularze** | Paliwo · AdBlue · Trip, offline-first, historia+edycja, podpowiedź ceny z historii | ![](https://img.shields.io/badge/-gotowe-22c55e?labelColor=0a0a0a) |
| 🔧 **Usterki** | Zgłaszanie uszkodzeń + graficzny schemat auta (auto‑zaznaczanie), workflow mechanika | ![](https://img.shields.io/badge/-gotowe-22c55e?labelColor=0a0a0a) |
| 📊 **Statystyki** | Spalanie (full‑to‑full), koszt po rabatach, AdBlue, podział na pojazdy/tankowania | ![](https://img.shields.io/badge/-gotowe-22c55e?labelColor=0a0a0a) |
| 🧾 **Rozliczenia** | Koszt/przychód/zysk/marża per pojazd i okres, eksport CSV + wydruk/PDF | ![](https://img.shields.io/badge/-gotowe-22c55e?labelColor=0a0a0a) |
| 🗺️ **Mapa TIR** | Routing wg wymiarów/osi + realne myto + ruch, POI, ceny paliwa (DE), filtr stacji wg kart, 3D | ![](https://img.shields.io/badge/-gotowe-22c55e?labelColor=0a0a0a) |
| 📡 **Społeczność** | Zgłoszenia realtime (wypadki/policja/wagi/korki) na mapie | ![](https://img.shields.io/badge/-gotowe-22c55e?labelColor=0a0a0a) |
| 🔔 **Powiadomienia** | W aplikacji (terminy/przeładowanie/usterki) + push (Web Push, VAPID) | ![](https://img.shields.io/badge/-gotowe-22c55e?labelColor=0a0a0a) |
| 🔐 **Konta i role** | Owner / Spedytor / Kierowca / Developer · OAuth · passkey · magic link · 2FA (egzekwowane) · RLS · moduły | ![](https://img.shields.io/badge/-gotowe-22c55e?labelColor=0a0a0a) |

<br/>

## 🗺️ Architektura (skrót)

```mermaid
flowchart LR
  D([🚛 Kierowca<br/>iOS·Android]) -->|formularze offline| MOB
  O([🏢 Właściciel/Spedytor]) -->|zarządzanie·statystyki| WEB
  DEV([🛠️ Developer]) -->|kontrola·diagnostyka| WEB

  MOB["📱 apps/mobile<br/>Expo · RN New Arch"] -->|współdzieli| CORE
  WEB["🖥️ apps/web<br/>Next.js 16 · React 19"] -->|współdzieli| CORE
  CORE[["📦 packages/core<br/>typy · Zod · rozliczenia"]]

  MOB -->|lokalny SQLite| PS["🔁 PowerSync<br/>offline sync"]
  PS <-->|sync rules + RLS| SB[("🟢 Supabase<br/>Postgres 17 · PostGIS")]
  WEB -->|odczyt/zapis| SB

  SB -->|realtime| INC{{📡 Zgłoszenia · ceny paliw}}
  MAPADP["🧭 RoutingProvider<br/>(adapter)"] -->|HERE / GraphHopper| TOLL{{🛣️ Routing TIR + myto}}
  MOB & WEB -->|render| ML["🗺️ MapLibre GL<br/>styl red/black"]
  MOB & WEB --> MAPADP
```

<br/>

## 🧱 Stack technologiczny

![Node](https://img.shields.io/badge/Node_26-0a0a0a?style=for-the-badge&logo=nodedotjs&logoColor=E50914)
![TypeScript](https://img.shields.io/badge/TypeScript_6-0a0a0a?style=for-the-badge&logo=typescript&logoColor=E50914)
![React](https://img.shields.io/badge/React_19-0a0a0a?style=for-the-badge&logo=react&logoColor=E50914)
![Next.js](https://img.shields.io/badge/Next.js_16-0a0a0a?style=for-the-badge&logo=nextdotjs&logoColor=E50914)
![Expo](https://img.shields.io/badge/Expo_SDK-0a0a0a?style=for-the-badge&logo=expo&logoColor=E50914)
![Tailwind](https://img.shields.io/badge/Tailwind_4-0a0a0a?style=for-the-badge&logo=tailwindcss&logoColor=E50914)
![Supabase](https://img.shields.io/badge/Supabase-0a0a0a?style=for-the-badge&logo=supabase&logoColor=E50914)
![PostGIS](https://img.shields.io/badge/PostGIS-0a0a0a?style=for-the-badge&logo=postgresql&logoColor=E50914)
![MapLibre](https://img.shields.io/badge/MapLibre_GL-0a0a0a?style=for-the-badge&logo=maplibre&logoColor=E50914)
![Biome](https://img.shields.io/badge/Biome-0a0a0a?style=for-the-badge&logo=biome&logoColor=E50914)

Szczegóły, wersje i uzasadnienia → [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

<br/>

## 📁 Struktura repo (docelowa)

```
E-Logistic/
├── apps/
│   ├── web/            # Next.js 16 — dashboard (owner / spedytor / dev)
│   └── mobile/         # Expo — aplikacja kierowcy (iOS / Android)
├── packages/
│   ├── core/           # domena, typy, Zod, silnik rozliczeń (czysty TS)
│   ├── api/            # klient Supabase, warstwa danych, sync
│   ├── ui/             # tokeny motywu red/black, współdzielone komponenty
│   ├── maps/           # abstrakcja RoutingProvider + adaptery (HERE/GraphHopper)
│   └── i18n/           # tłumaczenia ×14
├── supabase/
│   ├── migrations/     # SQL: schema + RLS + PostGIS
│   └── functions/      # Edge Functions (Deno)
├── docs/               # ARCHITECTURE · ROADMAP · DATA-MODEL · ANALIZA
└── .github/workflows/  # ci.yml · codeql.yml
```

<br/>

---

<div align="center">

**GH0ST EMPIRE** &nbsp;·&nbsp; 👻🔴⚫ &nbsp;·&nbsp; oprogramowanie własnościowe

</div>
