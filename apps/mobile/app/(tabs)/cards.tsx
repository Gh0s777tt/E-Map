/**
 * #314 (N1): Karty paliwowe w doku — kierowca widzi karty swojego auta
 * (RPC list_fuel_cards_for_user; owner/dispatcher — całą firmę), a PIN
 * pokazuje na 30 s przez audytowane RPC get_fuel_card_pin.
 */
import { getFuelCardPin, listFuelCardsForUser } from "@e-logistic/api";
import { palette } from "@e-logistic/ui";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppHeader } from "../../components/AppHeader";
import { Skeleton } from "../../components/ui";
import { warn } from "../../lib/haptics";
import { useT } from "../../lib/i18n";
import { getSupabase, supabaseConfigured } from "../../lib/supabase";

interface CardRow {
  id: string;
  provider: string;
  card_number_masked: string | null;
  valid_until: string | null;
  registration?: string | null;
  discount_percent?: number | null;
}

const PIN_VISIBLE_MS = 30_000;

/** Ważność: czerwony gdy po terminie/≤14 dni, pomarańczowy ≤30 dni. */
function validityColor(validUntil: string | null): string {
  if (!validUntil) return palette.smoke;
  const days = Math.floor((Date.parse(validUntil) - Date.now()) / 86_400_000);
  if (days <= 14) return palette.red;
  if (days <= 30) return palette.warning;
  return palette.smoke;
}

export default function FuelCardsScreen() {
  const t = useT();
  const [cards, setCards] = useState<CardRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pins, setPins] = useState<Record<string, string>>({});
  const [refreshing, setRefreshing] = useState(false);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const load = useCallback(async () => {
    setErr(null);
    if (!supabaseConfigured) {
      setCards([]);
      return;
    }
    try {
      const rows = (await listFuelCardsForUser(getSupabase())) as unknown as CardRow[];
      setCards(rows);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("m.cards.loadError"));
      setCards([]);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  useEffect(
    () => () => {
      for (const id of Object.keys(timers.current)) clearTimeout(timers.current[id]);
    },
    [],
  );

  async function togglePin(card: CardRow) {
    if (pins[card.id]) {
      clearTimeout(timers.current[card.id]);
      setPins((p) => {
        const { [card.id]: _gone, ...rest } = p;
        return rest;
      });
      return;
    }
    try {
      const pin = await getFuelCardPin(getSupabase(), card.id);
      setPins((p) => ({ ...p, [card.id]: pin }));
      timers.current[card.id] = setTimeout(() => {
        setPins((p) => {
          const { [card.id]: _gone, ...rest } = p;
          return rest;
        });
      }, PIN_VISIBLE_MS);
    } catch (e) {
      warn();
      setErr(e instanceof Error ? e.message : t("m.cards.pinError"));
    }
  }

  return (
    <View style={s.screen}>
      <AppHeader subtitle={t("m.nav.cards")} />
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
            tintColor={palette.red}
          />
        }
      >
        {err && <Text style={s.err}>{err}</Text>}
        {cards === null && (
          <View style={{ gap: 12 }}>
            <Skeleton height={120} />
            <Skeleton height={120} style={{ opacity: 0.6 }} />
          </View>
        )}
        {cards?.length === 0 && !err && <Text style={s.empty}>{t("m.cards.empty")}</Text>}
        {cards?.map((c) => (
          <View key={c.id} style={s.card}>
            <View style={s.cardTop}>
              <Text style={s.provider}>{c.provider}</Text>
              {c.registration ? <Text style={s.reg}>🚚 {c.registration}</Text> : null}
            </View>
            <Text style={s.number}>{c.card_number_masked ?? "•••• ••••"}</Text>
            <View style={s.cardBottom}>
              <View>
                <Text style={s.metaLabel}>{t("m.cards.validUntil")}</Text>
                <Text style={[s.metaValue, { color: validityColor(c.valid_until) }]}>
                  {c.valid_until ?? "—"}
                </Text>
              </View>
              {c.discount_percent != null && (
                <View>
                  <Text style={s.metaLabel}>{t("m.cards.discount")}</Text>
                  <Text style={s.metaValue}>{c.discount_percent}%</Text>
                </View>
              )}
              <Pressable style={[s.pinBtn, pins[c.id] && s.pinBtnOn]} onPress={() => togglePin(c)}>
                <Text style={s.pinBtnText}>
                  {pins[c.id] ? `PIN: ${pins[c.id]}` : t("m.cards.showPin")}
                </Text>
              </Pressable>
            </View>
          </View>
        ))}
        {cards && cards.length > 0 && <Text style={s.note}>{t("m.cards.auditNote")}</Text>}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.black },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  err: { color: palette.red, fontSize: 13 },
  empty: { color: palette.smoke, fontSize: 14, lineHeight: 20, marginTop: 12 },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.graphite,
    backgroundColor: "#151515",
    padding: 16,
    gap: 10,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  provider: { color: palette.offWhite, fontSize: 17, fontWeight: "800" },
  reg: { color: palette.smoke, fontSize: 12, fontWeight: "600" },
  number: { color: palette.offWhite, fontSize: 20, fontWeight: "700", letterSpacing: 2 },
  cardBottom: { flexDirection: "row", alignItems: "flex-end", gap: 18 },
  metaLabel: { color: palette.smoke, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.6 },
  metaValue: { color: palette.offWhite, fontSize: 14, fontWeight: "700", marginTop: 2 },
  pinBtn: {
    marginLeft: "auto",
    backgroundColor: palette.red,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  pinBtnOn: { backgroundColor: "#1f1f1f", borderWidth: 1, borderColor: palette.red },
  pinBtnText: { color: palette.white, fontWeight: "800", fontSize: 13 },
  note: { color: palette.smoke, fontSize: 11.5, lineHeight: 16, marginTop: 4 },
});
