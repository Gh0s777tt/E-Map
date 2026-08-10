import { describe, expect, it } from "vitest";
import {
  describeOpeningWeek,
  getOpeningHoursStatus,
  type LocalMoment,
  localMomentFromDate,
} from "./openingHours";

/** Skrót: poniedziałek = 0 … niedziela = 6. */
function at(weekday: number, hhmm: string): LocalMoment {
  const [h, m] = hhmm.split(":");
  return {
    weekday: weekday as LocalMoment["weekday"],
    minutesOfDay: Number(h) * 60 + Number(m),
  };
}

const MON = 0;
const TUE = 1;
const FRI = 4;
const SAT = 5;
const SUN = 6;

describe("getOpeningHoursStatus — typowe stacje", () => {
  const standard = "Mo-Fr 06:00-22:00; Sa 08:00-14:00";

  it("w godzinach pracy podaje godzinę zamknięcia", () => {
    // Podstawowy przypadek z dymka: kierowca musi wiedzieć, ile ma czasu na dojazd.
    const s = getOpeningHoursStatus(standard, at(MON, "10:00"));
    expect(s.state).toBe("open");
    expect(s.closesAt).toEqual({ weekday: MON, time: "22:00" });
  });

  it("przed otwarciem podaje najbliższe otwarcie tego samego dnia", () => {
    const s = getOpeningHoursStatus(standard, at(MON, "05:00"));
    expect(s.state).toBe("closed");
    expect(s.opensAt).toEqual({ weekday: MON, time: "06:00" });
  });

  it("w sobotę po 14:00 przeskakuje przez niedzielę na poniedziałek", () => {
    // Najczęstszy błąd naiwnych parserów: „otwiera jutro", choć w niedzielę nieczynne.
    const s = getOpeningHoursStatus(standard, at(SAT, "15:00"));
    expect(s.state).toBe("closed");
    expect(s.opensAt).toEqual({ weekday: MON, time: "06:00" });
  });

  it("dzień nieobjęty żadną regułą jest zamknięty", () => {
    // `Mo-Fr … ; Sa …` nie wymienia niedzieli — w OSM to znaczy „zamknięte",
    // i tylko dlatego wolno nam tu twierdzić „zamknięte".
    const s = getOpeningHoursStatus(standard, at(SUN, "12:00"));
    expect(s.state).toBe("closed");
    expect(s.opensAt).toEqual({ weekday: MON, time: "06:00" });
  });
});

describe("getOpeningHoursStatus — całodobowe", () => {
  it("24/7 jest zawsze otwarte i nigdy się nie zamyka", () => {
    const s = getOpeningHoursStatus("24/7", at(SUN, "03:17"));
    expect(s.state).toBe("open");
    // `null` zamiast zmyślonej godziny — 24/7 nie ma godziny zamknięcia.
    expect(s.closesAt).toBeNull();
  });

  it("Mo-Su 00:00-24:00 to zapis równoważny 24/7", () => {
    // Ten sam sens, inny zapis — obie formy występują w OSM i nie mogą dawać
    // różnych odpowiedzi (np. „zamknięte o północy").
    const s = getOpeningHoursStatus("Mo-Su 00:00-24:00", at(TUE, "00:00"));
    expect(s.state).toBe("open");
    expect(s.closesAt).toBeNull();
    expect(describeOpeningWeek("Mo-Su 00:00-24:00").alwaysOpen).toBe(true);
  });
});

