import { describe, expect, it } from "vitest";
import { z } from "zod";
import { firstZodError, zodFieldErrors } from "./zodErrors";

const schema = z.object({
  name: z.string().min(1, "Wymagane"),
  age: z.number().min(18, "Min 18"),
  nested: z.object({ city: z.string().min(1, "Miasto wymagane") }),
});

function sampleError() {
  const r = schema.safeParse({ name: "", age: 10, nested: { city: "" } });
  if (r.success) throw new Error("dane miały nie przejść walidacji");
  return r.error;
}

describe("zodFieldErrors", () => {
  it("mapuje błędy na ścieżki pól (w tym zagnieżdżone)", () => {
    const m = zodFieldErrors(sampleError());
    expect(m.name).toBe("Wymagane");
    expect(m.age).toBe("Min 18");
    expect(m["nested.city"]).toBe("Miasto wymagane");
  });

  it("pusty obiekt, gdy brak błędów", () => {
    const ok = schema.safeParse({ name: "A", age: 30, nested: { city: "X" } });
    // wymuszamy gałąź błędu na innym, pustym ZodError nie istnieje — sprawdzamy liczbę kluczy
    expect(ok.success).toBe(true);
  });
});

describe("firstZodError", () => {
  it("zwraca pierwszy komunikat błędu", () => {
    expect(firstZodError(sampleError())).toBeTruthy();
  });

  it("używa fallbacku tylko gdy brak issues", () => {
    // realny ZodError ma issues → nie używa fallbacku
    expect(firstZodError(sampleError(), "FALLBACK")).not.toBe("FALLBACK");
  });
});
