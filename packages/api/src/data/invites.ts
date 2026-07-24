/** Warstwa danych: zaproszenia kierowców (link/QR). Token hashowany po stronie bazy. */
import type { MemberPermissions, Role } from "@e-logistic/core";
import type { TypedSupabaseClient as SupabaseClient } from "../client";

/** Tworzy zaproszenie (owner/spedytor) i zwraca surowy token (do linku/QR). */
export async function createInvite(
  client: SupabaseClient,
  opts: { role?: Role; vehicleId?: string; email?: string; permissions?: MemberPermissions } = {},
): Promise<string> {
  const { data, error } = await client.rpc("create_invite", {
    p_role: opts.role ?? "driver",
    p_vehicle: opts.vehicleId ?? null,
    p_email: opts.email ?? null,
    // #278: matryca uprawnień ustawiana już przy zaproszeniu.
    p_permissions: (opts.permissions ?? {}) as import("../client").Json,
  });
  if (error) throw error;
  return data as string;
}

/** Akceptuje zaproszenie (zalogowany user) — zwraca id firmy. */
export async function acceptInvite(client: SupabaseClient, token: string): Promise<string> {
  const { data, error } = await client.rpc("accept_invite", { p_token: token });
  if (error) throw error;
  return data as string;
}

export interface CompanyInvite {
  id: string;
  /** E-mail zaproszonego (odszyfrowany przez RPC) lub null (link/QR bez e-maila). */
  email: string | null;
  role: Role;
  vehicle_id: string | null;
  /** Ustawione, gdy zaproszenie zostało zaakceptowane. */
  accepted_at: string | null;
  expires_at: string | null;
  created_at: string | null;
}

/** Lista zaproszeń firmy (owner/spedytor; odczyt audytowany w RPC). */
export async function listInvites(
  client: SupabaseClient,
  companyId: string,
): Promise<CompanyInvite[]> {
  const { data, error } = await client.rpc("list_invites", { p_company: companyId });
  if (error) throw error;
  return (data ?? []) as unknown as CompanyInvite[];
}

/** Zaproszenie jest „oczekujące", gdy niezaakceptowane i nie wygasło. */
export function isInvitePending(inv: CompanyInvite, now = new Date()): boolean {
  return inv.accepted_at === null && (inv.expires_at === null || new Date(inv.expires_at) > now);
}

/** Cofa (wygasza) oczekujące zaproszenie (owner/spedytor; audytowane). */
export async function revokeInvite(client: SupabaseClient, inviteId: string) {
  const { error } = await client.rpc("revoke_invite", { p_invite: inviteId });
  if (error) throw error;
}
