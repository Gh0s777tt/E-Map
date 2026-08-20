// @vitest-environment jsdom
/**
 * Testy `CountryInput` — pola „Kraj" z podpowiedziami ISO 3166-1 alpha-2.
 *
 * Komponent nie liczy niczego, ale ma jedną cichą awarię: jeśli `list` na
 * `input` przestanie wskazywać na `id` renderowanej `datalist` (albo dwa pola
 * dostaną ten sam `id`), podpowiedzi po prostu nie zadziałają — bez wyjątku,
 * bez czerwieni, bez śladu w logach. Dlatego to sprawdzamy przez powiązanie
 * DOM, a nie przez „czy atrybut istnieje".
 *
 * Komponent nie używa i18n — bez `LocaleProvider`.
 */
import { countryOptions } from "@e-logistic/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Fragment, createElement as h } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CountryInput } from "@/components/CountryInput";

afterEach(cleanup);

/** Jedyny `input` w drzewie testu (komponent renderuje input + datalist). */
function input(): HTMLInputElement {
  const el = document.querySelector("input");
  if (!el) throw new Error("brak inputa w drzewie");
  return el as HTMLInputElement;
}

/** `datalist`, na którą faktycznie wskazuje atrybut `list` danego inputa. */
function listOf(el: HTMLInputElement): HTMLDataListElement | null {
  const id = el.getAttribute("list");
  if (!id) return null;
  // getElementById, a nie querySelector("#"+id): React 19 generuje id typu
  // «r0», które nie są poprawnymi selektorami CSS.
  const node = document.getElementById(id);
  return node instanceof HTMLDataListElement ? node : null;
}

/** Wartości opcji (kody ISO) z podanej listy. */
function codesOf(list: HTMLDataListElement): string[] {
  return [...list.querySelectorAll("option")].map((o) => o.value);
}

