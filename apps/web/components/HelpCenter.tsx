"use client";

import { cssPalette as palette } from "@e-logistic/ui";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./HelpCenter.module.css";

type Help = { title: string; intro: string; items: { name: string; desc: string }[] };

/** Pomoc kontekstowa per panel — co robi i jak działa każda funkcja. */
const HELP: Record<string, Help> = {
  "/dashboard": {
    title: "Pulpit",
    intro: "Szybki przegląd firmy: przypomnienia o terminach i skróty do modułów.",
    items: [
      { name: "Przypomnienia", desc: "Pojazdy z kończącym się przeglądem / OC / leasingiem." },
      { name: "Utwórz firmę", desc: "Pierwsze logowanie: zakłada firmę i czyni Cię właścicielem." },
    ],
  },
  "/vehicles": {
    title: "Pojazdy",
    intro:
      "Kartoteka floty. Kierowca widzi tylko przypisane auto; właściciel/spedytor — wszystkie.",
    items: [
      {
        name: "Dodaj/Edytuj/Usuń",
        desc: "Marka z listy, VIN, waga własna, przegląd, OC + ubezpieczyciel, licencja.",
      },
      {
        name: "Rozwiń auto",
        desc: "Kliknij wiersz, by zobaczyć szczegóły i karty przypisane do pojazdu.",
      },
    ],
  },
  "/drivers": {
    title: "Kierowcy",
    intro: "Zapraszanie do firmy oraz kartoteka kadrowa (dane wrażliwe szyfrowane).",
    items: [
      {
        name: "Zaproszenie (link/QR)",
        desc: "Wybierz auto i wygeneruj zaproszenie — kierowca dołącza po zalogowaniu.",
      },
      {
        name: "Kartoteka",
        desc: "Dane osobowe, kategorie i uprawnienia. Numery dokumentów szyfrowane; odsłaniane na żądanie (audyt).",
      },
    ],
  },
  "/cards": {
    title: "Karty paliwowe",
    intro: "Karty floty z grafiką marki. PIN szyfrowany; kierowca może go odsłonić przy automacie.",
    items: [
      {
        name: "Dodaj/Edytuj/Usuń",
        desc: "Dostawca, numer, ważność, rabat, przypisanie do pojazdu (tylko właściciel).",
      },
      {
        name: "Pokaż PIN",
        desc: "Odsłonięcie zaszyfrowanego PIN-u (audytowane). Rabaty widzi tylko właściciel/spedytor.",
      },
    ],
  },
  "/forms": {
    title: "Formularze",
    intro: "Paliwo, AdBlue i Trasa. Działają offline — synchronizują się po połączeniu.",
    items: [
      {
        name: "Wyszukaj miejsce",
        desc: "Wpisz adres/miasto → automatycznie ustawia współrzędne GPS.",
      },
      {
        name: "Trasa: waga",
        desc: "Przy załadunku ponad ładowność pojazdu zobaczysz alert i powiadomienie dla kadry.",
      },
    ],
  },
  "/map": {
    title: "Mapa",
    intro: "Trasy przez przystanki, POI, zgłoszenia. Podkład wektorowy / satelita / teren 3D.",
    items: [
      { name: "Wyszukiwarka", desc: "Dowolne miasto/adres jako start, cel lub przystanek." },
      {
        name: "Wytycz trasę",
        desc: "Dystans, czas, myto i szacowany koszt paliwa (spalanie × cena × rabat karty).",
      },
      {
        name: "POI / zgłoszenia",
        desc: "Stacje/parkingi (też wzdłuż trasy) oraz zgłoszenia realtime (wypadek/policja/waga).",
      },
    ],
  },
  "/stats": {
    title: "Statystyki",
    intro: "Spalanie, koszty i podsumowania liczone ze współdzielonego silnika rozliczeń.",
    items: [{ name: "Podsumowania", desc: "Litry, dystans, średnie spalanie i wydatki." }],
  },
  "/settings": {
    title: "Ustawienia",
    intro: "Bezpieczeństwo konta.",
    items: [
      { name: "2FA", desc: "Weryfikacja dwuetapowa kodem z aplikacji (Authenticator)." },
      { name: "Passkey", desc: "Logowanie bez hasła (odcisk/Face ID/klucz sprzętowy)." },
    ],
  },
  "/team": {
    title: "Zespół i uprawnienia",
    intro: "Właściciel nadaje role i moduły — decyduje, kto widzi które panele i dane.",
    items: [
      {
        name: "Rola",
        desc: "Spedytor = pełny wgląd w firmę; kierowca = tylko swoje auto i formularze.",
      },
      { name: "Moduły", desc: "Włącz/wyłącz panele (pojazdy, karty, kierowcy, mapa…) per osoba." },
    ],
  },
};

