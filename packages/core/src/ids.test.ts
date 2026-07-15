import { afterEach, describe, expect, it, vi } from "vitest";
import { newId } from "./ids";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("newId", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("generuje UUIDv4 (Web Crypto)", () => {
    expect(newId()).toMatch(UUID_V4);
  });

  it("działa bez crypto.randomUUID — jak Hermes/React Native (#355)", () => {
    const real = globalThis.crypto;
    vi.stubGlobal("crypto", { getRandomValues: real.getRandomValues.bind(real) });
    expect(newId()).toMatch(UUID_V4);
  });

  it("działa bez Web Crypto w ogóle (fallback Math.random)", () => {
    vi.stubGlobal("crypto", undefined);
    expect(newId()).toMatch(UUID_V4);
  });

  it("nie generuje duplikatów", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => newId()));
    expect(ids.size).toBe(1000);
  });
});
