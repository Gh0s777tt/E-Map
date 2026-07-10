import { getActiveMembership } from "@e-logistic/api";
import { type AppModule, effectivePermission, type PermissionLevel } from "@e-logistic/core";
import { useEffect, useState } from "react";
import { getSupabase, supabaseConfigured } from "./supabase";

/**
 * #278: poziom uprawnień zalogowanego do modułu (matryca właściciela).
 * Fail-open: offline/bez danych → "edit" (kierowca w trasie nie może być
 * zablokowany przez brak zasięgu; serwerowe RLS i tak pilnuje zapisu).
 */
export function usePermission(module: AppModule): PermissionLevel {
  const [level, setLevel] = useState<PermissionLevel>("edit");
  useEffect(() => {
    if (!supabaseConfigured) return;
    getActiveMembership(getSupabase())
      .then((m) => {
        if (m) setLevel(effectivePermission(m.role, m.modules, m.permissions, module));
      })
      .catch(() => {});
  }, [module]);
  return level;
}
