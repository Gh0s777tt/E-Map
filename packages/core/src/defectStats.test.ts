import { describe, expect, it } from "vitest";
import { type DefectEntry, summarizeDefects } from "./defectStats";

const TERAZ = "2026-08-11T12:00:00.000Z";

const wpis = (p: Partial<DefectEntry> = {}): DefectEntry => ({
  vehicleId: "v1",
  part: "Hamulce",
  severity: "medium",
  status: "open",
  dashboardLight: false,
  createdAt: "2026-08-01T08:00:00.000Z",
  ...p,
});

describe("summarizeDefects — czas naprawy", () => {
  it("liczy średnią WYŁĄCZNIE z zamkniętych zgłoszeń", () => {
    /*
     * Sedno reguły: zgłoszenie otwarte nie ma czasu naprawy. Wliczenie go jako
     * zero zaniżałoby średnią dokładnie tam, gdzie problem jest największy —
     * flota z połową zgłoszeń leżących bez ruchu wyglądałaby na szybciej
     * serwisowaną niż flota, która wszystko domyka.
     */
    const s = summarizeDefects(
      [
        wpis({ status: "resolved", resolvedAt: "2026-08-05T08:00:00.000Z" }), // 4 dni
        wpis({ status: "resolved", resolvedAt: "2026-08-03T08:00:00.000Z" }), // 2 dni
        wpis({ status: "open" }), // bez czasu naprawy
      ],
      TERAZ,
    );
    expect(s.sredniCzasNaprawyDni).toBe(3);
  });

  it("brak zamkniętych zgłoszeń to null, nie zero", () => {
    // Zero znaczyłoby „naprawiamy tego samego dnia" — czyli dokładnie odwrotnie
    // niż stan faktyczny, w którym nie naprawiono jeszcze niczego.
    const s = summarizeDefects([wpis({ status: "open" })], TERAZ);
    expect(s.sredniCzasNaprawyDni).toBeNull();
  });

  it("pomija zgłoszenie zamknięte PRZED zgłoszeniem (dane sprzeczne)", () => {
    const s = summarizeDefects(
      [
        wpis({ status: "resolved", resolvedAt: "2026-07-01T08:00:00.000Z" }), // przed
        wpis({ status: "resolved", resolvedAt: "2026-08-05T08:00:00.000Z" }), // 4 dni
      ],
      TERAZ,
    );
    // Ujemna różnica nie może zaniżyć średniej — wpis odpada.
    expect(s.sredniCzasNaprawyDni).toBe(4);
  });
});

describe("summarizeDefects — wiek otwartych", () => {
  it("pokazuje NAJSTARSZE otwarte, nie średnią wieku", () => {
    /*
     * Średnia ukryłaby jedno zgłoszenie leżące pół roku wśród dziesięciu
     * świeżych — a to właśnie ono jest informacją.
     */
    const s = summarizeDefects(
      [
        wpis({ createdAt: "2026-02-11T12:00:00.000Z" }), // 181 dni
        wpis({ createdAt: "2026-08-10T12:00:00.000Z" }), // 1 dzień
        wpis({ createdAt: "2026-08-09T12:00:00.000Z" }), // 2 dni
      ],
      TERAZ,
    );
    expect(s.najstarszeOtwarteDni).toBe(181);
  });

  it("zgłoszenie w trakcie naprawy nadal liczy się jako otwarte", () => {
    // „W trakcie" nie znaczy „załatwione": auto dalej stoi.
    const s = summarizeDefects([wpis({ status: "in_progress" })], TERAZ);
    expect(s.najstarszeOtwarteDni).toBe(10);
    expect(s.wTrakcie).toBe(1);
  });

  it("same zamknięte → brak wieku otwartych", () => {
    const s = summarizeDefects(
      [wpis({ status: "resolved", resolvedAt: "2026-08-02T08:00:00.000Z" })],
      TERAZ,
    );
    expect(s.najstarszeOtwarteDni).toBeNull();
  });
});

describe("summarizeDefects — podział na pojazdy", () => {
  it("sortuje malejąco po liczbie zgłoszeń", () => {
    const s = summarizeDefects(
      [
        wpis({ vehicleId: "a" }),
        wpis({ vehicleId: "b" }),
        wpis({ vehicleId: "b" }),
        wpis({ vehicleId: "b" }),
      ],
      TERAZ,
    );
    expect(s.wgPojazdu.map((v) => v.vehicleId)).toEqual(["b", "a"]);
    expect(s.wgPojazdu[0]?.wszystkie).toBe(3);
  });

  it("zgłoszenie bez pojazdu liczy się do sumy, ale osobno", () => {
    /*
     * Bez tego licznika suma po pojazdach nie zgadzałaby się z sumą całkowitą,
     * a czytający miałby prawo uznać, że ekran się myli.
     */
    const s = summarizeDefects([wpis({ vehicleId: null }), wpis({ vehicleId: "a" })], TERAZ);
    expect(s.wszystkie).toBe(2);
    expect(s.bezPojazdu).toBe(1);
    expect(s.wgPojazdu).toHaveLength(1);
  });

  it("liczy poważne i te z zapaloną kontrolką", () => {
    const s = summarizeDefects(
      [
        wpis({ severity: "high", dashboardLight: true }),
        wpis({ severity: "high" }),
        wpis({ severity: "low" }),
      ],
      TERAZ,
    );
    expect(s.powazne).toBe(3 - 1);
    expect(s.zKontrolka).toBe(1);
    expect(s.wgPojazdu[0]?.powazne).toBe(2);
  });
});

describe("summarizeDefects — podział na części", () => {
  it("scala zapis kierowcy: wielkość liter i spacje", () => {
    // Kierowca wpisuje ręcznie, więc „Hamulce", „hamulce " i „HAMULCE" to
    // jedna część. Bez normalizacji zestawienie rozpadłoby się na trzy wiersze
    // po jednym zgłoszeniu i nie pokazałoby niczego.
    const s = summarizeDefects(
      [
        wpis({ part: "Hamulce" }),
        wpis({ part: "hamulce " }),
        wpis({ part: "  HAMULCE" }),
        wpis({ part: "Sprzęgło" }),
      ],
      TERAZ,
    );
    expect(s.wgCzesci).toHaveLength(2);
    expect(s.wgCzesci[0]?.wszystkie).toBe(3);
    // Etykieta zachowuje zapis pierwszego wystąpienia — pokazujemy człowiekowi
    // to, co napisał człowiek, nie klucz techniczny.
    expect(s.wgCzesci[0]?.etykieta).toBe("Hamulce");
  });

  it("pomija zgłoszenia bez nazwy części", () => {
    const s = summarizeDefects([wpis({ part: null }), wpis({ part: "   " })], TERAZ);
    expect(s.wgCzesci).toHaveLength(0);
    expect(s.wszystkie).toBe(2);
  });
});

describe("summarizeDefects — przypadki brzegowe", () => {
  it("pusty zbiór nie wywraca się i nie zmyśla zer", () => {
    const s = summarizeDefects([], TERAZ);
    expect(s.wszystkie).toBe(0);
    expect(s.sredniCzasNaprawyDni).toBeNull();
    expect(s.najstarszeOtwarteDni).toBeNull();
    expect(s.wgPojazdu).toEqual([]);
  });

  it("nieczytelna data nie psuje reszty zestawienia", () => {
    const s = summarizeDefects(
      [wpis({ createdAt: "nie-data" }), wpis({ createdAt: "2026-08-10T12:00:00.000Z" })],
      TERAZ,
    );
    expect(s.wszystkie).toBe(2);
    expect(s.najstarszeOtwarteDni).toBe(1);
  });
});
