"use client";

import { getActiveMembership, listFuelCardsSafe, listVehicles } from "@e-logistic/api";
import { FUEL_CARD_PROVIDER_LABELS, type FuelCardProvider } from "@e-logistic/core";
import { useEffect, useState } from "react";
import { DEMO_CARDS, DEMO_VEHICLES } from "@/lib/demo";
import { getBrowserSupabase } from "@/lib/supabase/client";

type VehicleRef = { registration: string } | { registration: string }[] | null;
const refReg = (v: VehicleRef): string | null =>
  !v ? null : Array.isArray(v) ? (v[0]?.registration ?? null) : v.registration;

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
          listFuelCardsSafe(sb, membership.companyId),
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
              vehicles?: VehicleRef;
            }[]
          ).map((c) => {
            const brand =
              FUEL_CARD_PROVIDER_LABELS[c.provider as FuelCardProvider] ?? c.provider.toUpperCase();
            const reg = refReg(c.vehicles ?? null);
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
