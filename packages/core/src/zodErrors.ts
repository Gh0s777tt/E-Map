import type { ZodError } from "zod";

/**
 * Mapuje błędy walidacji Zod na `Record<ścieżka-pola, komunikat>` — do podświetlania
 * pól w formularzach (`errors[path]`). Zastępuje identyczną pętlę kopiowaną w 6 formularzach web.
 */
export function zodFieldErrors(error: ZodError): Record<string, string> {
  const map: Record<string, string> = {};
  for (const issue of error.issues) map[issue.path.join(".")] = issue.message;
  return map;
}

/** Pierwszy komunikat błędu walidacji (proste UI, np. mobile). */
export function firstZodError(error: ZodError, fallback = "Błąd walidacji"): string {
  return error.issues[0]?.message ?? fallback;
}
