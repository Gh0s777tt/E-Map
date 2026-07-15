/**
 * Generuje identyfikator rekordu tworzonego na kliencie (offline-first).
 * Preferuje Web Crypto `randomUUID` (Node 26, przeglądarki), ale MUSI działać
 * także w Hermes/React Native, gdzie Web Crypto nie istnieje — #355: wcześniej
 * rzucaliśmy tu wyjątek, przez co KAŻDY zapis formularza w aplikacji mobilnej
 * (outbox `enqueue`) padał po cichu („przycisk nic nie robi"). Fallback:
 * `getRandomValues` → `Math.random`, zawsze w formacie UUIDv4 (RFC 4122).
 * Dostęp przez `globalThis`, by `packages/core` pozostał niezależny od DOM/Node.
 */
export function newId(): string {
  const c = (
    globalThis as {
      crypto?: { randomUUID?(): string; getRandomValues?(a: Uint8Array): Uint8Array };
    }
  ).crypto;
  if (c?.randomUUID) return c.randomUUID();

  const bytes = new Uint8Array(16);
  if (c?.getRandomValues) {
    c.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  // Wersja 4 + wariant RFC 4122.
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;

  const h = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
  return `${h.slice(0, 4).join("")}-${h.slice(4, 6).join("")}-${h.slice(6, 8).join("")}-${h.slice(8, 10).join("")}-${h.slice(10, 16).join("")}`;
}
