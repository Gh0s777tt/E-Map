/**
 * #321 (parytet web↔mobile): Harmonogram terminów — jak /schedule na webie
 * (przeglądy/OC/leasing/licencja, badania kierowców, serwis wg przebiegu),
 * ale **scalony per pojazd/kierowca** (postulat P0: przy 30–50 autach lista
 * per-termin to bałagan). Wiersz = jedno auto z najpilniejszym terminem,
 * rozwinięcie po dotknięciu pokazuje wszystkie.
 */
import {
  getActiveMembership,
  latestOdometers,
  listDrivers,
  listServiceTasks,
  listVehiclesExpiry,
} from "@e-logistic/api";
import type { MobileMessageKey } from "@e-logistic/i18n";
import { palette } from "@e-logistic/ui";
import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, wide } from "../components/ui";
import { useT } from "../lib/i18n";
import { getSupabase, supabaseConfigured } from "../lib/supabase";

interface Deadline {
  key: string;
  date: string | null;
  kmLeft?: number | null;
  whatKey: MobileMessageKey | null;
  what: string | null;
  who: string;
  glyph: string;
}
interface Group {
  who: string;
  glyph: string;
  items: Deadline[];
  /** Pilność grupy = najpilniejszy termin (dni; km <1000 → 0, inaczej 500). */
  urgency: number;
}

function daysLeft(date: string | null): number | null {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
}
function urgencyOf(d: Deadline): number {
  if (d.date) return daysLeft(d.date) ?? 9999;
  return (d.kmLeft ?? 999999) < 1000 ? 0 : 500;
}
function urgencyColor(u: number): string {
  if (u < 0) return "#ef4444";
  if (u <= 14) return "#f59e0b";
  return "#22c55e";
}

