import { describe, expect, it } from "vitest";
import { decodeActivityChange, parseDddDriverCard } from "./ddd";

/** Buduje 2-bajtowy ActivityChangeInfo. */
function aci(activity: number, minute: number, opts: { slot?: number; absent?: number } = {}) {
  return ((opts.slot ?? 0) << 15) | ((opts.absent ?? 0) << 13) | (activity << 11) | minute;
}

/** Buduje rekord dzienny: prevLen, recLen, TimeReal, presence, distance, changes[]. */
function dayRecord(epochSec: number, distanceKm: number, changes: number[]): number[] {
  const recLen = 12 + changes.length * 2;
  const out = [0, 0, (recLen >> 8) & 0xff, recLen & 0xff];
  out.push(
    (epochSec >>> 24) & 0xff,
    (epochSec >>> 16) & 0xff,
    (epochSec >>> 8) & 0xff,
    epochSec & 0xff,
  );
  out.push(0, 1); // presence counter (BCD)
  out.push((distanceKm >> 8) & 0xff, distanceKm & 0xff);
  for (const c of changes) out.push((c >> 8) & 0xff, c & 0xff);
  return out;
}

/** Buduje blok TLV pliku .ddd. */
function block(fid: number, type: number, payload: number[]): number[] {
  return [
    (fid >> 8) & 0xff,
    fid & 0xff,
    type,
    (payload.length >> 8) & 0xff,
    payload.length & 0xff,
    ...payload,
  ];
}

/** EF_Driver_Activity_Data: pointery + bufor z rekordami od offsetu 0. */
function activityEf(records: number[][]): number[] {
  const buf = records.flat();
  return [0, 0, 0, 0, ...buf];
}

const DAY_EPOCH = Math.floor(Date.parse("2026-07-06T00:00:00Z") / 1000);

describe("decodeActivityChange", () => {
  it("dekoduje aktywność, slot, minutę i brak karty", () => {
    const ch = decodeActivityChange(aci(3, 425)); // jazda od 07:05
    expect(ch).toEqual({ slot: 0, cardAbsent: false, activity: "driving", minute: 425 });
    const ch2 = decodeActivityChange(aci(0, 1200, { slot: 1, absent: 1 }));
    expect(ch2.activity).toBe("rest");
    expect(ch2.slot).toBe(1);
    expect(ch2.cardAbsent).toBe(true);
  });
});

describe("parseDddDriverCard", () => {
  it("czyta dzień: odpoczynek → jazda → przerwa → jazda, sumy i dystans", () => {
    // 00:00 rest · 07:00 driving · 11:00 rest · 12:00 driving · 16:00 rest
    const rec = dayRecord(DAY_EPOCH, 480, [
      aci(0, 0),
      aci(3, 420),
      aci(0, 660),
      aci(3, 720),
      aci(0, 960),
    ]);
    const file = new Uint8Array(block(0x0504, 0x00, activityEf([rec])));
    const res = parseDddDriverCard(file);
    expect(res.days).toHaveLength(1);
    const d = res.days[0];
    expect(d?.date).toBe("2026-07-06");
    expect(d?.distanceKm).toBe(480);
    expect(d?.totals.driving).toBe(240 + 240);
    expect(d?.totals.rest).toBe(1440 - 480);
    expect(d?.violations).toEqual([]);
  });

  it("wykrywa jazdę ciągłą >4h30 i dobową >10h", () => {
    // 00:00 rest · 04:00 driving 5h ciągiem · 09:00 przerwa 45 · 09:45 driving 5h30
    const rec = dayRecord(DAY_EPOCH, 900, [
      aci(0, 0),
      aci(3, 240),
      aci(0, 540),
      aci(3, 585),
      aci(0, 915),
    ]);
    const res = parseDddDriverCard(new Uint8Array(block(0x0504, 0x00, activityEf([rec]))));
    const d = res.days[0];
    expect(d?.violations).toContain("continuous-driving-over-4h30");
    expect(d?.violations).toContain("daily-driving-over-10h");
  });

  it("przerwa dzielona 15+30 zeruje jazdę ciągłą", () => {
    // driving 2h · rest 15 · driving 2h · rest 30 · driving 2h — bez naruszenia
    const rec = dayRecord(DAY_EPOCH, 600, [
      aci(3, 0),
      aci(0, 120),
      aci(3, 135),
      aci(0, 255),
      aci(3, 285),
      aci(0, 405),
    ]);
    const res = parseDddDriverCard(new Uint8Array(block(0x0504, 0x00, activityEf([rec]))));
    expect(res.days[0]?.violations).not.toContain("continuous-driving-over-4h30");
  });

  it("czyta posiadacza z EF_Identification i generację Gen2", () => {
    const ident = new Array(65).fill(0x20);
    const name = (s: string) => {
      const f = new Array(36).fill(0x20);
      f[0] = 1; // code page
      for (let i = 0; i < s.length; i++) f[1 + i] = s.charCodeAt(i);
      return f;
    };
    const payload = [...ident, ...name("KOWALSKI"), ...name("JAN"), 0, 0, 0, 0, 0x70, 0x6c];
    const rec = dayRecord(DAY_EPOCH, 100, [aci(0, 0)]);
    const file = new Uint8Array([
      ...block(0x0520, 0x00, payload),
      ...block(0x0504, 0x02, activityEf([rec])),
    ]);
    const res = parseDddDriverCard(file);
    expect(res.holderName).toBe("JAN KOWALSKI");
    expect(res.generation).toBe(2);
    expect(res.days).toHaveLength(1);
  });

  it("plik bez znanych bloków → ostrzeżenie, zero dni", () => {
    const res = parseDddDriverCard(new Uint8Array([1, 2, 3]));
    expect(res.days).toHaveLength(0);
    expect(res.warnings.length).toBeGreaterThan(0);
  });

  it("kilka dni sortuje i deduplikuje po dacie", () => {
    const d1 = dayRecord(DAY_EPOCH, 100, [aci(0, 0)]);
    const d2 = dayRecord(DAY_EPOCH + 86400, 200, [aci(0, 0)]);
    const res = parseDddDriverCard(new Uint8Array(block(0x0504, 0x00, activityEf([d1, d2, d2]))));
    expect(res.days.map((d) => d.date)).toEqual(["2026-07-06", "2026-07-07"]);
  });
});
