import { getActiveMembership, listVehicles } from "@e-logistic/api";
import { useEffect, useState } from "react";
import { getSupabase, supabaseConfigured } from "./supabase";

export interface FleetVehicle {
  id: string;
  registration: string;
}

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
        setVehicles(vs.map((v) => ({ id: v.id, registration: v.registration })));
      } catch {
        // offline / brak firmy → pusta flota
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { vehicles, loading };
}
