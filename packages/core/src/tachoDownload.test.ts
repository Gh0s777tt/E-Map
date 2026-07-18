import { describe, expect, it } from "vitest";
import { checkDownload, checkDownloads } from "./tachoDownload";

const NOW = "2026-07-18";

describe("checkDownload — karta kierowcy (28 dni)", () => {
  it("10 dni temu → ok, 18 dni do terminu", () => {
    const c = checkDownload("card", "2026-07-08", NOW);
    expect(c.status).toBe("ok");
    expect(c.daysLeft).toBe(18);
    expect(c.dueISO).toBe("2026-08-05");
  });
  it("25 dni temu → wkrótce (≤7)", () => {
    const c = checkDownload("card", "2026-06-23", NOW);
    expect(c.status).toBe("soon");
    expect(c.daysLeft).toBe(3);
  });
  it("30 dni temu → po terminie", () => {
    const c = checkDownload("card", "2026-06-18", NOW);
    expect(c.status).toBe("overdue");
    expect(c.daysLeft).toBe(-2);
  });
});

describe("checkDownload — jednostka pojazdowa (90 dni)", () => {
  it("60 dni temu → ok", () => {
    expect(checkDownload("vu", "2026-05-19", NOW).status).toBe("ok");
  });
  it("88 dni temu → wkrótce", () => {
    const c = checkDownload("vu", "2026-04-21", NOW);
    expect(c.status).toBe("soon");
    expect(c.daysLeft).toBe(2);
  });
  it("100 dni temu → po terminie", () => {
    expect(checkDownload("vu", "2026-04-09", NOW).status).toBe("overdue");
  });
});

describe("checkDownload — brak/błędna data", () => {
  it("null → po terminie (nigdy nie sczytano)", () => {
    const c = checkDownload("card", null, NOW);
    expect(c.status).toBe("overdue");
    expect(c.dueISO).toBe("");
  });
  it("błędna data → po terminie", () => {
    expect(checkDownload("vu", "nie-data", NOW).status).toBe("overdue");
  });
});

describe("checkDownloads — zbiorczy przegląd", () => {
  it("sortuje po pilności, liczy statusy i worst", () => {
    const r = checkDownloads(
      [
        { kind: "card", lastISO: "2026-07-08", label: "Kowalski" }, // ok
        { kind: "card", lastISO: "2026-06-18", label: "Nowak" }, // overdue -2
        { kind: "vu", lastISO: "2026-04-21", label: "DW12345" }, // soon +2
      ],
      NOW,
    );
    expect(r.items[0]?.label).toBe("Nowak"); // najpilniejsze pierwsze
    expect(r.overdue).toBe(1);
    expect(r.soon).toBe(1);
    expect(r.ok).toBe(1);
    expect(r.worst).toBe("overdue");
  });
  it("pusty zestaw → worst ok", () => {
    expect(checkDownloads([], NOW).worst).toBe("ok");
  });
});
