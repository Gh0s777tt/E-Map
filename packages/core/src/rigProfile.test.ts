import { describe, expect, it } from "vitest";
import { combineRigProfile, type RigPart } from "./rigProfile";

/** Typowy ciągnik siodłowy. */
const CIAGNIK: RigPart = {
  heightCm: 380,
  widthCm: 250,
  lengthCm: 600,
  curbWeightKg: 7500,
  maxPayloadKg: 4500,
  axleCount: 3,
};

/** Typowa naczepa chłodnia — wyższa i dłuższa od ciągnika. */
const NACZEPA: RigPart = {
  heightCm: 400,
  widthCm: 255,
  lengthCm: 1360,
  curbWeightKg: 7000,
  maxPayloadKg: 25000,
  axleCount: 3,
};

describe("combineRigProfile — wysokość", () => {
  it("bierze WYŻSZY z dwóch, nie ciągnik", () => {
    /*
     * Najgroźniejszy parametr w całym profilu: niski ciągnik z czterometrową
     * chłodnią to zestaw czterometrowy. Błąd kończy się na wiadukcie.
     */
    expect(combineRigProfile(CIAGNIK, NACZEPA).heightCm).toBe(400);
  });

  it("wyższy ciągnik niż naczepa też działa", () => {
    expect(combineRigProfile({ heightCm: 410 }, { heightCm: 320 }).heightCm).toBe(410);
  });

  it("znana tylko jedna wysokość → ta znana, bez braku", () => {
    const p = combineRigProfile({ heightCm: 400 }, {});
    expect(p.heightCm).toBe(400);
    expect(p.braki).not.toContain("wysokosc");
  });

  it("obie nieznane → null i zgłoszony brak", () => {
    const p = combineRigProfile({}, {});
    expect(p.heightCm).toBeNull();
    expect(p.braki).toContain("wysokosc");
  });
});

describe("combineRigProfile — osie i masa", () => {
  it("osie się SUMUJĄ (myto liczy cały zestaw)", () => {
    expect(combineRigProfile(CIAGNIK, NACZEPA).axleCount).toBe(6);
  });

  it("bez naczepy osie zostają osiami ciągnika", () => {
    expect(combineRigProfile(CIAGNIK, null).axleCount).toBe(3);
  });

  it("DMC zestawu to suma obu DMC", () => {
    // 7500+4500 = 12000, 7000+25000 = 32000 → 44 000 kg
    expect(combineRigProfile(CIAGNIK, NACZEPA).grossWeightKg).toBe(44000);
  });

  it("nieznana masa naczepy → null, NIE masa samego ciągnika", () => {
    /*
     * Podanie masy ciągnika jako masy zestawu to zaniżenie o kilkanaście ton,
     * czyli przejazd przez most z ograniczeniem tonażu. Brak jest bezpieczniejszy.
     */
    const p = combineRigProfile(CIAGNIK, { heightCm: 400 });
    expect(p.grossWeightKg).toBeNull();
    expect(p.braki).toContain("masa");
  });

  it("znana masa własna bez ładowności nie daje DMC", () => {
    const p = combineRigProfile({ curbWeightKg: 7500 }, null);
    expect(p.grossWeightKg).toBeNull();
  });
});

describe("combineRigProfile — długość", () => {
  it("z naczepą długość jest NULL i zgłoszona jako brak", () => {
    /*
     * Sedno decyzji. Suma (600+1360=1960 cm) zawyża, bo naczepa zachodzi na
     * ciągnik przez siodło. Maksimum (1360) zaniża, bo pomija wystający przód.
     * Dokładnie policzyć da się tylko znając położenie sworznia — a tej danej
     * nie mamy.
     *
     * Ale najważniejsze jest to, czego ten test pilnuje: NIE wolno wysłać
     * długości samego ciągnika. 600 cm dla zestawu o 1650 cm to zaniżenie
     * o dziesięć metrów, czyli trasa przez łuk, w który zestaw nie wejdzie.
     */
    const p = combineRigProfile(CIAGNIK, NACZEPA);
    expect(p.lengthCm).toBeNull();
    expect(p.lengthCm).not.toBe(CIAGNIK.lengthCm);
    expect(p.braki).toContain("dlugosc-zestawu");
  });

  it("bez naczepy długość ciągnika jest prawdziwa i idzie dalej", () => {
    const p = combineRigProfile(CIAGNIK, null);
    expect(p.lengthCm).toBe(600);
    expect(p.braki).not.toContain("dlugosc-zestawu");
  });
});

describe("combineRigProfile — zestaw rozpięty", () => {
  it("bez naczepy profil to profil ciągnika", () => {
    const p = combineRigProfile(CIAGNIK, null);
    expect(p).toMatchObject({
      heightCm: 380,
      widthCm: 250,
      lengthCm: 600,
      grossWeightKg: 12000,
      axleCount: 3,
    });
    expect(p.braki).toEqual([]);
  });

  it("pusty ciągnik bez naczepy zgłasza komplet braków poza długością zestawu", () => {
    const p = combineRigProfile({}, null);
    expect(p.braki).toEqual(["wysokosc", "szerokosc", "masa", "osie"]);
  });
});
