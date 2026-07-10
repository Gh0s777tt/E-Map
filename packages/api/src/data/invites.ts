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
