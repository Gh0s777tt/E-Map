/** Warstwa danych: zaproszenia kierowców (link/QR). Token hashowany po stronie bazy. */
import type { Role } from "@e-logistic/core";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Tworzy zaproszenie (owner/spedytor) i zwraca surowy token (do linku/QR). */
export async function createInvite(
  client: SupabaseClient,
  opts: { role?: Role; vehicleId?: string; email?: string } = {},
): Promise<string> {
  const { data, error } = await client.rpc("create_invite", {
    p_role: opts.role ?? "driver",
    p_vehicle: opts.vehicleId ?? null,
    p_email: opts.email ?? null,
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
