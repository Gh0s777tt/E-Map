/**
 * Lekki mock klienta Supabase do testów jednostkowych warstwy danych.
 *
 * Odtwarza fluent API (`from().select().eq()…`) jako chainable builder, który
 * zapisuje każde wywołanie i jest thenable (`await query` → `result`). Pozwala
 * sprawdzić KSZTAŁT zapytania (właściwe filtry, limity, tabela) bez realnej bazy.
 * NIE zastępuje testów integracyjnych RLS — sprawdza warstwę zapytań aplikacji.
 */
import type { TypedSupabaseClient } from "./client";

export interface MockCall {
  method: string;
  args: unknown[];
}

export interface MockResult {
  data: unknown;
  error: unknown;
}

export interface MockSupabase {
  client: TypedSupabaseClient;
  calls: MockCall[];
  /** Czy wywołano metodę (opcjonalnie z konkretnym pierwszym argumentem). */
  called: (method: string, arg0?: unknown) => boolean;
  /** Argumenty pierwszego wywołania danej metody (lub undefined). */
  argsOf: (method: string) => unknown[] | undefined;
}

const CHAINABLE = [
  "from",
  "select",
  "insert",
  "update",
  "delete",
  "upsert",
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "in",
  "not",
  "or",
  "order",
  "limit",
  "range",
  "rpc",
] as const;

const TERMINAL = ["single", "maybeSingle"] as const;

export function mockSupabase(result: MockResult = { data: [], error: null }): MockSupabase {
  const calls: MockCall[] = [];
  const builder: Record<string, unknown> = {};

  for (const m of CHAINABLE) {
    builder[m] = (...args: unknown[]) => {
      calls.push({ method: m, args });
      return builder;
    };
  }
  for (const m of TERMINAL) {
    builder[m] = (...args: unknown[]) => {
      calls.push({ method: m, args });
      return Promise.resolve(result);
    };
  }
  // Thenable: `await query` (po łańcuchu filtrów) zwraca `result`.
  // biome-ignore lint/suspicious/noThenProperty: celowo — mock odtwarza thenable query-builder Supabase.
  (builder as { then: unknown }).then = (resolve: (v: MockResult) => unknown) => resolve(result);

  return {
    client: builder as unknown as TypedSupabaseClient,
    calls,
    called: (method, arg0) =>
      calls.some((c) => c.method === method && (arg0 === undefined || c.args[0] === arg0)),
    argsOf: (method) => calls.find((c) => c.method === method)?.args,
  };
}

/** Mock stronicujący — `mockSupabase` wzbogacony o odczyty kursora i licznik zapytań. */
export interface MockSupabasePaged extends MockSupabase {
  /** Argumenty `gt("id", …)` wszystkich zapytań, w kolejności wywołania. */
  kursory: () => unknown[][];
  /** Ile stron faktycznie zamówiono (jedno `limit` = jedno zapytanie). */
  stron: () => number;
}

/**
 * Mock oddający KOLEJNE STRONY — dla wariantów `list…All` (patrz `data/pagination.ts`).
 *
 * `mockSupabase` oddaje ten sam `result` na każde `await`, co do sprawdzania kształtu
 * zapytania wystarcza, ale stronicowanie potrzebuje kolejnych ODPOWIEDZI: pętla
 * kończy się na stronie krótszej niż żądana, więc mock zwracający w kółko to samo
 * albo kręciłby się do sufitu, albo kończył na pierwszej stronie.
 *
 * Podmieniamy `limit`, bo to ono zamyka łańcuch wariantu stronicowanego
 * (`gt(id) → order(id) → limit(pageSize)`) — zwrócenie stąd gotowej obietnicy daje
 * kolejną stronę na każde wywołanie, bez dorabiania własnego thenable obok tego,
 * który mock już ma. Wywołania nadal trafiają do wspólnej listy `calls`, więc asercje
 * o filtrach działają tak samo jak przy zwykłym mocku.
 */
export function mockSupabasePaged(strony: unknown[][]): MockSupabasePaged {
  const m = mockSupabase({ data: [], error: null });
  const builder = m.client as unknown as Record<string, unknown>;
  let i = 0;
  builder.limit = (...args: unknown[]) => {
    m.calls.push({ method: "limit", args });
    const strona = strony[i] ?? [];
    i += 1;
    return Promise.resolve({ data: strona, error: null });
  };
  return {
    ...m,
    kursory: () => m.calls.filter((c) => c.method === "gt").map((c) => c.args),
    stron: () => m.calls.filter((c) => c.method === "limit").length,
  };
}
