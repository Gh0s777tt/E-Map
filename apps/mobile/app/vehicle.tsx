/**
 * #285: Mój pojazd — pojazd z aktywnego zlecenia (fallback: pierwszy z floty),
 * terminy przeglądu / OC / leasingu z odliczaniem dni.
 */
import { getActiveMembership, listMyOrders, listVehiclesExpiry } from "@e-logistic/api";
import { palette } from "@e-logistic/ui";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, SectionTitle, wide } from "../components/ui";
import { getSupabase, supabaseConfigured } from "../lib/supabase";

interface VehicleExpiry {
  id: string;
  registration: string;
  inspection_expiry: string | null;
  insurance_expiry: string | null;
  leasing_end: string | null;
}

function daysLeft(date: string | null): number | null {
  if (!date) return null;
  const diff = new Date(date).getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
}
function expiryColor(days: number | null): string {
  if (days === null) return palette.smoke;
  if (days < 0) return palette.red;
  if (days <= 14) return palette.warning;
  return palette.success;
}

export default function VehicleScreen() {
  const router = useRouter();
  const [mine, setMine] = useState<VehicleExpiry | null>(null);
  const [fleet, setFleet] = useState<VehicleExpiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    if (!supabaseConfigured) {
      setLoading(false);
      return;
    }
    try {
      const sb = getSupabase();
      const m = await getActiveMembership(sb);
      if (!m) return;
      const vehicles = (await listVehiclesExpiry(sb, m.companyId)) as VehicleExpiry[];
      setFleet(vehicles);
      // Pojazd „mój": z najnowszego niezakończonego zlecenia.
      try {
        const orders = await listMyOrders(sb);
        const withVehicle = orders.find(
          (o) => o.vehicle_id && ["in_progress", "assigned", "new"].includes(o.status),
        );
        setMine(vehicles.find((v) => v.id === withVehicle?.vehicle_id) ?? vehicles[0] ?? null);
      } catch {
        setMine(vehicles[0] ?? null);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Nie udało się pobrać pojazdu.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const terms = (v: VehicleExpiry) =>
    [
      ["Przegląd techniczny", v.inspection_expiry],
      ["Ubezpieczenie OC", v.insurance_expiry],
      ["Koniec leasingu", v.leasing_end],
    ] as const;

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={[s.content, wide]}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={load} tintColor={palette.red} />
      }
    >
      {err && <Text style={s.err}>{err}</Text>}
      {!loading && !err && !mine && (
        <Text style={s.note}>Brak pojazdów w firmie — dodaje je właściciel w panelu.</Text>
      )}

      {mine && (
        <>
          <Card style={s.hero}>
            <Text style={s.heroGlyph}>🚛</Text>
            <Text style={s.heroReg}>{mine.registration}</Text>
            <Text style={s.heroHint}>pojazd z Twojego aktywnego zlecenia</Text>
          </Card>

          {/* Rząd akcji jak w mockupie 15: Rozpocznij Trip / Tankuj / Zgłoś problem */}
          <View style={s.actions}>
            <Pressable style={s.actionBtn} onPress={() => router.push("/trip")}>
              <Text style={s.actionText}>Rozpocznij Trip</Text>
            </Pressable>
            <Pressable style={s.actionBtn} onPress={() => router.push("/fuel")}>
              <Text style={s.actionText}>Tankuj</Text>
            </Pressable>
            <Pressable style={s.actionBtn} onPress={() => router.push("/defects")}>
              <Text style={s.actionText}>Zgłoś problem</Text>
            </Pressable>
          </View>

          <SectionTitle>Terminy</SectionTitle>
          <Card style={s.terms}>
            {terms(mine).map(([label, date], i, arr) => {
              const d = daysLeft(date);
              return (
                <View key={label} style={[s.termRow, i < arr.length - 1 && s.termSep]}>
                  <Text style={s.termLabel}>{label}</Text>
                  <View style={s.termRight}>
                    <Text style={s.termDate}>{date ?? "—"}</Text>
                    {d !== null && (
                      <Text style={[s.termDays, { color: expiryColor(d) }]}>
                        {d < 0 ? `po terminie ${-d} dni` : `za ${d} dni`}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </Card>
        </>
      )}

      {fleet.length > 1 && (
        <>
          <SectionTitle>Flota firmy</SectionTitle>
          {fleet
            .filter((v) => v.id !== mine?.id)
            .map((v) => {
              const d = daysLeft(v.inspection_expiry);
              return (
                <Card key={v.id} style={s.fleetRow}>
                  <Text style={s.fleetReg}>{v.registration}</Text>
                  <Text style={[s.fleetTerm, { color: expiryColor(d) }]}>
                    {d === null ? "brak terminu przeglądu" : `przegląd za ${d} dni`}
                  </Text>
                </Card>
              );
            })}
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.black },
  content: { padding: 16, gap: 10, paddingBottom: 32 },
  err: { color: palette.red, fontSize: 13 },
  note: { color: palette.smoke, fontSize: 14, textAlign: "center", marginTop: 16 },
  hero: { alignItems: "center", gap: 6, paddingVertical: 24 },
  actions: { flexDirection: "row", gap: 8 },
  actionBtn: {
    flex: 1,
    backgroundColor: palette.red,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  actionText: { color: palette.white, fontWeight: "700", fontSize: 12.5 },
  heroGlyph: { fontSize: 44 },
  heroReg: { color: palette.offWhite, fontSize: 30, fontWeight: "800", letterSpacing: 2 },
  heroHint: { color: palette.smoke, fontSize: 12 },
  terms: { paddingVertical: 4 },
  termRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  termSep: { borderBottomWidth: 1, borderBottomColor: palette.graphite },
  termLabel: { color: palette.offWhite, fontSize: 14, fontWeight: "600" },
  termRight: { alignItems: "flex-end", gap: 2 },
  termDate: { color: palette.offWhite, fontSize: 14 },
  termDays: { fontSize: 12, fontWeight: "700" },
  fleetRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  fleetReg: { color: palette.offWhite, fontWeight: "700", fontSize: 15 },
  fleetTerm: { fontSize: 12, fontWeight: "600" },
});
