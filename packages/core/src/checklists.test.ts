import { describe, expect, it } from "vitest";
import { DEFAULT_CHECKLIST_TEMPLATES, validateChecklistAnswers } from "./checklists";

const UK = DEFAULT_CHECKLIST_TEMPLATES[0]?.items ?? [];
const TACHO = DEFAULT_CHECKLIST_TEMPLATES[1]?.items ?? [];

describe("checklists", () => {
  it("domyślne szablony mają komplet pozycji z wzorca właściciela", () => {
    expect(DEFAULT_CHECKLIST_TEMPLATES.map((t) => t.name)).toEqual(["Wjazd do UK", "Tachograf"]);
    expect(UK.map((i) => i.key)).toEqual(["borderforce", "seal", "stowaway"]);
    expect(TACHO.find((i) => i.key === "mode")?.options).toContain("Prom");
  });

  it("walidacja: komplet poprawnych odpowiedzi przechodzi", () => {
    expect(
      validateChecklistAnswers(UK, {
        borderforce: { value: true },
        seal: { value: true },
        stowaway: { value: false },
      }),
    ).toBeNull();
    expect(
      validateChecklistAnswers(TACHO, {
        mode: { value: ["Prom", "Łóżko"], time: "21:45" },
        ooc: { value: true },
        mlotki: { value: false },
      }),
    ).toBeNull();
  });

  it("walidacja: brak odpowiedzi / pusty multi / zła godzina → komunikat", () => {
    expect(validateChecklistAnswers(UK, { borderforce: { value: true } })).toMatch(/Brak/);
    expect(
      validateChecklistAnswers(TACHO, {
        mode: { value: [] },
        ooc: { value: true },
        mlotki: { value: true },
      }),
    ).toMatch(/co najmniej/);
    expect(
      validateChecklistAnswers(TACHO, {
        mode: { value: ["Prom"], time: "25:99" },
        ooc: { value: true },
        mlotki: { value: true },
      }),
    ).toMatch(/HH:MM/);
  });
});
