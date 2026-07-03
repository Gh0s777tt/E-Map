import type { MobileAuthStorage } from "@e-logistic/api";
import * as aesjs from "aes-js";

/**
 * Szyfrowana pamięć sesji (hardening P3 z BACKLOG) — wzorzec „LargeSecureStore"
 * z dokumentacji Supabase: wartość (sesja/JWT, często >2048 B) leży w AsyncStorage
 * jako szyfrogram AES-256-CTR, a klucz szyfrujący w keychainie (expo-secure-store),
 * który limituje rozmiar wpisu, ale klucz (32 B) mieści się zawsze.
 * Świeży klucz przy każdym zapisie ⇒ licznik CTR może startować od 1.
 * Moduł nie importuje nic z React Native — zależności wstrzykiwane (testy w vitest).
 */

/** Podzbiór API expo-secure-store używany przez adapter. */
export interface SecureKeyVault {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}

export interface EncryptedSessionDeps {
  /** Keychain na klucze szyfrujące (expo-secure-store). */
  vault: SecureKeyVault;
  /** Pamięć na szyfrogramy (AsyncStorage). */
  cache: MobileAuthStorage;
  /** Źródło losowości na klucz AES (expo-crypto `getRandomBytesAsync`). */
  randomBytes(byteCount: number): Promise<Uint8Array> | Uint8Array;
}

function looksLikeLegacyPlaintext(value: string): boolean {
  // Sesja Supabase zapisywana przed szyfrowaniem to obiekt JSON.
  return value.trimStart().startsWith("{");
}

/** Adapter `MobileAuthStorage` szyfrujący wartości przed zapisem do `cache`. */
export function createEncryptedSessionStorage(deps: EncryptedSessionDeps): MobileAuthStorage {
  const { vault, cache, randomBytes } = deps;

  async function encrypt(key: string, value: string): Promise<string> {
    const aesKey = await randomBytes(32);
    const cipher = new aesjs.ModeOfOperation.ctr(aesKey, new aesjs.Counter(1));
    const encrypted = cipher.encrypt(aesjs.utils.utf8.toBytes(value));
    await vault.setItemAsync(key, aesjs.utils.hex.fromBytes(aesKey));
    return aesjs.utils.hex.fromBytes(encrypted);
  }

  function decrypt(keyHex: string, cipherHex: string): string {
    const cipher = new aesjs.ModeOfOperation.ctr(
      aesjs.utils.hex.toBytes(keyHex),
      new aesjs.Counter(1),
    );
    return aesjs.utils.utf8.fromBytes(cipher.decrypt(aesjs.utils.hex.toBytes(cipherHex)));
  }

  return {
    async getItem(key: string): Promise<string | null> {
      const stored = await cache.getItem(key);
      if (stored == null) return null;
      const keyHex = await vault.getItemAsync(key);
      if (!keyHex) {
        // Migracja: wpis sprzed szyfrowania (jawny JSON) — zaszyfruj w miejscu,
        // żeby nie wylogowywać zalogowanych użytkowników po aktualizacji.
        if (looksLikeLegacyPlaintext(stored)) {
          await cache.setItem(key, await encrypt(key, stored));
          return stored;
        }
        return null;
      }
      try {
        return decrypt(keyHex, stored);
      } catch {
        return null;
      }
    },

    async setItem(key: string, value: string): Promise<void> {
      await cache.setItem(key, await encrypt(key, value));
    },

    async removeItem(key: string): Promise<void> {
      await cache.removeItem(key);
      await vault.deleteItemAsync(key);
    },
  };
}
