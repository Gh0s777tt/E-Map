import { getActiveMembership, listVehicles } from "@e-logistic/api";
import { useEffect, useState } from "react";
import { getCache, setCache } from "./offlineCache";
import { getSupabase, supabaseConfigured } from "./supabase";

export interface FleetVehicle {
  id: string;
  registration: string;
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
        const mapped = vs.map((v) => ({ id: v.id, registration: v.registration }));
        setVehicles(mapped);
        await setCache(CACHE_KEY, mapped);
      } catch {
        // offline / brak firmy → odtwórz ostatnią flotę z cache zamiast pustej listy.
        const cached = await getCache<FleetVehicle[]>(CACHE_KEY);
        if (cached) setVehicles(cached);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { vehicles, loading };
}
