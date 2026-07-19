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
import { Card, PrimaryButton, SectionTitle, wide } from "../components/ui";
import { VehiclePicker } from "../components/VehiclePicker";
import { useT } from "../lib/i18n";
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

// #audyt i18n: kolory wag zostają na module; etykiety wag/statusów przez t() w komponencie.
const SEVERITIES: { key: DefectSeverity; color: string }[] = [
  { key: "low", color: palette.success },
  { key: "medium", color: palette.warning },
  { key: "high", color: palette.red },
];

export default function DefectsScreen() {
  const { vehicles, loading: fleetLoading } = useFleet();
  const t = useT();
  const sevLabel = (k: DefectSeverity) =>
    t(
      k === "low"
        ? "m.defects.sevLow"
        : k === "medium"
          ? "m.defects.sevMedium"
          : "m.defects.sevHigh",
    );
  const statusLabel = (st: DefectStatus) =>
    t(
      st === "open"
        ? "m.defects.statusOpen"
        : st === "in_progress"
          ? "m.defects.statusProgress"
          : "m.defects.statusResolved",
    );
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
      setMsg(t("m.defects.listOffline"));
    } finally {
      setLoading(false);
    }
  }, [t]);
  useEffect(() => {
    load();
  }, [load]);

  async function submit() {
    setMsg(null);
    if (!vehicleId) {
      setMsg(t("m.defects.pickVehicle"));
      return;
    }
    if (description.trim().length < 3) {
      setMsg(t("m.defects.descMin"));
      return;
    }
    setBusy(true);
    try {
      const sb = getSupabase();
      const [m, user] = await Promise.all([getActiveMembership(sb), sb.auth.getUser()]);
      const uid = user.data.user?.id;
      if (!m || !uid) throw new Error(t("m.defects.noCompany"));
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
      setMsg(t("m.defects.reported"));
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : t("m.defects.reportFail"));
    } finally {
      setBusy(false);
    }
  }

  const regOf = (id: string) => vehicles.find((v) => v.id === id)?.registration ?? "—";

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={[s.content, wide]}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={load} tintColor={palette.red} />
      }
    >
      <SectionTitle>{t("m.defects.title")}</SectionTitle>
      <Card style={{ gap: 12 }}>
        <VehiclePicker
          vehicles={vehicles}
          loading={fleetLoading}
          selectedId={vehicleId}
          onSelect={setVehicleId}
        />
        <Text style={s.label}>{t("m.defects.part")}</Text>
        <View style={s.chips}>
          {DEFECT_PARTS.map((p) => (
            <Pressable key={p} onPress={() => setPart(p)} style={[s.chip, part === p && s.chipOn]}>
              <Text style={[s.chipText, part === p && s.chipTextOn]}>{p}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={s.label}>{t("m.defects.severity")}</Text>
        <View style={s.chips}>
          {SEVERITIES.map(({ key, color }) => (
            <Pressable
              key={key}
              onPress={() => setSeverity(key)}
              style={[s.chip, severity === key && { backgroundColor: color, borderColor: color }]}
            >
              <Text style={[s.chipText, severity === key && { color: palette.black }]}>
                {sevLabel(key)}
              </Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          style={s.input}
          placeholder={t("m.defects.descPh")}
          placeholderTextColor={palette.smoke}
          multiline
          value={description}
          onChangeText={setDescription}
        />
        {msg && <Text style={s.msg}>{msg}</Text>}
        <PrimaryButton
          label={busy ? t("m.defects.sending") : t("m.defects.title")}
          onPress={submit}
          disabled={busy}
        />
      </Card>

      <SectionTitle>{t("m.defects.recent")}</SectionTitle>
      {!loading && defects.length === 0 && <Text style={s.note}>{t("m.defects.none")}</Text>}
      {defects.map((d) => {
        const sev = SEVERITIES.find((x) => x.key === d.severity);
        return (
          <Card key={d.id} style={{ gap: 4 }}>
            <View style={s.rowHead}>
              <Text style={s.rowTitle}>
                {d.part} · {regOf(d.vehicle_id)}
              </Text>
              <Text style={[s.rowStatus, d.status === "resolved" && { color: palette.success }]}>
                {statusLabel(d.status)}
              </Text>
            </View>
            <Text style={s.rowDesc} numberOfLines={2}>
              {d.description}
            </Text>
            <Text style={[s.rowSev, { color: sev?.color ?? palette.smoke }]}>
              {sevLabel(d.severity)} · {d.created_at.slice(0, 10)}
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
