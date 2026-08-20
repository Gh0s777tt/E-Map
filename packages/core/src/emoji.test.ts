import { describe, expect, it } from "vitest";
import { ALL_EMOJIS, EMOJI_CATEGORIES, QUICK_REACTIONS } from "./index";

describe("zestaw emoji", () => {
  it("ma sześć kategorii, każda z ikoną i znakami", () => {
    expect(EMOJI_CATEGORIES).toHaveLength(6);
    for (const c of EMOJI_CATEGORIES) {
      expect(c.emojis.length).toBeGreaterThan(0);
      expect(c.icon.length).toBeGreaterThan(0);
      expect(c.labelKey.startsWith("emoji.cat.")).toBe(true);
    }
  });

  it("nie zawiera pustych znaków ani białych spacji", () => {
    for (const e of ALL_EMOJIS) {
      expect(e.trim()).toBe(e);
      expect(e.length).toBeGreaterThan(0);
    }
  });

  it("każdy znak mieści się w limicie kolumny bazy (16 znaków)", () => {
    // `message_reactions.emoji` ma CHECK char_length between 1 and 16.
    // Emoji złożone (z modyfikatorem koloru skóry, ZWJ) bywają długie —
    // przekroczenie limitu odrzuciłaby dopiero baza, po kliknięciu.
    for (const e of ALL_EMOJIS) {
      expect(e.length).toBeLessThanOrEqual(16);
    }
  });

  it("szybkie reakcje są podzbiorem pełnego zestawu", () => {
    // Inaczej użytkownik zobaczyłby w pasku reakcję, której nie znajdzie
    // w pickerze — i nie mógłby jej dodać drugi raz świadomie.
    for (const q of QUICK_REACTIONS) {
      expect(ALL_EMOJIS).toContain(q);
    }
  });

  it("nie ma duplikatów w obrębie kategorii", () => {
    for (const c of EMOJI_CATEGORIES) {
      expect(new Set(c.emojis).size).toBe(c.emojis.length);
    }
  });
});
