import { getActiveMembership, listVehicles } from "@e-logistic/api";
import type { VehicleType } from "@e-logistic/core";
import { useEffect, useState } from "react";
import { getCache, setCache } from "./offlineCache";
import { getSupabase, supabaseConfigured } from "./supabase";

export interface FleetVehicle {
  id: string;
  registration: string;
  /**
   * [#383] Typ pojazdu decyduje o trybie routingu (TIR vs osobowy) — bus routowany
   * jak zestaw dostaje objazdy, których nie potrzebuje, a zestaw routowany jak bus
   * dostaje trasę, którą fizycznie nie przejedzie.
   */
  vehicleType: VehicleType;
  /**
   * [#383] Gabaryty z kartoteki pojazdu (`vehicles.height_cm` itd.). `listVehicles`
   * robi `select("*")`, więc te kolumny JUŻ przychodziły z bazy — hook wyrzucał je
   * w `.map()` tuż przed użyciem, a mapa wysyłała do routingu stałe „24 t bez wymiarów".
   *
   * `null` znaczy „w kartotece pusto" i musi tak zostać: podstawienie „typowej"
   * wysokości 4 m byłoby zgadywaniem, a zgadywanie tutaj kończy się zestawem
   * wbitym w wiadukt. Brak wartości ma być widoczny na ekranie, nie zamaskowany.
   */
  heightCm: number | null;
  widthCm: number | null;
  lengthCm: number | null;
  curbWeightKg: number | null;
  maxPayloadKg: number | null;
}

type VehicleRow = Awaited<ReturnType<typeof listVehicles>>[number];

function fromRow(v: VehicleRow): FleetVehicle {
  return {
    id: v.id,
    registration: v.registration,
    vehicleType: v.vehicle_type,
    heightCm: v.height_cm ?? null,
    widthCm: v.width_cm ?? null,
    lengthCm: v.length_cm ?? null,
    curbWeightKg: v.curb_weight_kg ?? null,
    maxPayloadKg: v.max_payload_kg ?? null,
  };
}

/**
 * [#383] Wpis z cache sprzed tej wersji ma tylko `{id, registration}` — typ mówiłby
 * wtedy `number | null`, a w rzeczywistości pole nie istnieje (`undefined`). Domykamy
 * kształt przy odczycie, żeby „brak gabarytu" był jednym stanem (`null`), a nie dwoma.
 */
function fromCache(v: Partial<FleetVehicle>): FleetVehicle | null {
  if (!v.id || !v.registration) return null;
  return {
    id: v.id,
    registration: v.registration,
    // Stary cache nie zna typu; "other" jest tu bezpieczne, bo w routingu traktujemy
    // je jak zestaw (ostrzejsze ograniczenia), a nie jak samochód osobowy.
    vehicleType: v.vehicleType ?? "other",
    heightCm: v.heightCm ?? null,
    widthCm: v.widthCm ?? null,
    lengthCm: v.lengthCm ?? null,
    curbWeightKg: v.curbWeightKg ?? null,
    maxPayloadKg: v.maxPayloadKg ?? null,
  };
}

// #offline: ostatnia znana flota — VehiclePicker musi działać bez sieci (inaczej
// kierowca nie wybierze pojazdu i nie zapisze formularza). `getActiveMembership`
// bije po sieci (auth.getUser), więc offline leci w catch → czytamy z cache.
const CACHE_KEY = "fleet-vehicles";

/** Pojazdy aktywnej firmy (RLS zawęża do firmy zalogowanego użytkownika). */
export function useFleet() {
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const sb = getSupabase();
        const m = await getActiveMembership(sb);
        if (!m) return;
        const vs = await listVehicles(sb, m.companyId);
        const mapped = vs.map(fromRow);
        setVehicles(mapped);
        await setCache(CACHE_KEY, mapped);
      } catch {
        // offline / brak firmy → odtwórz ostatnią flotę z cache zamiast pustej listy.
        const cached = await getCache<Partial<FleetVehicle>[]>(CACHE_KEY);
        if (cached) {
          setVehicles(cached.map(fromCache).filter((v): v is FleetVehicle => v !== null));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { vehicles, loading };
}
