/** Warstwa danych: członkostwo użytkownika (firma + rola) i onboarding firmy. */
import type { Role } from "@e-logistic/core";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface ActiveMembership {
  companyId: string;
  role: Role;
}

/** Aktywne członkostwo zalogowanego użytkownika (null gdy brak sesji lub firmy). */
export async function getActiveMembership(
  client: SupabaseClient,
): Promise<ActiveMembership | null> {
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return null;

  const { data, error } = await client
    .from("memberships")
    .select("company_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { companyId: data.company_id as string, role: data.role as Role };
}

/** Onboarding: tworzy firmę i członkostwo `owner` dla zalogowanego usera (RPC). */
export async function bootstrapCompany(client: SupabaseClient, name: string): Promise<string> {
  const { data, error } = await client.rpc("bootstrap_company", { p_name: name });
  if (error) throw error;
  return data as string;
}