describe("getOpeningHoursStatus — przerwa obiadowa", () => {
  const split = "Mo-Fr 08:00-12:00,13:00-17:00";

  it("w przerwie jest zamknięte i wraca po przerwie", () => {
    // Warsztaty i punkty serwisowe mają przerwy; pominięcie drugiego zakresu
    // dałoby „otwarte do 17:00" o 12:30, czyli wprost nieprawdę.
    const s = getOpeningHoursStatus(split, at(TUE, "12:30"));
    expect(s.state).toBe("closed");
    expect(s.opensAt).toEqual({ weekday: TUE, time: "13:00" });
  });

  it("przed przerwą zamyka o 12:00, nie o 17:00", () => {
    const s = getOpeningHoursStatus(split, at(TUE, "11:00"));
    expect(s.state).toBe("open");
    expect(s.closesAt).toEqual({ weekday: TUE, time: "12:00" });
  });

  it("stykające się zakresy sklejają się w jeden", () => {
    // "12:00-13:00,13:00-18:00" to zapis ciągłej pracy, a nie zamknięcie na 0 minut.
    const s = getOpeningHoursStatus("Mo 12:00-13:00,13:00-18:00", at(MON, "13:00"));
    expect(s.state).toBe("open");
    expect(s.closesAt).toEqual({ weekday: MON, time: "18:00" });
  });
});

describe("getOpeningHoursStatus — off", () => {
  it("Su off nie otwiera się w niedzielę", () => {
    const s = getOpeningHoursStatus("Mo-Sa 07:00-20:00; Su off", at(SUN, "12:00"));
    expect(s.state).toBe("closed");
    expect(s.opensAt).toEqual({ weekday: MON, time: "07:00" });
  });

  it("późniejsza reguła off nadpisuje wcześniejszy zakres dni", () => {
    // `Mo-Su …; Sa off` — bez nadpisywania sobota zostałaby otwarta.
    const s = getOpeningHoursStatus("Mo-Su 08:00-18:00; Sa off", at(SAT, "10:00"));
    expect(s.state).toBe("closed");
    expect(s.opensAt).toEqual({ weekday: SUN, time: "08:00" });
  });
});

describe("getOpeningHoursStatus — zakres przez północ", () => {
  const night = "Mo-Su 22:00-06:00";

  it("o 2 w nocy jest otwarte, a zamyka o 06:00 następnego dnia", () => {
    // Stacja nocna. Naiwne porównanie start<=teraz<koniec dałoby tu „zamknięte"
    // dokładnie wtedy, gdy kierowca najbardziej potrzebuje paliwa.
    const s = getOpeningHoursStatus(night, at(TUE, "02:00"));
    expect(s.state).toBe("open");
    expect(s.closesAt).toEqual({ weekday: TUE, time: "06:00" });
  });

  it("w środku dnia jest zamknięte do wieczora", () => {
    const s = getOpeningHoursStatus(night, at(MON, "12:00"));
    expect(s.state).toBe("closed");
    expect(s.opensAt).toEqual({ weekday: MON, time: "22:00" });
  });

  it("noc z niedzieli na poniedziałek zawija przez koniec tygodnia", () => {
    // Granica tygodnia to drugie miejsce, gdzie parsery gubią otwarcie —
    // niedzielny wieczór musi ciągnąć się w poniedziałkowy poranek.
    const s = getOpeningHoursStatus(night, at(SUN, "23:00"));
    expect(s.state).toBe("open");
    expect(s.closesAt).toEqual({ weekday: MON, time: "06:00" });
  });

  it("poniedziałek o 03:00 jest otwarty dzięki niedzielnemu wieczorowi", () => {
    const s = getOpeningHoursStatus(night, at(MON, "03:00"));
    expect(s.state).toBe("open");
    expect(s.closesAt).toEqual({ weekday: MON, time: "06:00" });
  });

  it("pojedynczy dzień z przejściem przez północ kończy się nazajutrz", () => {
    const s = getOpeningHoursStatus("Fr 22:00-06:00", at(SAT, "02:00"));
    expect(s.state).toBe("open");
    expect(s.closesAt).toEqual({ weekday: SAT, time: "06:00" });
  });
});