describe("CountryInput", () => {
  it("renderuje input powiązany z istniejącą datalist", () => {
    render(h(CountryInput, { value: "", onChange: () => {} }));

    const el = input();
    const listId = el.getAttribute("list");
    expect(listId).toBeTruthy();

    // Sedno: `list` musi trafiać w realnie wyrenderowaną <datalist>.
    // Sam niepusty atrybut nic nie dowodzi — wskazanie w próżnię wygląda
    // identycznie, a podpowiedzi milczą.
    const list = listOf(el);
    expect(list).not.toBeNull();
    expect(list?.id).toBe(listId);
  });

  it("lista zawiera kody ISO (PL, DE) z nazwami krajów", () => {
    render(h(CountryInput, { value: "", onChange: () => {} }));

    const list = listOf(input());
    if (!list) throw new Error("input nie wskazuje na datalist");
    const codes = codesOf(list);

    expect(codes).toContain("PL");
    expect(codes).toContain("DE");

    // Liczba do sprawdzenia ręcznie: dokładnie tyle, ile zwraca źródło prawdy
    // (`countryOptions()` z packages/core) — dziś 43 pozycje. Bez ucinania
    // i bez duplikatów.
    expect(codes.length).toBe(countryOptions().length);
    expect(new Set(codes).size).toBe(codes.length);

    // Kod jest wartością do wstawienia, nazwa etykietą — kierowca, który nie
    // zna kodu, ma zobaczyć „Niemcy", a do pola trafi „DE".
    const de = [...list.querySelectorAll("option")].find((o) => o.value === "DE");
    expect(de?.textContent).toBe("Niemcy");
  });

  it("onChange dostaje wpisany tekst bez zmian", () => {
    const onChange = vi.fn();
    render(h(CountryInput, { value: "", onChange }));

    fireEvent.change(input(), { target: { value: "de" } });

    // Komponent nie normalizuje (robi to `geoLocationSchema` przy zapisie),
    // więc do góry idzie surowe „de", nie „DE".
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("de");
  });

  it("przekazuje w górę także pełną nazwę kraju", () => {
    const onChange = vi.fn();
    render(h(CountryInput, { value: "", onChange }));

    fireEvent.change(input(), { target: { value: "Niemcy" } });

    expect(onChange).toHaveBeenCalledWith("Niemcy");
  });

  it("wyświetla wartość sterowaną i domyślny placeholder", () => {
    render(h(CountryInput, { value: "PL", onChange: () => {} }));

    expect(input().value).toBe("PL");
    expect(screen.getByPlaceholderText("DE")).toBeTruthy();
  });

  it("pusta wartość to puste pole, a nie placeholder wstawiony jako tekst", () => {
    render(h(CountryInput, { value: "", onChange: () => {} }));

    // Rozróżnienie brzegowe: "" znaczy „nic nie wpisano", nie „DE".
    // Gdyby placeholder wyciekł do `value`, formularz zapisałby Niemcy
    // dla każdego, kto pola nie dotknął.
    expect(input().value).toBe("");
    expect(input().getAttribute("placeholder")).toBe("DE");
  });

  it("własny placeholder nadpisuje domyślny", () => {
    render(h(CountryInput, { value: "", onChange: () => {}, placeholder: "PL" }));

    expect(input().getAttribute("placeholder")).toBe("PL");
  });

  it("dwa pola obok siebie mają osobne listy (useId), każda kompletna", () => {
    render(
      h(Fragment, {
        // biome-ignore lint/correctness/noChildrenProp: createElement w teście — children w props (wymóg tsc)
        children: [
          h(CountryInput, { key: "a", value: "PL", onChange: () => {} }),
          h(CountryInput, { key: "b", value: "DE", onChange: () => {} }),
        ],
      }),
    );

    const inputs = [...document.querySelectorAll("input")];
    expect(inputs.length).toBe(2);
    const [a, b] = inputs;
    if (!a || !b) throw new Error("oczekiwano dwóch pól kraju");

    const idA = a.getAttribute("list");
    const idB = b.getAttribute("list");

    // Gdyby `id` był stały, obie datalisty skleiłyby się w DOM w jedną
    // (getElementById zwraca pierwszą) — dokładnie ten błąd, przed którym
    // broni `useId` w komponencie.
    expect(idA).toBeTruthy();
    expect(idA).not.toBe(idB);
    expect(document.querySelectorAll("datalist").length).toBe(2);

    // Każdy input musi wskazywać na SWOJĄ listę, nie na cudzą.
    const listA = listOf(a);
    const listB = listOf(b);
    expect(listA).not.toBeNull();
    expect(listB).not.toBeNull();
    expect(listA).not.toBe(listB);

    // Obie kompletne — druga instancja nie może dostać ogryzka.
    const expected = countryOptions().length;
    if (!listA || !listB) throw new Error("brak powiązanej datalist");
    expect(codesOf(listA).length).toBe(expected);
    expect(codesOf(listB).length).toBe(expected);

    // Wartości pól nie mieszają się między instancjami.
    // [#382] Przez zawężone `a`/`b`, nie przez `inputs[0]`/`inputs[1]`: to te same
    // elementy, ale surowy indeks tablicy ma pod `noUncheckedIndexedAccess` typ
    // `| undefined`, więc `tsc` wywracał się na całej bramce webu.
    expect(a.value).toBe("PL");
    expect(b.value).toBe("DE");
  });

  it("maxLength mieści najdłuższą nazwę kraju z listy", () => {
    render(h(CountryInput, { value: "", onChange: () => {} }));

    const max = Number(input().getAttribute("maxlength"));
    const longest = countryOptions().reduce((n, c) => Math.max(n, c.name.length), 0);

    // Limit ma chronić przed wklejeniem „10115 Berlin" i dłuższymi śmieciami
    // (#372), ale nie może uciąć legalnego wpisu nazwą kraju.
    expect(max).toBeGreaterThanOrEqual(longest);
  });
});
