/** Warstwa danych: członkostwo użytkownika (firma + rola) i onboarding firmy. */
import type { Role } from "@e-logistic/core";
import type { TypedSupabaseClient as SupabaseClient } from "../client";

export interface ActiveMembership {
  companyId: string;
  role: Role;
  modules: string[] | null;
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
    .select("company_id, role, modules")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    companyId: data.company_id as string,
    role: data.role as Role,
    modules: (data.modules as string[] | null) ?? null,
  };
}

export interface CompanyMember {
  user_id: string;
  email: string;
  role: Role;
  modules: string[] | null;
  status: string;
}

/** Lista członków firmy (RPC, owner/dispatcher). */
export async function listCompanyMembers(client: SupabaseClient): Promise<CompanyMember[]> {
  const { data, error } = await client.rpc("company_members");
  if (error) throw error;
  return (data ?? []) as unknown as CompanyMember[];
}

/** Aktualizacja roli i modułów członka (owner). */
export async function updateMember(
  client: SupabaseClient,
  companyId: string,
  userId: string,
  patch: { role?: Role; modules?: string[] | null },
) {
  const { error } = await client
    .from("memberships")
    .update({ role: patch.role, modules: patch.modules ?? null })
    .eq("company_id", companyId)
    .eq("user_id", userId);
  if (error) throw error;
}

/** Onboarding: tworzy firmę i członkostwo `owner` dla zalogowanego usera (RPC). */
export async function bootstrapCompany(client: SupabaseClient, name: string): Promise<string> {
  const { data, error } = await client.rpc("bootstrap_company", { p_name: name });
  if (error) throw error;
  return data as string;
}
