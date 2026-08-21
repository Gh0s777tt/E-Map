"use client";

import { useState } from "react";

/**
 * Ile wierszy montujemy naraz i o ile dokłada „Pokaż kolejne".
 *
 * Dwieście kart mieści się w kilku ekranach przewijania i renderuje się w kilkanaście
 * milisekund — to znacznie więcej, niż ktokolwiek przegląda wzrokiem, zanim sięgnie po
 * filtr. Wyżej nic już nie zyskujemy, bo koszt montowania rośnie liniowo, a użyteczność nie.
 */
const DEFAULT_STEP = 200;

/** Okno renderowania: co pokazać teraz i ile jeszcze czeka. */
export interface RenderWindow<T> {
  /** Wiersze do zamontowania w tej chwili. */
  visible: T[];
  /** Ile wierszy zbioru jeszcze się nie renderuje. */
  hidden: number;
  /** Dokłada kolejną porcję (bez ponownego pobrania — zbiór jest już w pamięci). */
  showMore: () => void;
}

/**
 * Rozdziela POBRANIE od RENDEROWANIA — dwie rzeczy, które łatwo zlepić w jedną.
 *
 * Ekrany liczące pieniądze muszą pobrać zbiór w KOMPLECIE: suma z tysiąca najnowszych
 * wierszy to po prostu inna kwota, nieodróżnialna od prawdziwej. Ale komplet, który trafia
 * prosto do `rows.map(...)`, to przy trzyletniej historii dużej floty kilkadziesiąt tysięcy
 * węzłów montowanych naraz — zakładka wiesza się na kilkadziesiąt sekund albo pada na OOM.
 * Ekran, który wcześniej otwierał się w sekundę, przestaje działać, i to bez komunikatu.
 *
 * Rozwiązanie jest asymetryczne, bo problem jest asymetryczny: sumy, filtry i eksport dalej
 * liczą się z kompletu (dostają `rows`, nie `visible`), a w DOM ląduje tylko okno, które
 * użytkownik faktycznie ogląda. Licznik „X z Y" pozostaje liczbą z kompletu.
 */
export function useRenderWindow<T>(rows: T[], step: number = DEFAULT_STEP): RenderWindow<T> {
  const [okno, setOkno] = useState(() => ({ ...znacznik(rows), limit: step }));
  const teraz = znacznik(rows);
  const tenSam = okno.len === teraz.len && okno.first === teraz.first && okno.last === teraz.last;
  /*
   * Zwinięcie okna przy zmianie zbioru robimy W TRAKCIE RENDERU, a nie w `useEffect`.
   *
   * Efekt uruchamia się PO zamontowaniu, więc przełączenie filtra na węższą listę
   * najpierw zamontowałoby ją z rozwiniętym oknem poprzedniej, a dopiero potem zwinęło —
   * czyli dokładnie ten kosztowny montaż, przed którym to okno broni.
   */
  if (!tenSam) setOkno({ ...teraz, limit: step });
  const limit = tenSam ? okno.limit : step;
  return {
    visible: rows.length <= limit ? rows : rows.slice(0, limit),
    hidden: Math.max(0, rows.length - limit),
    showMore: () => setOkno((s) => ({ ...s, limit: s.limit + step })),
  };
}

/**
 * Tani odcisk zbioru: długość plus TOŻSAMOŚĆ pierwszego i ostatniego wiersza.
 *
 * Porównywanie samej tablicy byłoby prostsze, ale zamieniałoby brak memoizacji
 * u wywołującego w zawieszenie strony: `useRenderWindow(rows.filter(…))` daje przy każdym
 * renderze nową tablicę, więc warunek „zbiór się zmienił" byłby zawsze prawdziwy i hook
 * ustawiałby stan w kółko („Too many re-renders"). Wiersze pochodzą natomiast z jednego
 * pobrania i zachowują tożsamość między renderami, więc ten odcisk jest stabilny dla tego
 * samego zbioru i różny dla podmienionego. Fałszywe „bez zmian" wymagałoby zbioru o tej
 * samej długości oraz tym samym pierwszym i ostatnim wierszu — a wtedy niezwinięcie okna
 * niczego nie psuje.
 */
function znacznik<T>(rows: T[]): { len: number; first: T | undefined; last: T | undefined } {
  return { len: rows.length, first: rows[0], last: rows[rows.length - 1] };
}
