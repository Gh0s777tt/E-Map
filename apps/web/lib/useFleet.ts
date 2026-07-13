"use client";

import { listFuelCardsForUser, listVehicles } from "@e-logistic/api";
import { FUEL_CARD_PROVIDER_LABELS, type FuelCardProvider } from "@e-logistic/core";
import { useEffect, useState } from "react";
import { DEMO_CARDS, DEMO_VEHICLES } from "@/lib/demo";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";

export interface FleetVehicle {
  id: string;
  registration: string;
  maxPayloadKg?: number | null;
}
export interface FleetCard {
  id: string;
  label: string;
  provider: FuelCardProvider;
  /** #332: rejestracja przypisanego auta (null = karta firmowa, bez przypisania). */
  registration: string | null;
}

/** Stan floty: skąd pochodzą dane / czego brakuje do zapisu w bazie. */
export type FleetSource = "loading" | "db" | "no-company" | "no-vehicles" | "offline";

/**
 * Flota użytkownika.
 * - Zalogowany + firma + pojazdy → dane z bazy (`db`).
 * - Zalogowany bez firmy → `no-company` (puste; trzeba utworzyć firmę).
 * - Zalogowany, firma bez pojazdów → `no-vehicles`.
 * - Brak sesji / Supabase niedostępne → tryb demo (`offline`).
 * NIE podsuwamy demo-pojazdów zalogowanemu — fałszywe ID nigdy by się nie zsynchronizowały.
 */
export function useFleet() {
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [cards, setCards] = useState<FleetCard[]>([]);
  const [source, setSource] = useState<FleetSource>("loading");

  useEffect(() => {
    (async () => {
      try {
        const sb = getBrowserSupabase();
        const {
          data: { user },
        } = await sb.auth.getUser();
        if (!user) {
          setVehicles(DEMO_VEHICLES);
          setCards(DEMO_CARDS);
          setSource("offline");
          return;
        }
        const membership = await getCachedMembership(sb);
        if (!membership) {
          setVehicles([]);
          setCards([]);
          setSource("no-company");
          return;
        }
        const [vs, cs] = await Promise.all([
          listVehicles(sb, membership.companyId),
          listFuelCardsForUser(sb),
        ]);
        const mappedVehicles = (
          vs as { id: string; registration: string; max_payload_kg?: number | null }[]
        ).map((v) => ({
          id: v.id,
          registration: v.registration,
          maxPayloadKg: v.max_payload_kg ?? null,
        }));
        setVehicles(mappedVehicles);
        setCards(
          (
            cs as {
              id: string;
              provider: string;
              card_number_masked: string | null;
              registration?: string | null;
            }[]
          ).map((c) => {
            const provider = c.provider as FuelCardProvider;
            const brand = FUEL_CARD_PROVIDER_LABELS[provider] ?? c.provider.toUpperCase();
            const reg = c.registration ?? null;
            return {
              id: c.id,
              provider,
              label: `${brand} ${c.card_number_masked ?? ""}${reg ? ` · ${reg}` : ""}`.trim(),
              registration: reg,
            };
          }),
        );
        setSource(mappedVehicles.length === 0 ? "no-vehicles" : "db");
      } catch {
        setVehicles(DEMO_VEHICLES);
        setCards(DEMO_CARDS);
        setSource("offline");
      }
    })();
  }, []);

  return { vehicles, cards, source };
}
