/**
 * #285: profil zalogowanego do UI (e-mail, rola, firma, pojazd przypisany
 * z kartoteki kierowcy). Fail-soft: offline/braki → pola null, ekran żyje.
 */
import { getActiveMembership, getCompany } from "@e-logistic/api";
import type { Role } from "@e-logistic/core";
import { useEffect, useState } from "react";
import { useAuth } from "../components/AuthProvider";
import { getSupabase, supabaseConfigured } from "./supabase";

export interface Profile {
  email: string | null;
  role: Role | null;
  companyId: string | null;
  companyName: string | null;
  /** #318: zdjęcie profilowe i telefon kontaktowy z user_metadata. */
  avatarUrl: string | null;
  phone: string | null;
}

const ROLE_LABEL: Record<string, string> = {
  owner: "właściciel",
  dispatcher: "spedytor",
  driver: "kierowca",
  developer: "developer",
};

export function roleLabel(role: Role | null): string {
  return role ? (ROLE_LABEL[role] ?? role) : "";
}

export function useProfile(): Profile {
  const { session } = useAuth();
  const email = session?.user?.email ?? null;
  const meta = (session?.user?.user_metadata ?? {}) as Record<string, unknown>;
  const avatarUrl = typeof meta.avatar_url === "string" ? meta.avatar_url : null;
  const phone = typeof meta.phone_contact === "string" ? meta.phone_contact : null;
  const [rest, setRest] = useState<Omit<Profile, "email" | "avatarUrl" | "phone">>({
    role: null,
    companyId: null,
    companyName: null,
  });

  useEffect(() => {
    if (!supabaseConfigured || !session) return;
    let alive = true;
    (async () => {
      try {
        const sb = getSupabase();
        const m = await getActiveMembership(sb);
        if (!m || !alive) return;
        setRest({ role: m.role, companyId: m.companyId, companyName: null });
        const c = await getCompany(sb, m.companyId);
        if (c && alive) setRest({ role: m.role, companyId: m.companyId, companyName: c.name });
      } catch {
        // offline — zostają nulle
      }
    })();
    return () => {
      alive = false;
    };
  }, [session]);

  return { email, avatarUrl, phone, ...rest };
}

/** Inicjał do awatara ("j" z jan@…). */
export function initialOf(email: string | null): string {
  return (email?.trim()[0] ?? "?").toUpperCase();
}