describe("getOpeningHoursStatus — święta (PH)", () => {
  it("PH off nie zmienia zwykłego dnia, ale zapala zastrzeżenie", () => {
    // Kalendarza świąt nie mamy, więc reguły PH nie oceniamy. Zwracamy stan dnia
    // tygodnia i flagę, żeby UI dopisało „poza świętami" — inaczej tekst na ekranie
    // twierdziłby więcej, niż kod faktycznie sprawdził.
    const s = getOpeningHoursStatus("Mo-Fr 06:00-22:00; PH off", at(TUE, "10:00"));
    expect(s.state).toBe("open");
    expect(s.closesAt).toEqual({ weekday: TUE, time: "22:00" });
    expect(s.holidaysUnknown).toBe(true);
  });

  it("PH z własnymi godzinami też jest tylko zastrzeżeniem", () => {
    const s = getOpeningHoursStatus("Mo-Fr 08:00-16:00; PH 09:00-13:00", at(FRI, "15:00"));
    expect(s.state).toBe("open");
    expect(s.holidaysUnknown).toBe(true);
  });

  it("SH (ferie szkolne) traktujemy tak samo jak święta", () => {
    const s = getOpeningHoursStatus("Mo-Fr 08:00-16:00; SH off", at(TUE, "09:00"));
    expect(s.state).toBe("open");
    expect(s.holidaysUnknown).toBe(true);
  });

  it("sam PH off bez reguł dla dni tygodnia to stan nieznany, nie zamknięte", () => {
    // Napis nie mówi NIC o zwykłym wtorku. „Zamknięte" byłoby tu zmyśleniem.
    const s = getOpeningHoursStatus("PH off", at(TUE, "10:00"));
    expect(s.state).toBe("unknown");
  });

  it("brak reguły PH nie zapala zastrzeżenia", () => {
    const s = getOpeningHoursStatus("Mo-Fr 06:00-22:00", at(TUE, "10:00"));
    expect(s.holidaysUnknown).toBe(false);
  });
});

describe("getOpeningHoursStatus — kiedy parser ma się poddać", () => {
  /**
   * Każdy z tych napisów jest poprawny w OSM, ale poza naszym podzbiorem.
   * Wynik MUSI być `unknown`; gdyby którykolwiek dał `closed` albo `open`,
   * pokazalibyśmy kierowcy zmyśloną godzinę.
   */
  const przypadki: Array<[string | null | undefined, string]> = [
    [null, "brak tagu w danych OSM"],
    [undefined, "brak tagu w danych OSM"],
    ["", "pusty tag — to brak danych, nie zamknięcie"],
    ["   ", "same białe znaki"],
    ["Jan-Mar Mo-Fr 08:00-16:00", "selektor miesięcy — obiekt sezonowy"],
    ["Mo-Fr sunrise-sunset", "godziny względem wschodu/zachodu słońca"],
    ["Mo-Fr 08:00+", "otwarcie bez podanego końca"],
    ["Mon-Fri 08:00-17:00", "trzyliterowe nazwy dni — nie zgadujemy, co autor miał na myśli"],
    ["Dec 25 off", "wyjątek na konkretną datę"],
    ["Mo-Fr 08:00-16:00 || 24/7", "reguła awaryjna ||"],
    ['Mo-Fr 08:00-16:00 "tylko po zgłoszeniu"', "komentarz w cudzysłowie zmienia sens"],
    ["Mo[1] 08:00-16:00", "n-ty dzień miesiąca"],
    ["week 1-53 Mo-Fr 08:00-16:00", "selektor tygodni roku"],
    ["Mo-Fr", "selektor dni bez godzin"],
    ["Mo 08:00-08:00", "start równy końcowi — bywa czytane jako doba, bywa jako literówka"],
    ["Mo-Fr 25:00-30:00", "godziny poza dobą"],
    ["Mo-Fr 08:00-24:30", "24:30 nie istnieje"],
    ["Mo-Fr 08:00-16:00, Sa 10:00-14:00", "przecinek jako separator reguł, nie zakresów"],
    ["Mo-PH 08:00-16:00", "hybryda dzień–święto"],
  ];

  for (const [expr, powod] of przypadki) {
    it(`nie zgaduje: ${JSON.stringify(expr)} (${powod})`, () => {
      const s = getOpeningHoursStatus(expr, at(TUE, "10:00"));
      expect(s.state).toBe("unknown");
      expect(s.closesAt).toBeNull();
      expect(s.opensAt).toBeNull();
    });
  }

  it("rozróżnia brak danych od formatu, którego nie znamy", () => {
    // UI mówi co innego przy „brak danych o godzinach", a co innego przy
    // „godziny podane w formacie, którego nie umiemy odczytać".
    expect(getOpeningHoursStatus(null, at(TUE, "10:00")).unknownReason).toBe("no-data");
    expect(getOpeningHoursStatus("Mo-Fr 08:00+", at(TUE, "10:00")).unknownReason).toBe(
      "unsupported-format",
    );
  });

  it("jedna niezrozumiała reguła unieważnia cały napis", () => {
    // `Dec 25 off` to nadpisanie. Zignorowanie go i pokazanie „otwarte do 16:00"
    // wysłałoby kierowcę pod zamkniętą bramę 25 grudnia.
    const s = getOpeningHoursStatus("Mo-Fr 08:00-16:00; Dec 25 off", at(TUE, "10:00"));
    expect(s.state).toBe("unknown");
  });

  it("bez wiarygodnej chwili lokalnej nie odpowiada wcale", () => {
    // `null` przychodzi np. z nieznanej strefy czasowej obiektu.
    expect(getOpeningHoursStatus("24/7", null).state).toBe("unknown");
  });

  it("odrzuca chwilę spoza doby", () => {
    const s = getOpeningHoursStatus("24/7", { weekday: 0, minutesOfDay: 1440 });
    expect(s.state).toBe("unknown");
  });
});

