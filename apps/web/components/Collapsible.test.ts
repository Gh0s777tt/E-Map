// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement as h } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { Collapsible } from "@/components/Collapsible";

afterEach(cleanup);

/**
 * Dane jak na ekranie statystyk (sekcja „Koszty operacyjne trasy"):
 * 420,00 + 780,00 + 34,50 = 1 234,50 € — suma policzona ręcznie i wpisana
 * w podsumowanie nagłówka, żeby test pilnował konkretnej liczby, nie „jakiejś".
 */
const POZYCJE = ["Parkingi — 420,00 €", "Opłaty drogowe — 780,00 €", "Kary — 34,50 €"];
const SUMA = "1 234,50 €";

function renderSekcje(props: Record<string, unknown> = {}) {
  return render(
    h(Collapsible, {
      title: "🅿️ Koszty operacyjne trasy",
      summary: SUMA,
      // biome-ignore lint/correctness/noChildrenProp: createElement w teście — children w props (wymóg tsc)
      children: POZYCJE.map((t) => h("div", { key: t }, t)),
      ...props,
    }),
  );
}

const details = () => document.querySelector("details") as HTMLDetailsElement | null;
/** Tekst nagłówka — to, co użytkownik widzi także po zwinięciu sekcji. */
const naglowek = () => document.querySelector("details > summary")?.textContent ?? "";

describe("Collapsible", () => {
  it("renderuje się na realistycznych danych: tytuł, podsumowanie i wszystkie pozycje", () => {
    renderSekcje();
    expect(screen.getByText(/Koszty operacyjne trasy/)).toBeTruthy();
    expect(screen.getByText(SUMA)).toBeTruthy();
    for (const p of POZYCJE) expect(screen.getByText(p)).toBeTruthy();
  });

  it("pokazuje sumę dokładnie raz — w nagłówku, nie zdublowaną w treści", () => {
    renderSekcje();
    expect(screen.getAllByText(SUMA)).toHaveLength(1);
    expect(naglowek()).toContain(SUMA);
  });

  it("stoi na natywnym <details>, a nie na własnym stanie React", () => {
    // Świadoma decyzja z komentarza w komponencie: bez JS, obsługa klawiatury
    // i rola dla czytników ekranu przychodzą od przeglądarki za darmo.
    renderSekcje();
    const d = details();
    expect(d).toBeTruthy();
    expect(document.querySelector("details > summary")).toBeTruthy();
  });

  it("ZWINIĘTA sekcja trzyma treść w DOM — inaczej Ctrl+F jej nie znajdzie", () => {
    renderSekcje(); // defaultOpen domyślnie false
    const d = details();
    expect(d?.open).toBe(false);
    // Kluczowe: mimo że sekcja jest zwinięta, węzły są w drzewie (display:none,
    // nie warunkowy render). Przepisanie tego na własny stan i `{open && ...}`
    // wywali te asercje — i o to chodzi.
    for (const p of POZYCJE) {
      const wezel = screen.getByText(p);
      expect(d?.contains(wezel)).toBe(true);
    }
  });

  it("defaultOpen steruje atrybutem open", () => {
    renderSekcje({ defaultOpen: true });
    expect(details()?.hasAttribute("open")).toBe(true);
    cleanup();
    renderSekcje({ defaultOpen: false });
    expect(details()?.hasAttribute("open")).toBe(false);
  });

  it("podsumowanie widać niezależnie od tego, czy sekcja jest rozwinięta", () => {
    renderSekcje(); // start: zwinięta
    expect(naglowek()).toContain(SUMA);
    // Treść nie może siedzieć w <summary>, bo wtedy zwijanie niczego by nie chowało.
    expect(naglowek()).not.toContain("Parkingi");

    fireEvent.click(screen.getByText(/Koszty operacyjne trasy/));
    expect(details()?.open).toBe(true);
    // Po rozwinięciu suma nadal w nagłówku — po to ona jest.
    expect(naglowek()).toContain(SUMA);
    for (const p of POZYCJE) expect(screen.getByText(p)).toBeTruthy();
  });

  it("zero w podsumowaniu to informacja, a nie brak — renderuje się", () => {
    // Rozróżnienie sedno tych ekranów: 0 € kosztów ≠ koszty nieznane.
    renderSekcje({ title: "Kary", summary: "0,00 €" });
    expect(naglowek()).toBe("Kary0,00 €");
    cleanup();
    // To samo dla liczby 0 (nie stringa) — `summary && …` zjadłoby ją po cichu.
    renderSekcje({ title: "Kary", summary: 0 });
    expect(naglowek()).toBe("Kary0");
  });

  it("brak podsumowania zostawia sam tytuł, bez pustej plakietki", () => {
    renderSekcje({ title: "Kary", summary: undefined });
    expect(naglowek()).toBe("Kary");
    expect(document.querySelectorAll("details > summary > span")).toHaveLength(1);
  });

  it("pusty stan: komunikat z treści jest w DOM już po zwinięciu", () => {
    renderSekcje({
      summary: "0,00 €",
      children: h("p", null, "Brak kosztów operacyjnych w tym okresie"),
    });
    expect(details()?.open).toBe(false);
    expect(screen.getByText("Brak kosztów operacyjnych w tym okresie")).toBeTruthy();
    expect(naglowek()).toContain("0,00 €");
  });
});
