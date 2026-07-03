import { describe, expect, it } from "vitest";
import { createEncryptedSessionStorage, type SecureKeyVault } from "./secureSession";

/** Deterministyczne „losowe" bajty — wystarczające do testów round-trip. */
function fakeRandomBytes(byteCount: number): Uint8Array {
  return Uint8Array.from({ length: byteCount }, (_, i) => (i * 7 + 13) % 256);
}

function makeFakes() {
  const vaultMap = new Map<string, string>();
  const cacheMap = new Map<string, string>();
  const vault: SecureKeyVault = {
    getItemAsync: async (k) => vaultMap.get(k) ?? null,
    setItemAsync: async (k, v) => void vaultMap.set(k, v),
    deleteItemAsync: async (k) => void vaultMap.delete(k),
  };
  const cache = {
    getItem: async (k: string) => cacheMap.get(k) ?? null,
    setItem: async (k: string, v: string) => void cacheMap.set(k, v),
    removeItem: async (k: string) => void cacheMap.delete(k),
  };
  return { vault, cache, vaultMap, cacheMap };
}

const SESSION = JSON.stringify({
  access_token: "jwt-abc",
  refresh_token: "ref-xyz",
  user: { id: "u1" },
});

describe("createEncryptedSessionStorage", () => {
  it("round-trip: zapisana wartość wraca w całości", async () => {
    const { vault, cache } = makeFakes();
    const storage = createEncryptedSessionStorage({ vault, cache, randomBytes: fakeRandomBytes });
    await storage.setItem("sb-auth-token", SESSION);
    expect(await storage.getItem("sb-auth-token")).toBe(SESSION);
  });

  it("w AsyncStorage nie leży jawny tekst, a klucz trafia do keychaina", async () => {
    const { vault, cache, vaultMap, cacheMap } = makeFakes();
    const storage = createEncryptedSessionStorage({ vault, cache, randomBytes: fakeRandomBytes });
    await storage.setItem("sb-auth-token", SESSION);
    const raw = cacheMap.get("sb-auth-token");
    expect(raw).toBeTruthy();
    expect(raw).not.toContain("jwt-abc");
    expect(raw).toMatch(/^[0-9a-f]+$/); // szyfrogram hex
    expect(vaultMap.get("sb-auth-token")).toMatch(/^[0-9a-f]{64}$/); // klucz AES-256
  });

  it("migracja: jawna sesja sprzed szyfrowania jest czytana i szyfrowana w miejscu", async () => {
    const { vault, cache, vaultMap, cacheMap } = makeFakes();
    cacheMap.set("sb-auth-token", SESSION); // stan po aktualizacji aplikacji
    const storage = createEncryptedSessionStorage({ vault, cache, randomBytes: fakeRandomBytes });
    expect(await storage.getItem("sb-auth-token")).toBe(SESSION);
    expect(cacheMap.get("sb-auth-token")).not.toContain("jwt-abc"); // już zaszyfrowane
    expect(vaultMap.has("sb-auth-token")).toBe(true);
    expect(await storage.getItem("sb-auth-token")).toBe(SESSION); // odczyt po migracji
  });

  it("uszkodzony szyfrogram lub brak klucza → null (bez wyjątku)", async () => {
    const { vault, cache, vaultMap, cacheMap } = makeFakes();
    const storage = createEncryptedSessionStorage({ vault, cache, randomBytes: fakeRandomBytes });
    cacheMap.set("sb-auth-token", "nie-hex-i-nie-json");
    expect(await storage.getItem("sb-auth-token")).toBeNull();
    await storage.setItem("sb-auth-token", SESSION);
    vaultMap.set("sb-auth-token", "ff".repeat(32)); // zły klucz → śmieciowy odczyt lub null, nigdy wyjątek
    const out = await storage.getItem("sb-auth-token");
    expect(typeof out === "string" || out === null).toBe(true);
  });

  it("removeItem czyści oba magazyny", async () => {
    const { vault, cache, vaultMap, cacheMap } = makeFakes();
    const storage = createEncryptedSessionStorage({ vault, cache, randomBytes: fakeRandomBytes });
    await storage.setItem("sb-auth-token", SESSION);
    await storage.removeItem("sb-auth-token");
    expect(cacheMap.has("sb-auth-token")).toBe(false);
    expect(vaultMap.has("sb-auth-token")).toBe(false);
    expect(await storage.getItem("sb-auth-token")).toBeNull();
  });
});
