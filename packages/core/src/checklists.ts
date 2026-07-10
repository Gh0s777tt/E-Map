/**
 * Checklisty kierowców (#273) — typy współdzielone web↔mobile + domyślne
 * szablony firmy (wzorce właściciela: „Wjazd do UK" i „Tachograf").
 * Szablon per FIRMA — owner/dispatcher edytuje pozycje pod własne procedury.
 */

export type ChecklistItemType = "yesno" | "multi";

export interface ChecklistItem {
  key: string;
  label: string;
  type: ChecklistItemType;
  /** Opcje dla `multi` (wielokrotny wybór). */
  options?: string[];
  /** Pozwól dołączyć/zrobić zdjęcie do tej pozycji. */
  photo?: boolean;
  /** Pole godziny (HH:MM, data zawsze automatyczna z chwili zapisu). */
  time?: boolean;
}

export interface ChecklistAnswer {
  /** yesno → boolean; multi → wybrane opcje. */
  value: boolean | string[];
  time?: string; // "HH:MM"
  photo?: string; // ścieżka w buckecie (podgląd przez signed URL)
}

export type ChecklistAnswers = Record<string, ChecklistAnswer>;

export const TACHO_MODES = [
  "Młotki",
  "Łóżko",
  "Prom",
  "Rozpoczęcie dnia",
  "Zakończenie dnia",
] as const;

/** Domyślne szablony — seed do skopiowania przez firmę (edytowalne po dodaniu). */
export const DEFAULT_CHECKLIST_TEMPLATES: { name: string; items: ChecklistItem[] }[] = [
  {
    name: "Wjazd do UK",
    items: [
      {
        key: "borderforce",
        label: "Czy wypełniłeś listę kontrolną Border Force?",
        type: "yesno",
        photo: true,
      },
      { key: "seal", label: "Czy założyłeś plombę na linkę celną?", type: "yesno" },
      {
        key: "stowaway",
        label: "Czy sprawdziłeś, czy na pace nie ma nikogo na gapę?",
        type: "yesno",
      },
    ],
  },
  {
    name: "Tachograf",
    items: [
      {
        key: "mode",
        label: "Jaki jest ustawiony tryb tachografu?",
        type: "multi",
        options: [...TACHO_MODES],
        time: true,
      },
      { key: "ooc", label: "Czy zostało zrobione OOC?", type: "yesno" },
      {
        key: "mlotki",
        label: "Czy na załadunku / rozładunku zostały zrobione młotki?",
        type: "yesno",
      },
    ],
  },
];

/** Walidacja odpowiedzi względem szablonu — komplet pozycji, poprawne typy. */
export function validateChecklistAnswers(
  items: ChecklistItem[],
  answers: ChecklistAnswers,
): string | null {
  for (const it of items) {
    const a = answers[it.key];
    if (!a) return `Brak odpowiedzi: ${it.label}`;
    if (it.type === "yesno" && typeof a.value !== "boolean") {
      return `Zaznacz Tak/Nie: ${it.label}`;
    }
    if (it.type === "multi") {
      if (!Array.isArray(a.value) || a.value.length === 0) {
        return `Wybierz co najmniej jedną opcję: ${it.label}`;
      }
    }
    if (it.time && a.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(a.time)) {
      return `Godzina w formacie HH:MM: ${it.label}`;
    }
  }
  return null;
}
