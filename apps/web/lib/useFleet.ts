"use client";

import { getActiveMembership, listFuelCardsForUser, listVehicles } from "@e-logistic/api";
import { FUEL_CARD_PROVIDER_LABELS, type FuelCardProvider } from "@e-logistic/core";
import { useEffect, useState } from "react";
import { DEMO_CARDS, DEMO_VEHICLES } from "@/lib/demo";
import { getBrowserSupabase } from "@/lib/supabase/client";

export interface FleetVehicle {
  id: string;
  registration: string;
}
export interface FleetCard {
  id: string;
  label: string;
}

/**
 * Flota użytkownika. Gdy zalogowany i ma firmę → pojazdy/karty z bazy (RLS).
 * W trybie offline / bez firmy → dane demo (apka pozostaje używalna).
 */
export function useFleet() {
  const [vehicles, setVehicles] = useState<FleetVehicle[]>(DEMO_VEHICLES);
  const [cards, setCards] = useState<FleetCard[]>(DEMO_CARDS);
  const [source, setSource] = useState<"demo" | "db">("demo");

  useEffect(() => {
    (async () => {
      try {
        const sb = getBrowserSupabase();
        const membership = await getActiveMembership(sb);
        if (!membership) return; // brak firmy → zostaje demo

        const [vs, cs] = await Promise.all([
          listVehicles(sb, membership.companyId),
          listFuelCardsForUser(sb),
        ]);
        setVehicles(
          (vs as { id: string; registration: string }[]).map((v) => ({
            id: v.id,
            registration: v.registration,
          })),
        );
        setCards(
          (
            cs as {
              id: string;
              provider: string;
              card_number_masked: string | null;
              registration?: string | null;
            }[]
          ).map((c) => {
            const brand =
              FUEL_CARD_PROVIDER_LABELS[c.provider as FuelCardProvider] ?? c.provider.toUpperCase();
            const reg = c.registration ?? null;
            return {
              id: c.id,
              label: `${brand} ${c.card_number_masked ?? ""}${reg ? ` · ${reg}` : ""}`.trim(),
            };
          }),
        );
        setSource("db");
      } catch {
        // tryb offline / brak konfiguracji → demo
      }
    })();
  }, []);

  return { vehicles, cards, source };
}