describe("getOpeningHoursStatus — formy tolerowane", () => {
  it("same godziny bez dni znaczą codziennie", () => {
    const s = getOpeningHoursStatus("08:00-16:00", at(SUN, "09:00"));
    expect(s.state).toBe("open");
    expect(s.closesAt).toEqual({ weekday: SUN, time: "16:00" });
  });

  it("lista dni po przecinku", () => {
    const s = getOpeningHoursStatus("Mo,We,Fr 08:00-16:00", at(TUE, "09:00"));
    expect(s.state).toBe("closed");
    expect(s.opensAt).toEqual({ weekday: 2, time: "08:00" });
  });

  it("zakres dni zawijający przez niedzielę (Fr-Mo)", () => {
    const s = getOpeningHoursStatus("Fr-Mo 08:00-16:00", at(SUN, "09:00"));
    expect(s.state).toBe("open");
  });

  it("wielkość liter i końcowy średnik nie przeszkadzają", () => {
    const s = getOpeningHoursStatus("mo-fr 06:00-22:00;", at(TUE, "07:00"));
    expect(s.state).toBe("open");
  });

  it("closed czytamy jak off", () => {
    const s = getOpeningHoursStatus("Mo-Sa 07:00-20:00; Su closed", at(SUN, "12:00"));
    expect(s.state).toBe("closed");
  });
});

