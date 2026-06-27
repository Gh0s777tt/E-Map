import { z } from "zod";

/**
 * Walidacja ścieżki docelowej powiadomienia push. MUSI być ścieżką **względną**
 * (zaczyna się od „/", ale nie „//"), bez „..", backslasha i znaków kontrolnych —
 * inaczej kliknięcie powiadomienia mogłoby otworzyć obcą domenę (open-redirect)
 * albo wstrzyknąć znaki sterujące. Wyodrębnione z trasy `/api/push/send`,
 * aby walidacja była czysta i testowalna (bez importów `next`/`server-only`).
 */
export function isSafeRelativePath(url: string): boolean {
  if (!/^\/(?!\/)/.test(url)) return false; // musi zaczynać się od „/", nie „//"
  if (url.includes("..") || url.includes("\\")) return false; // traversal / backslash
  if ([...url].some((c) => c.charCodeAt(0) < 32)) return false; // znaki kontrolne (CRLF itp.)
  return true;
}

export const pushUrlSchema = z
  .string()
  .max(512)
  .refine(isSafeRelativePath, "url musi być bezpieczną ścieżką względną");
