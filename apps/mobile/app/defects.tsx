/**
 * #285: Usterki i szkody — zgłoszenie usterki pojazdu (część, waga, opis)
 * + lista ostatnich zgłoszeń ze statusem naprawy.
 */
import { getActiveMembership, insertDefect, listDefects } from "@e-logistic/api";
import { DEFECT_PARTS, type DefectSeverity, type DefectStatus } from "@e-logistic/core";
import { palette } from "@e-logistic/ui";
import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Card, PrimaryButton, SectionTitle } from "../components/ui";
import { VehiclePicker } from "../components/VehiclePicker";
import { getSupabase, supabaseConfigured } from "../lib/supabase";
import { useFleet } from "../lib/useFleet";

interface DefectRow {
  id: string;
  vehicle_id: string;
  part: string;
  severity: DefectSeverity;
  description: string;
  status: DefectStatus;
  created_at: string;
}

const SEVERITIES: { key: DefectSeverity; label: string; color: string }[] = [
  { key: "low", label: "Drobna", color: palette.success },
  { key: "medium", label: "Średnia", color: palette.warning },
  { key: "high", label: "Poważna", color: palette.red },
];
const STATUS_LABEL: Record<DefectStatus, string> = {
  open: "zgłoszona",
  in_progress: "w naprawie",
  resolved: "naprawiona",
};

export default function DefectsScreen() {
  const { vehicles, loading: fleetLoading } = useFleet();
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [part, setPart] = useState<string>(DEFECT_PARTS[0]);
  const [severity, setSeverity] = useState<DefectSeverity>("medium");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [defects, setDefects] = useState<DefectRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!supabaseConfigured) {
      setLoading(false);
      return;
    }
    try {
      setDefects((await listDefects(getSupabase(), { limit: 30 })) as DefectRow[]);
    } catch {
      // offline — lista zostaje pusta
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function submit() {
    setMsg(null);
    if (!vehicleId) {
      setMsg("Wybierz pojazd.");
      return;
    }
    if (description.trim().length < 3) {
      setMsg("Opisz usterkę (min. 3 znaki).");
      return;
    }
    setBusy(true);
    try {
      const sb = getSupabase();
      const [m, user] = await Promise.all([getActiveMembership(sb), sb.auth.getUser()]);
      const uid = user.data.user?.id;
      if (!m || !uid) throw new Error("Brak aktywnej firmy.");
      await insertDefect(
        sb,
        {
          vehicleId,
          part,
          severity,
          dashboardLight: false,
          description: description.trim(),
          status: "open",
        },
        { companyId: m.companyId, reportedBy: uid },
      );
      setDescription("");
      setMsg("✅ Usterka zgłoszona — mechanik dostanie ją w panelu.");
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Nie udało się zgłosić usterki.");
    } finally {
      setBusy(false);
    }
  }

  const regOf = (id: string) => vehicles.find((v) => v.id === id)?.registration ?? "—";

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.content}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={load} tintColor={palette.red} />
      }
    >
      <SectionTitle>Zgłoś usterkę</SectionTitle>
      <Card style={{ gap: 12 }}>
        <VehiclePicker
          vehicles={vehicles}
          loading={fleetLoading}
          selectedId={vehicleId}
          onSelect={setVehicleId}
        />
        <Text style={s.label}>Część / układ</Text>
        <View style={s.chips}>
          {DEFECT_PARTS.map((p) => (
            <Pressable key={p} onPress={() => setPart(p)} style={[s.chip, part === p && s.chipOn]}>
              <Text style={[s.chipText, part === p && s.chipTextOn]}>{p}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={s.label}>Waga usterki</Text>
        <View style={s.chips}>
          {SEVERITIES.map(({ key, label, color }) => (
            <Pressable
              key={key}
              onPress={() => setSeverity(key)}
              style={[s.chip, severity === key && { backgroundColor: color, borderColor: color }]}
            >
              <Text style={[s.chipText, severity === key && { color: palette.black }]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          style={s.input}
          placeholder="Opis — co się dzieje, od kiedy, przy jakiej prędkości…"
          placeholderTextColor={palette.smoke}
          multiline
          value={description}
          onChangeText={setDescription}
        />
        {msg && <Text style={s.msg}>{msg}</Text>}
        <PrimaryButton
          label={busy ? "Wysyłanie…" : "Zgłoś usterkę"}
          onPress={submit}
          disabled={busy}
        />
      </Card>

      <SectionTitle>Ostatnie zgłoszenia</SectionTitle>
      {!loading && defects.length === 0 && (
        <Text style={s.note}>Brak zgłoszeń — oby tak dalej. 🔧</Text>
      )}
      {defects.map((d) => {
        const sev = SEVERITIES.find((x) => x.key === d.severity);
        return (
          <Card key={d.id} style={{ gap: 4 }}>
            <View style={s.rowHead}>
              <Text style={s.rowTitle}>
                {d.part} · {regOf(d.vehicle_id)}
              </Text>
              <Text style={[s.rowStatus, d.status === "resolved" && { color: palette.success }]}>
                {STATUS_LABEL[d.status]}
              </Text>
            </View>
            <Text style={s.rowDesc} numberOfLines={2}>
              {d.description}
            </Text>
            <Text style={[s.rowSev, { color: sev?.color ?? palette.smoke }]}>
              {sev?.label ?? d.severity} · {d.created_at.slice(0, 10)}
            </Text>
          </Card>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.black },
  content: { padding: 16, gap: 10, paddingBottom: 32 },
  label: { color: palette.smoke, fontSize: 13, fontWeight: "600" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipOn: { backgroundColor: palette.red, borderColor: palette.red },
  chipText: { color: palette.smoke, fontSize: 13, fontWeight: "600" },
  chipTextOn: { color: palette.white },
  input: {
    backgroundColor: palette.black,
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    color: palette.offWhite,
    fontSize: 15,
    minHeight: 90,
    textAlignVertical: "top",
  },
  msg: { color: palette.smoke, fontSize: 13 },
  note: { color: palette.smoke, fontSize: 14, textAlign: "center", marginTop: 8 },
  rowHead: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  rowTitle: { color: palette.offWhite, fontWeight: "700", fontSize: 15, flex: 1 },
  rowStatus: { color: palette.warning, fontSize: 12, fontWeight: "700" },
  rowDesc: { color: palette.smoke, fontSize: 13 },
  rowSev: { fontSize: 12, fontWeight: "600" },
});
