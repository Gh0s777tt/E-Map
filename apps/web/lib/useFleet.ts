"use client";

import { listFuelCardsForUser, listVehicles } from "@e-logistic/api";
import {
  FUEL_CARD_PROVIDER_LABELS,
  type FuelCardProvider,
  maskCardNumber,
  type VehicleType,
} from "@e-logistic/core";
import { useEffect, useState } from "react";
import { DEMO_CARDS, DEMO_VEHICLES } from "@/lib/demo";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";

type VehicleRow = {
  id: string;
  registration: string;
  vehicle_type?: string | null;
  height_cm?: number | null;
  width_cm?: number | null;
  length_cm?: number | null;
  curb_weight_kg?: number | null;
  max_payload_kg?: number | null;
  axle_count?: number | null;
  adr_tunnel_code?: string | null;
  emission_class?: string | null;
};

export interface FleetVehicle {
  id: string;
  registration: string;
  /**
   * [#387] Gabaryty i pola routingu z kartoteki pojazdu.
   *
   * `listVehicles` robi `select("*")`, więc te kolumny **od zawsze przychodziły
   * z bazy** — hook wyrzucał je w `.map()` tuż przed użyciem. Skutek: ekran mapy
   * musiał ominąć ten hook własnym zapytaniem, żeby dostać wymiary do routingu,
   * a każdy kolejny ekran potrzebujący gabarytów powtórzyłby to obejście.
   *
   * `null` znaczy „w kartotece pusto" i musi tak zostać. Podstawienie „typowej"
   * wysokości 4 m byłoby zgadywaniem, a zgadywanie tutaj kończy się zestawem
   * wbitym w wiadukt — brak wartości ma być widoczny na ekranie, nie zamaskowany.
   *
   * Kształt celowo zgodny z wersją mobilną (`apps/mobile/lib/useFleet.ts`), żeby
   * ta sama logika profilu pojazdu dała się czytać na obu platformach tak samo.
   */
  vehicleType: VehicleType | null;
  heightCm: number | null;
  widthCm: number | null;
  lengthCm: number | null;
  curbWeightKg: number | null;
  maxPayloadKg?: number | null;
  axleCount: number | null;
  adrTunnelCode: string | null;
  emissionClass: string | null;
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
        // [#387] Wiersz przepisywany w całości — kolumny i tak przyszły z `select("*")`,
        // a odcinanie ich tutaj zmuszało ekran mapy do własnego zapytania.
        const mappedVehicles = (vs as VehicleRow[]).map(
          (v): FleetVehicle => ({
            id: v.id,
            registration: v.registration,
            vehicleType: (v.vehicle_type as VehicleType | undefined) ?? null,
            heightCm: v.height_cm ?? null,
            widthCm: v.width_cm ?? null,
            lengthCm: v.length_cm ?? null,
            curbWeightKg: v.curb_weight_kg ?? null,
            maxPayloadKg: v.max_payload_kg ?? null,
            axleCount: v.axle_count ?? null,
            adrTunnelCode: v.adr_tunnel_code ?? null,
            emissionClass: v.emission_class ?? null,
          }),
        );
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
              label:
                `${brand} ${maskCardNumber(c.card_number_masked)}${reg ? ` · ${reg}` : ""}`.trim(),
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