const TOUR: { title: string; body: string }[] = [
  {
    title: "Witaj w E-Logistic 👋",
    body: "Krótko pokażemy, gdzie co jest. Pomoc „?” jest zawsze w prawym dolnym rogu.",
  },
  {
    title: "Pojazdy i kierowcy",
    body: "Dodaj flotę i kadrę. Kierowców zapraszasz linkiem/QR i przypisujesz do auta.",
  },
  {
    title: "Karty paliwowe",
    body: "Dodaj karty (z grafiką marki). PIN jest szyfrowany; rabaty widzi tylko właściciel.",
  },
  {
    title: "Formularze offline",
    body: "Paliwo/AdBlue/Trasa działają bez sieci i synchronizują się później. Adres → GPS.",
  },
  {
    title: "Mapa i koszty",
    body: "Wytyczysz trasę z mytem i kosztem paliwa; zobaczysz POI i zgłoszenia na żywo.",
  },
  {
    title: "Zespół i uprawnienia",
    body: "Jako właściciel decydujesz, kto widzi które panele i dane (panel „Zespół”).",
  },
];

const FALLBACK_HELP: Help = {
  title: "E-Logistic",
  intro: "Wybierz panel z menu po lewej. Pomoc „?” jest zawsze dostępna.",
  items: [],
};

function helpFor(pathname: string): Help {
  const key = Object.keys(HELP).find((k) => pathname.startsWith(k));
  return (key ? HELP[key] : undefined) ?? FALLBACK_HELP;
}

export function HelpCenter() {
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);
  const [step, setStep] = useState<number | null>(null);

  useEffect(() => {
    try {
      if (!localStorage.getItem("elog_tour_done")) setStep(0);
    } catch {
      // brak localStorage
    }
  }, []);

  function endTour() {
    setStep(null);
    try {
      localStorage.setItem("elog_tour_done", "1");
    } catch {
      // ignoruj
    }
  }

  const help = helpFor(pathname);

  return (
    <>
      <button
        type="button"
        className={styles.fab}
        onClick={() => setDrawer((v) => !v)}
        aria-label="Pomoc"
      >
        ?
      </button>

      {drawer && (
        <div className={styles.drawer}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong style={{ fontSize: 16 }}>Pomoc — {help.title}</strong>
            <button type="button" className={styles.close} onClick={() => setDrawer(false)}>
              ✕
            </button>
          </div>
          <p style={{ color: palette.smoke, fontSize: 13, marginTop: 6 }}>{help.intro}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
            {help.items.map((it) => (
              <div key={it.name} className={styles.helpItem}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{it.name}</div>
                <div style={{ color: palette.smoke, fontSize: 12 }}>{it.desc}</div>
              </div>
            ))}
          </div>
          <button
            type="button"
            className={styles.tourBtn}
            onClick={() => {
              setDrawer(false);
              setStep(0);
            }}
          >
            ▶ Pokaż oprowadzenie po aplikacji
          </button>
        </div>
      )}

      {step !== null && TOUR[step] && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <div style={{ fontSize: 12, color: palette.smoke }}>
              Krok {step + 1} z {TOUR.length}
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: "6px 0 8px" }}>
              {TOUR[step].title}
            </h2>
            <p style={{ color: palette.offWhite, fontSize: 14, margin: 0 }}>{TOUR[step].body}</p>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18 }}>
              <button type="button" className={styles.skip} onClick={endTour}>
                Pomiń
              </button>
              <button
                type="button"
                className={styles.next}
                onClick={() => (step + 1 >= TOUR.length ? endTour() : setStep(step + 1))}
              >
                {step + 1 >= TOUR.length ? "Zakończ" : "Dalej"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
