import type { RouteResult, RoutingProvider } from "./types";

/**
 * Adapter HERE (routing TIR + myto) — szkielet.
 * Pełna implementacja (HERE Routing v8 + Toll Cost) w kolejnym przyrostku;
 * wymaga klucza HERE. Do tego czasu użyj providera `mock` lub `graphhopper`.
 */
export class HereRoutingProvider implements RoutingProvider {
  readonly name = "here";

  constructor(private readonly apiKey: string) {}

  route(): Promise<RouteResult> {
    return Promise.reject(
      new Error(
        `Adapter HERE (klucz ${this.apiKey ? "ustawiony" : "brak"}) — routing TIR + myto do implementacji (Faza 2+).`,
      ),
    );
  }
}
