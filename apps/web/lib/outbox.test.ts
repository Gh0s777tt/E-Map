/**
 * [#390] Testy kolejki offline na webie — pierwsze, jakie ten plik dostaje.
 *
 * Brak testów był tu przyczyną, nie skutkiem: wersja mobilna miała opisany
 * i naprawiony wyścig read-modify-write wraz z testem („KRYTYCZNE: współbieżny
 * flush…"), a wersja webowa przez cały czas trzymała pierwotny błąd, bo nikt
 * nie miał jak zauważyć, że poprawka nie została przeniesiona.
 *
 * Testowany jest MECHANIZM (co dzieje się z kolejką, gdy zapisy się przeplatają),
 * a nie konkretny formularz.
 */
import type { FuelLogInput } from "@e-logistic/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Namiastka localStorage ──────────────────────────────────────────────────
// Prawdziwy `localStorage` jest synchroniczny i wspólny dla wszystkich kart tej
// samej domeny — i to właśnie ta wspólność powodowała utratę danych.
const magazyn = new Map<string, string>();
vi.stubGlobal("window", {
  localStorage: {
    getItem: (k: string) => magazyn.get(k) ?? null,
    setItem: (k: string, v: string) => void magazyn.set(k, v),
    removeItem: (k: string) => void magazyn.delete(k),
  },
  addEventListener: () => {},
});

/** Bramka, którą sterujemy w teście: zatrzymuje `trySync` w połowie. */
let wstrzymaj: Promise<void> = Promise.resolve();

vi.mock("@/lib/supabase/client", () => ({
  getBrowserSupabase: () => ({
    auth: {
      getUser: async () => {
        // Tu w prawdziwym kodzie następuje round-trip do sieci — czyli okno,
        // w którym użytkownik zdąży zapisać kolejny formularz.
        await wstrzymaj;
        return { data: { user: { id: "u1" } } };
      },
    },
  }),
}));

vi.mock("@e-logistic/api", () => ({
  getActiveMembership: async () => ({ companyId: "c1" }),
  insertFuelLog: async () => {},
  insertTripEvent: async () => {},
}));

// `trySync` celowo NIE jest importowany: po [#397] oba testy współbieżności
// przechodzą przez `enqueue`, bo tylko ta droga zostawia wpis w statusie
// `queued` w trakcie synchronizacji. Ręczne wołanie `trySync` na wpisie już
// zsynchronizowanym wychodziło na strażniku i test niczego nie sprawdzał.
const { enqueue, listOutbox, removeOutbox } = await import("./outbox");

const WPIS = {
  vehicleId: "11111111-1111-4111-8111-111111111111",
  station: { country: "PL", city: "Warszawa" },
  liters: 500,
  odometerKm: 100000,
  paymentMethod: "cash" as const,
  currency: "PLN",
  occurredAt: "2026-08-11",
  isFull: true,
} satisfies FuelLogInput;

describe("kolejka offline na webie — przeplatające się zapisy", () => {
  beforeEach(() => {
    magazyn.clear();
    wstrzymaj = Promise.resolve();
  });

  it("KRYTYCZNE: wpis zakolejkowany w trakcie synchronizacji NIE znika", async () => {
    /*
     * Scenariusz z życia: kierowca zapisuje tankowanie A, rusza synchronizacja,
     * a on w tym czasie zapisuje tankowanie B. Wcześniej `trySync(A)` kończył
     * pracę zapisem CAŁEJ tablicy sprzed zapisu B — i B znikał z localStorage
     * bezpowrotnie, mimo komunikatu „Zapisano lokalnie (w kolejce)".
     */
    let zwolnij: () => void = () => {};
    wstrzymaj = new Promise<void>((r) => {
      zwolnij = r;
    });

    // A wchodzi do kolejki i zawisa w trakcie synchronizacji.
    const synchronizacjaA = enqueue("fuel", { ...WPIS }, "2026-08-11T10:00:00.000Z");
    await Promise.resolve();

    // B zapisany w tym samym czasie — z własną, zakończoną już próbą.
    wstrzymaj = Promise.resolve();
    await enqueue("fuel", { ...WPIS, liters: 300 }, "2026-08-11T10:00:05.000Z");

    // Dopiero teraz kończy się synchronizacja A.
    zwolnij();
    await synchronizacjaA;

    const litry = listOutbox("fuel")
      .map((i) => (i.input as { liters: number }).liters)
      .sort((a, b) => a - b);
    expect(litry).toEqual([300, 500]);
  });

  it("usunięcie wpisu w trakcie synchronizacji innego nie wskrzesza go", async () => {
    /*
     * Druga strona tego samego błędu: stary snapshot zawierał wpis, który
     * użytkownik zdążył skasować, więc zapis go przywracał. Efekt dla
     * użytkownika: „skasowałem, a wrócił" — i nie dało się go usunąć trwale.
     */
    /*
     * [#397] Poprzednia wersja tego testu BYŁA BEZWARTOŚCIOWA: bramkę zaciskała
     * dopiero PO `enqueue`, więc wpis miał już status `synced`, a ręczny `trySync`
     * wychodził od razu na strażniku `if (item.status === "synced") return` —
     * nigdy nie docierał do miejsca, które test miał sprawdzać. Końcową asercję
     * spełniało samo `removeOutbox`, więc test przechodził także na kodzie z błędem.
     * Sprawdzone mutacją: po przywróceniu starego `write(items)` test 1 padał,
     * a ten przechodził.
     *
     * Teraz bramka zaciska się PRZED zakolejkowaniem, a asercja na statusie
     * `queued` pilnuje, żeby nie zdegenerował się ponownie.
     */
    let zwolnij: () => void = () => {};
    wstrzymaj = new Promise<void>((r) => {
      zwolnij = r;
    });

    const synchronizacja = enqueue("fuel", { ...WPIS }, "2026-08-11T10:00:00.000Z");
    await Promise.resolve();

    const doUsuniecia = listOutbox("fuel")[0];
    // Dowód, że wpis NAPRAWDĘ wisi w trakcie synchronizacji — bez tego cały
    // scenariusz jest pozorny i test niczego nie pilnuje.
    expect(doUsuniecia?.status).toBe("queued");

    removeOutbox(doUsuniecia?.id ?? "");
    expect(listOutbox("fuel")).toHaveLength(0);

    zwolnij();
    await synchronizacja;

    // Dopiero tutaj zapada decyzja: `patchItem` widzi, że wpisu już nie ma,
    // i NIE przywraca go. Stary `write(items)` wskrzesiłby go ze snapshotu.
    expect(listOutbox("fuel")).toHaveLength(0);
  });

  it("po udanej synchronizacji wpis ma status synced i nie niesie starego błędu", async () => {
    await enqueue("fuel", { ...WPIS }, "2026-08-11T10:00:00.000Z");
    const wpis = listOutbox("fuel")[0];
    expect(wpis?.status).toBe("synced");
    expect(wpis?.error).toBeUndefined();
  });
});
