// @vitest-environment jsdom
/**
 * Testy okna renderowania. Sprawdzają nie „czy się kompiluje", tylko tę jedną własność,
 * dla której ten hook powstał: komplet ma zostać w pamięci, a w DOM ma trafiać porcja —
 * i porcja ma się ZWIJAĆ przy zmianie zbioru, bo inaczej przełączenie filtra montuje
 * nową listę z rozwinięciem poprzedniej i cała ochrona znika dokładnie tam, gdzie boli.
 */
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useRenderWindow } from "@/lib/useRenderWindow";

afterEach(cleanup);

const wiersze = (n: number, prefiks = "r") => Array.from({ length: n }, (_, i) => `${prefiks}${i}`);

describe("useRenderWindow", () => {
  it("montuje pierwszą porcję, a resztę zgłasza jako ukrytą", () => {
    const { result } = renderHook(() => useRenderWindow(wiersze(500), 200));
    expect(result.current.visible).toHaveLength(200);
    expect(result.current.hidden).toBe(300);
  });

  it("zbiór mieszczący się w porcji wraca w całości i bez przycisku", () => {
    const { result } = renderHook(() => useRenderWindow(wiersze(12), 200));
    expect(result.current.visible).toHaveLength(12);
    expect(result.current.hidden).toBe(0);
  });

  it("przycisk „Pokaż kolejne” dokłada porcję, nie całą resztę", () => {
    const { result } = renderHook(() => useRenderWindow(wiersze(1000), 200));
    act(() => result.current.showMore());
    expect(result.current.visible).toHaveLength(400);
    expect(result.current.hidden).toBe(600);
  });

  it("KLUCZOWE: zmiana zbioru zwija okno do pierwszej porcji", () => {
    /*
     * Rozwinięte okno przeniesione na nową listę to ten sam kosztowny montaż, przed
     * którym hook broni — a przy przełączeniu filtra dzieje się to jednym kliknięciem.
     */
    const { result, rerender } = renderHook(({ rows }) => useRenderWindow(rows, 200), {
      initialProps: { rows: wiersze(1000) },
    });
    act(() => result.current.showMore());
    expect(result.current.visible).toHaveLength(400);
    rerender({ rows: wiersze(1000, "inne") });
    expect(result.current.visible).toHaveLength(200);
    expect(result.current.visible[0]).toBe("inne0");
  });

  it("ten sam zbiór NIE zwija rozwiniętego okna", () => {
    // Przerenderowanie z innego powodu (zmiana języka, toast) nie może cofać czytelnika
    // na górę listy.
    const rows = wiersze(1000);
    const { result, rerender } = renderHook(({ r }) => useRenderWindow(r, 200), {
      initialProps: { r: rows },
    });
    act(() => result.current.showMore());
    rerender({ r: rows });
    expect(result.current.visible).toHaveLength(400);
  });

  it("KLUCZOWE: niememoizowana tablica wywołującego NIE zapętla renderowania", () => {
    /*
     * `useRenderWindow(rows.filter(…))` w ciele komponentu daje przy każdym renderze
     * NOWĄ tablicę. Porównywanie tożsamości samej tablicy zamieniałoby brak memoizacji
     * u wywołującego w „Too many re-renders", czyli w białą stronę — awarię gorszą niż
     * ta, przed którą hook broni.
     */
    const zrodlo = wiersze(1000);
    const { result, rerender } = renderHook(() => useRenderWindow([...zrodlo], 200));
    act(() => result.current.showMore());
    rerender();
    expect(result.current.visible).toHaveLength(400);
    expect(result.current.hidden).toBe(600);
  });
});
