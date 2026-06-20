import { GraphHopperRoutingProvider } from "./graphhopper";
import { HereRoutingProvider } from "./here";
import { MockRoutingProvider } from "./mock";
import type { RoutingProvider } from "./types";

export type RoutingProviderName = "mock" | "graphhopper" | "here";

export interface RoutingConfig {
  provider?: RoutingProviderName;
  apiKey?: string;
}

/** Wybiera dostawcę routingu wg konfiguracji (domyślnie mock — bez klucza). */
export function createRoutingProvider(config: RoutingConfig = {}): RoutingProvider {
  switch (config.provider) {
    case "graphhopper":
      if (!config.apiKey) throw new Error("GraphHopper wymaga apiKey.");
      return new GraphHopperRoutingProvider(config.apiKey);
    case "here":
      if (!config.apiKey) throw new Error("HERE wymaga apiKey.");
      return new HereRoutingProvider(config.apiKey);
    default:
      return new MockRoutingProvider();
  }
}