export default function ScheduleScreen() {
  const t = useT();
  const [groups, setGroups] = useState<Group[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
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
      const out: Deadline[] = [];

      const vehicles = (await listVehiclesExpiry(sb, m.companyId)) as {
        id: string;
        registration: string;
        inspection_expiry: string | null;
        insurance_expiry: string | null;
        leasing_end: string | null;
        license_expiry: string | null;
      }[];
      for (const v of vehicles) {
        const fields: [MobileMessageKey, string | null][] = [
          ["m.schedule.inspection", v.inspection_expiry],
          ["m.schedule.insurance", v.insurance_expiry],
          ["m.schedule.leasing", v.leasing_end],
          ["m.schedule.license", v.license_expiry],
        ];
        for (const [whatKey, date] of fields) {
          if (date) {
            out.push({
              key: `${v.id}-${whatKey}`,
              date,
              whatKey,
              what: null,
              who: v.registration,
              glyph: "🚛",
            });
          }
        }
      }

      // Kartoteka kierowców — tylko owner/dispatcher (RPC deszyfrujące).
      try {
        const drivers = await listDrivers(sb, m.companyId);
        for (const d of drivers) {
          const who = `${d.first_name} ${d.last_name}`.trim() || "—";
          const fields: [MobileMessageKey, string | null][] = [
            ["m.schedule.drvLicense", d.license_expiry],
            ["m.schedule.code95", d.code95_expiry],
            ["m.schedule.medical", d.medical_expiry],
            ["m.schedule.psycho", d.psychotech_expiry],
            ["m.schedule.adr", d.adr_expiry],
            ["m.schedule.passport", d.passport_expiry],
            ["m.schedule.idCard", d.id_card_expiry],
          ];
          for (const [whatKey, date] of fields) {
            if (date) {
              out.push({ key: `${d.id}-${whatKey}`, date, whatKey, what: null, who, glyph: "👤" });
            }
          }
        }
      } catch {
        // rola bez dostępu do kartoteki — sekcja kierowców pominięta
      }

      // Serwis wg przebiegu.
      try {
        const [tasks, odos] = await Promise.all([
          listServiceTasks(sb, m.companyId),
          latestOdometers(sb, m.companyId),
        ]);
        const reg = new Map(vehicles.map((v) => [v.id, v.registration]));
        for (const task of tasks) {
          if (task.interval_km && task.last_done_km != null) {
            const cur = odos[task.vehicle_id];
            if (cur != null) {
              out.push({
                key: `srv-${task.id}`,
                date: null,
                kmLeft: task.last_done_km + task.interval_km - cur,
                whatKey: null,
                what: task.name,
                who: reg.get(task.vehicle_id) ?? "—",
                glyph: "🚛",
              });
            }
          }
        }
      } catch {
        // brak zadań serwisowych
      }

      // Scalenie per auto/kierowca; grupy i pozycje wg pilności.
      const byWho = new Map<string, Group>();
      for (const d of out) {
        const g = byWho.get(d.who) ?? { who: d.who, glyph: d.glyph, items: [], urgency: 9999 };
        g.items.push(d);
        g.urgency = Math.min(g.urgency, urgencyOf(d));
        byWho.set(d.who, g);
      }
      for (const g of byWho.values()) g.items.sort((a, b) => urgencyOf(a) - urgencyOf(b));
      setGroups([...byWho.values()].sort((a, b) => a.urgency - b.urgency));
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("m.schedule.error"));
    } finally {
      setLoading(false);
    }
  }, [t]);
  useEffect(() => {
    load();
  }, [load]);

  const toggle = (who: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(who)) next.delete(who);
      else next.add(who);
      return next;
    });

  const badgeOf = (d: Deadline): { label: string; color: string } => {
    const u = urgencyOf(d);
    if (d.date) {
      const days = daysLeft(d.date) ?? 0;
      return {
        label: days < 0 ? t("m.schedule.overdue") : `${days} ${t("m.schedule.days")}`,
        color: urgencyColor(u),
      };
    }
    return { label: `${d.kmLeft} ${t("m.schedule.kmLeft")}`, color: urgencyColor(u) };
  };

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={[s.content, wide]}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={load} tintColor={palette.red} />
      }
    >
      {err && <Text style={s.err}>{err}</Text>}
      {groups.length === 0 && !loading && !err && (
        <Text style={s.dim}>{t("m.schedule.empty")}</Text>
      )}

      {groups.map((g) => {
        const open = expanded.has(g.who);
        const worst = g.items[0];
        const badge = worst ? badgeOf(worst) : null;
        return (
          <Card key={g.who} style={{ gap: 0 }}>
            <Pressable style={s.head} onPress={() => toggle(g.who)}>
              <Text style={s.glyph}>{g.glyph}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.who} numberOfLines={1}>
                  {g.who}
                </Text>
                <Text style={s.dim}>
                  {g.items.length} × {t("m.schedule.deadlines")}
                </Text>
              </View>
              {badge && (
                <Text style={[s.badge, { color: badge.color, borderColor: badge.color }]}>
                  {badge.label}
                </Text>
              )}
              <Text style={s.chevron}>{open ? "▾" : "▸"}</Text>
            </Pressable>
            {open &&
              g.items.map((d) => {
                const b = badgeOf(d);
                return (
                  <View key={d.key} style={s.row}>
                    <View style={[s.dot, { backgroundColor: b.color }]} />
                    <Text style={s.rowWhat} numberOfLines={1}>
                      {d.whatKey ? t(d.whatKey) : (d.what ?? "—")}
                    </Text>
                    <Text style={s.rowDate}>{d.date ?? ""}</Text>
                    <Text style={[s.rowBadge, { color: b.color }]}>{b.label}</Text>
                  </View>
                );
              })}
          </Card>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.black },
  content: { padding: 16, gap: 10, paddingBottom: 32 },
  err: { color: palette.red, fontSize: 13 },
  dim: { color: palette.smoke, fontSize: 12 },
  head: { flexDirection: "row", alignItems: "center", gap: 10 },
  glyph: { fontSize: 18 },
  who: { color: palette.offWhite, fontSize: 15, fontWeight: "800" },
  badge: {
    fontSize: 12,
    fontWeight: "800",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: "hidden",
  },
  chevron: { color: palette.smoke, fontSize: 14, width: 14, textAlign: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 10,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: palette.graphite,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  rowWhat: { color: palette.offWhite, fontSize: 13.5, flex: 1 },
  rowDate: { color: palette.smoke, fontSize: 12 },
  rowBadge: { fontSize: 12, fontWeight: "800" },
});
