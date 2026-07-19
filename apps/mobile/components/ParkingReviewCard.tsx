/**
 * #323: Oceny parkingów TIR na mapie — karta wybranego parkingu: średnia ★,
 * potwierdzone udogodnienia (prysznic/WC/jedzenie/ochrona) i formularz oceny
 * 1–5★ z komentarzem. Jedna ocena na użytkownika i parking (upsert, #308) —
 * te same dane społecznościowe co panel web.
 */
import { listParkingReviews, type ParkingReview, upsertParkingReview } from "@e-logistic/api";
import type { Poi } from "@e-logistic/maps";
import { palette } from "@e-logistic/ui";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { success, warn } from "../lib/haptics";
import { useT } from "../lib/i18n";
import { getSupabase, supabaseConfigured } from "../lib/supabase";

const AMENITIES = [
  { key: "hasShower", field: "has_shower", glyph: "🚿", labelKey: "m.parking.shower" },
  { key: "hasWc", field: "has_wc", glyph: "🚻", labelKey: "m.parking.wc" },
  { key: "hasFood", field: "has_food", glyph: "🍽", labelKey: "m.parking.food" },
  { key: "security", field: "security", glyph: "🛡", labelKey: "m.parking.security" },
] as const;

export function ParkingReviewCard({ poi, onClose }: { poi: Poi; onClose: () => void }) {
  const t = useT();
  const [reviews, setReviews] = useState<ParkingReview[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [amenities, setAmenities] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabaseConfigured) return;
    try {
      setReviews(await listParkingReviews(getSupabase(), poi.id));
    } catch {
      // brak sieci — karta pokaże sam POI
    }
  }, [poi.id]);
  useEffect(() => {
    setFormOpen(false);
    setRating(0);
    setAmenities({});
    setNote("");
    setMsg(null);
    load();
  }, [load]);

  const count = reviews.length;
  const avg = count ? Math.round((reviews.reduce((a, r) => a + r.rating, 0) / count) * 10) / 10 : 0;

  async function save() {
    if (busy || rating < 1) return;
    setBusy(true);
    setMsg(null);
    try {
      await upsertParkingReview(getSupabase(), {
        poiId: poi.id,
        poiName: poi.name ?? null,
        lat: poi.lat,
        lng: poi.lng,
        rating,
        hasShower: !!amenities.hasShower,
        hasWc: !!amenities.hasWc,
        hasFood: !!amenities.hasFood,
        security: !!amenities.security,
        note: note.trim() || null,
      });
      success();
      setMsg(t("m.parking.saved"));
      setFormOpen(false);
      await load();
    } catch {
      warn();
      setMsg(t("m.parking.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={s.card}>
      <View style={s.head}>
        <Text style={s.icon}>🅿️</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.name} numberOfLines={1}>
            {poi.name || t("m.parking.unnamed")}
          </Text>
          <Text style={s.dim}>
            {count > 0
              ? `★ ${avg.toFixed(1).replace(".", ",")} (${count})`
              : t("m.parking.noReviews")}
          </Text>
        </View>
        <Pressable onPress={onClose} hitSlop={8}>
          <Text style={s.close}>✕</Text>
        </Pressable>
      </View>

      {count > 0 && (
        <View style={s.chips}>
          {AMENITIES.map((a) => {
            const n = reviews.filter((r) => r[a.field]).length;
            if (n === 0) return null;
            return (
              <Text key={a.key} style={s.chip}>
                {a.glyph} {t(a.labelKey)} ({n})
              </Text>
            );
          })}
        </View>
      )}

      {reviews.slice(0, 2).map(
        (r) =>
          r.note && (
            <Text key={r.id} style={s.note} numberOfLines={2}>
              ★{r.rating} · {r.note}
            </Text>
          ),
      )}

      {msg && <Text style={s.dim}>{msg}</Text>}

      {formOpen ? (
        <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 220 }}>
          <View style={s.stars}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => setRating(n)} hitSlop={6}>
                <Text style={[s.star, n <= rating && s.starOn]}>★</Text>
              </Pressable>
            ))}
          </View>
          <View style={s.chips}>
            {AMENITIES.map((a) => (
              <Pressable
                key={a.key}
                onPress={() => setAmenities((p) => ({ ...p, [a.key]: !p[a.key] }))}
              >
                <Text style={[s.chip, amenities[a.key] && s.chipOn]}>
                  {a.glyph} {t(a.labelKey)}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            style={s.input}
            value={note}
            onChangeText={setNote}
            placeholder={t("m.parking.notePlaceholder")}
            placeholderTextColor={palette.smoke}
            multiline
          />
          <Pressable
            style={[s.saveBtn, (busy || rating < 1) && { opacity: 0.5 }]}
            onPress={save}
            disabled={busy || rating < 1}
          >
            <Text style={s.saveBtnText}>{busy ? "…" : t("m.parking.save")}</Text>
          </Pressable>
        </ScrollView>
      ) : (
        <Pressable style={s.rateBtn} onPress={() => setFormOpen(true)}>
          <Text style={s.rateBtnText}>★ {t("m.parking.rate")}</Text>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    position: "absolute",
    bottom: 84,
    left: 16,
    right: 16,
    backgroundColor: "rgba(10,10,10,0.94)",
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  head: { flexDirection: "row", alignItems: "center", gap: 10 },
  icon: { fontSize: 18 },
  name: { color: palette.offWhite, fontSize: 14.5, fontWeight: "800" },
  dim: { color: palette.smoke, fontSize: 12, marginTop: 1 },
  close: { color: palette.red, fontSize: 16, fontWeight: "700" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    color: palette.offWhite,
    fontSize: 12,
    borderWidth: 1,
    borderColor: palette.graphite,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    overflow: "hidden",
  },
  chipOn: { borderColor: palette.red, color: palette.red, fontWeight: "700" },
  note: { color: palette.smoke, fontSize: 12.5, lineHeight: 17 },
  stars: { flexDirection: "row", gap: 8, paddingVertical: 6 },
  star: { fontSize: 28, color: palette.graphite },
  starOn: { color: "#f59e0b" },
  input: {
    borderWidth: 1,
    borderColor: palette.graphite,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: palette.offWhite,
    fontSize: 13.5,
    minHeight: 44,
    marginTop: 4,
  },
  saveBtn: {
    backgroundColor: palette.red,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 8,
  },
  saveBtnText: { color: palette.white, fontWeight: "800", fontSize: 14 },
  rateBtn: {
    borderWidth: 1,
    borderColor: palette.red,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
  },
  rateBtnText: { color: palette.red, fontWeight: "800", fontSize: 13.5 },
});
