/**
 * Dowód dostawy (e-CMR / Proof of Delivery): podpis odbiorcy zapisywany jako
 * załącznik zlecenia, oznaczony w polu `caption`. Format:
 *   "POD: <odbiorca> · <data/godz.>"   (gdy podano odbiorcę)
 *   "POD · <data/godz.>"               (gdy bez odbiorcy)
 * Funkcje czyste — wspólne dla web (lista załączników, dokument CMR) i testów.
 */

/** Prefiks oznaczający, że załącznik jest podpisem odbiorcy (POD). */
export const POD_CAPTION_PREFIX = "POD";

/** Czy `caption` oznacza podpis odbiorcy (POD), a nie zwykłe zdjęcie towaru. */
export function isPodCaption(caption: string | null | undefined): boolean {
  return !!caption && caption.startsWith(POD_CAPTION_PREFIX);
}

export interface PodInfo {
  /** Imię i nazwisko odbiorcy (lub null, gdy nie podano). */
  recipient: string | null;
  /** Data/godzina złożenia podpisu jako tekst (lub null). */
  when: string | null;
}

const POD_SEP = " · ";

/**
 * Rozkłada `caption` podpisu na odbiorcę i datę. Dla nie-POD lub pustego —
 * zwraca {recipient:null, when:null}. Datę bierze z ostatniego separatora,
 * więc odbiorca może zawierać kropki/spacje.
 */
export function parsePodCaption(caption: string | null | undefined): PodInfo {
  if (!isPodCaption(caption)) return { recipient: null, when: null };
  const body = (caption as string).slice(POD_CAPTION_PREFIX.length);
  const idx = body.lastIndexOf(POD_SEP);
  let when: string | null = null;
  let namePart = body;
  if (idx >= 0) {
    when = body.slice(idx + POD_SEP.length).trim() || null;
    namePart = body.slice(0, idx);
  }
  const recipient = namePart.replace(/^:\s*/, "").trim() || null;
  return { recipient, when };
}

/** Buduje `caption` podpisu z odbiorcy (opcjonalnie) i znacznika czasu. */
export function buildPodCaption(recipient: string | null | undefined, when: string): string {
  const who = (recipient ?? "").trim();
  return who
    ? `${POD_CAPTION_PREFIX}: ${who}${POD_SEP}${when}`
    : `${POD_CAPTION_PREFIX}${POD_SEP}${when}`;
}
