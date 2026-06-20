/**
 * Generuje identyfikator rekordu tworzonego na kliencie (offline-first).
 * Docelowo UUIDv7 (sortowalny czasowo); obecnie UUIDv4 z Web Crypto
 * (dostępne w Node 26 i przeglądarkach). Dostęp przez `globalThis`,
 * by `packages/core` pozostał niezależny od lib DOM/Node.
 */
export function newId(): string {
  const c = (globalThis as { crypto?: { randomUUID?(): string } }).crypto;
  if (!c?.randomUUID) {
    throw new Error("Web Crypto (crypto.randomUUID) niedostępne w tym środowisku.");
  }
  return c.randomUUID();
}
