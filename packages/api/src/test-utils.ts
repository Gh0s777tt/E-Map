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
  "gte",
  "lte",
  "in",
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