describe("describeOpeningWeek — rozkład do dymka", () => {
  it("zwraca siedem dni w kolejności Mo..Su", () => {
    const w = describeOpeningWeek("Mo-Fr 06:00-22:00; Sa 08:00-14:00");
    expect(w.known).toBe(true);
    expect(w.days.map((d) => d.code)).toEqual(["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]);
    expect(w.days[0]?.ranges).toEqual(["06:00-22:00"]);
    expect(w.days[5]?.ranges).toEqual(["08:00-14:00"]);
    // Pusta lista = zamknięte; UI podstawia własne słowo, rdzeń nie tłumaczy.
    expect(w.days[6]?.ranges).toEqual([]);
  });

  it("skleja kolejne dni o tych samych godzinach", () => {
    // Dymek ma pokazać „Pn–Pt 06:00–22:00", a nie pięć identycznych wierszy.
    const w = describeOpeningWeek("Mo-Fr 06:00-22:00; Sa 08:00-14:00");
    expect(w.groups).toEqual([
      { from: 0, to: 4, ranges: ["06:00-22:00"] },
      { from: 5, to: 5, ranges: ["08:00-14:00"] },
      { from: 6, to: 6, ranges: [] },
    ]);
  });

  it("pokazuje obie części dnia z przerwą", () => {
    const w = describeOpeningWeek("Mo-Fr 08:00-12:00,13:00-17:00");
    expect(w.days[0]?.ranges).toEqual(["08:00-12:00", "13:00-17:00"]);
  });

  it("zakres przez północ zostaje zapisany tak, jak go czyta człowiek", () => {
    const w = describeOpeningWeek("Mo-Su 22:00-06:00");
    expect(w.days[0]?.ranges).toEqual(["22:00-06:00"]);
    expect(w.groups).toHaveLength(1);
  });

  it("24/7 oznacza cały tydzień jednym wpisem", () => {
    const w = describeOpeningWeek("24/7");
    expect(w.alwaysOpen).toBe(true);
    expect(w.groups).toEqual([{ from: 0, to: 6, ranges: ["00:00-24:00"] }]);
  });

  it("przy PH przenosi zastrzeżenie o świętach", () => {
    const w = describeOpeningWeek("Mo-Fr 06:00-22:00; PH off");
    expect(w.known).toBe(true);
    expect(w.holidaysUnknown).toBe(true);
  });

  it("dla nieznanego formatu nie zmyśla rozkładu", () => {
    // Pusty `days` zmusza UI do pokazania komunikatu zamiast pustej tabelki
    // wyglądającej jak „zamknięte cały tydzień".
    const w = describeOpeningWeek("Mo-Fr sunrise-sunset");
    expect(w.known).toBe(false);
    expect(w.days).toEqual([]);
    expect(w.groups).toEqual([]);
    expect(w.unknownReason).toBe("unsupported-format");
  });

  it("brak tagu to brak danych", () => {
    const w = describeOpeningWeek(null);
    expect(w.known).toBe(false);
    expect(w.unknownReason).toBe("no-data");
  });
});

describe("localMomentFromDate", () => {
  it("przelicza chwilę na czas lokalny podanej strefy", () => {
    // 2026-08-10 10:30 UTC to poniedziałek; w Warszawie (UTC+2 latem) 12:30.
    const date = new Date("2026-08-10T10:30:00Z");
    expect(localMomentFromDate(date, "UTC")).toEqual({ weekday: 0, minutesOfDay: 630 });
    expect(localMomentFromDate(date, "Europe/Warsaw")).toEqual({ weekday: 0, minutesOfDay: 750 });
  });

  it("strefa potrafi przesunąć dzień tygodnia", () => {
    // Ta sama chwila to sobota w UTC i już niedziela w Warszawie. Dla stacji
    // z regułą „Su off" różnica decyduje o odpowiedzi otwarte/zamknięte.
    const date = new Date("2026-08-08T23:30:00Z");
    expect(localMomentFromDate(date, "UTC")).toEqual({ weekday: 5, minutesOfDay: 1410 });
    expect(localMomentFromDate(date, "Europe/Warsaw")).toEqual({ weekday: 6, minutesOfDay: 90 });
  });

  it("północ to minuta 0, a nie 1440", () => {
    const date = new Date("2026-08-10T00:00:00Z");
    expect(localMomentFromDate(date, "UTC")).toEqual({ weekday: 0, minutesOfDay: 0 });
  });

  it("zwraca null zamiast zgadywać przy złej dacie lub strefie", () => {
    // Wynik null propaguje się do stanu `unknown` — nie do „zamknięte".
    expect(localMomentFromDate(new Date("nie-data"), "UTC")).toBeNull();
    expect(localMomentFromDate(new Date("2026-08-10T10:30:00Z"), "Mordor/Barad-dur")).toBeNull();
  });

  it("współpracuje z getOpeningHoursStatus", () => {
    const moment = localMomentFromDate(new Date("2026-08-08T23:30:00Z"), "Europe/Warsaw");
    const s = getOpeningHoursStatus("Mo-Sa 07:00-20:00; Su off", moment);
    expect(s.state).toBe("closed");
    expect(s.opensAt).toEqual({ weekday: MON, time: "07:00" });
  });
});
