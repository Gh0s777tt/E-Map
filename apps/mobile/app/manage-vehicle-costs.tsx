/**
 * Parytet zarządzania (fala 4, #347): koszty pojazdów z telefonu — właściciel/
 * dyspozytor rejestruje i usuwa koszty inne niż paliwo (naprawa, leasing,
 * ubezpieczenie, podatek, mandat, parking, opony, inne), tak jak w panelu web
 * „Koszty". Wspólna warstwa `@e-logistic/api` + walidacja `vehicleCostSchema`.
 */
import {
  deleteVehicleCost,
  getActiveMembership,
  getCompany,
  insertVehicleCost,
  listVehicleCosts,
  listVehicles,
  type VehicleCost,
} from "@e-logistic/api";
import {
  CURRENCIES,
  type Currency,
  currencyForCountry,
  firstZodError,
  isSupportedCurrency,
  VEHICLE_COST_CATEGORIES,
  type VehicleCostCategory,
  vehicleCostSchema,
} from "@e-logistic/core";
import type { MobileMessageKey } from "@e-logistic/i18n";
import { palette } from "@e-logistic/ui";
import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Card, PrimaryButton, SectionTitle, wide } from "../components/ui";
import { success, warn } from "../lib/haptics";
import { useT } from "../lib/i18n";
import { getSupabase, supabaseConfigured } from "../lib/supabase";

const todayISO = () => new Date().toISOString().slice(0, 10);

// Etykiety kategorii tłumaczone (rdzeniowe VEHICLE_COST_CATEGORY_LABELS są tylko po PL).
const CAT_KEY: Record<VehicleCostCategory, MobileMessageKey> = {
  repair: "m.mvc.cat.repair",
  leasing: "m.mvc.cat.leasing",
  insurance: "m.mvc.cat.insurance",
  tax: "m.mvc.cat.tax",
  fine: "m.mvc.cat.fine",
  parking: "m.mvc.cat.parking",
  tires: "m.mvc.cat.tires",
  other: "m.mvc.cat.other",
};

/**
 * [#388] Waluta jako WYBÓR, nie jako wolny tekst.
 *
 * Do tej pory pole waluty było `TextInput` z `maxLength={3}` i podpowiedzią
 * „EUR". Kierowca albo dyspozytor wpisujący `PL` zamiast `PLN` zapisywał wiersz
 * całkowicie poprawny dla bazy i dla `vehicleCostSchema` (`z.string().min(1)`),
 * ale **niemożliwy do przeliczenia** — `pickFxRate` nie zna kodu `PL`, więc
 * koszt cicho wypadał z każdego podsumowania w euro. Błąd nie zgłaszał się
 * nigdzie: formularz mówił „zapisano", a kwota po prostu nie dochodziła.
 *
 * Lista pochodzi z rdzenia, więc telefon i panel oferują ten sam zbiór, a
 * literówka przestała być możliwa do wpisania.
 */
const empty = {
  vehicleId: null as string | null,
  category: "repair" as VehicleCostCategory,
  amount: "",
  currency: "EUR" as Currency,
  costDate: todayISO(),
  description: "",
};

export default function ManageVehicleCostsScreen() {
  const t = useT();
  const [rows, setRows] = useState<VehicleCost[]>([]);
  const [vehicles, setVehicles] = useState<{ id: string; registration: string }[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof empty | null>(null);
  /** Waluta podpowiadana nowemu wpisowi — z kraju firmy, z EUR jako zapasem. */
  const [defaultCurrency, setDefaultCurrency] = useState<Currency>("EUR");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabaseConfigured) return;
    const sb = getSupabase();
    const m = await getActiveMembership(sb);
    if (!m) return;
    setCompanyId(m.companyId);
    const [costs, veh, comp] = await Promise.all([
      listVehicleCosts(sb, m.companyId, { limit: 200 }),
      listVehicles(sb, m.companyId),
      // [#388] Kraj firmy służy wyłącznie podpowiedzi waluty — ten sam wzorzec
      // co na webie. Brak firmy nie może zablokować ekranu, więc `catch`.
      getCompany(sb, m.companyId).catch(() => null),
    ]);
    const hint = currencyForCountry(comp?.country ?? null);
    // Podpowiedź przepuszczona przez listę: `currencyForCountry` zna waluty,
    // których formularz nie oferuje (np. UAH), a wtedy żaden chip nie byłby
    // zaznaczony i użytkownik zapisywałby walutę, której nie widzi na ekranie.
    if (isSupportedCurrency(hint)) setDefaultCurrency(hint);
    setRows(costs);
    setVehicles(
      (veh as { id: string; registration: string }[]).map((v) => ({
        id: v.id,
        registration: v.registration,
      })),
    );
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const set = (patch: Partial<typeof empty>) => setForm((f) => (f ? { ...f, ...patch } : f));
  const regOf = (id: string) => vehicles.find((v) => v.id === id)?.registration ?? "—";
  const catLabel = (c: string) => {
    const k = CAT_KEY[c as VehicleCostCategory];
    return k ? t(k) : c;
  };

  async function save() {
    if (!form || !companyId || busy) return;
    // Puste/nieprawidłowe pole kwoty dawało wcześniej `Number("")→0` / `NaN||0` → cichy
    // zapis 0 EUR. Wymagamy dodatniej, skończonej liczby, zanim trafi do schematu.
    const amt = Number(form.amount.replace(",", "."));
    if (!form.amount.trim() || !Number.isFinite(amt) || amt <= 0) {
      warn();
      setMsg(t("m.mvc.amountRequired"));
      return;
    }
    const parsed = vehicleCostSchema.safeParse({
      vehicleId: form.vehicleId ?? "",
      category: form.category,
      amount: amt,
      currency: form.currency,
      costDate: form.costDate.trim(),
      description: form.description.trim() || undefined,
    });
    if (!parsed.success) {
      warn();
      setMsg(firstZodError(parsed.error));
      return;
    }
    setBusy(true);
    try {
      await insertVehicleCost(getSupabase(), parsed.data, companyId);
      success();
      setForm(null);
      setMsg(null);
      await load();
    } catch (e) {
      warn();
      setMsg(e instanceof Error ? e.message : t("m.manage.saveError"));
    } finally {
      setBusy(false);
    }
  }

  function confirmDelete(r: VehicleCost) {
    Alert.alert(
      t("m.manage.deleteTitle"),
      `${catLabel(r.category)} ${r.amount} ${r.currency} — ${t("m.manage.delete")}?`,
      [
        { text: t("m.manage.cancel"), style: "cancel" },
        {
          text: t("m.manage.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteVehicleCost(getSupabase(), r.id);
              success();
              await load();
            } catch (e) {
              warn();
              // Usuwanie idzie z listy (form === null) — inline `msg` niewidoczny; Alert.
              Alert.alert(t("m.manage.saveError"), e instanceof Error ? e.message : "");
            }
          },
        },
      ],
    );
  }

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={[s.content, wide]}
      keyboardShouldPersistTaps="handled"
    >
      {form ? (
        <Card style={{ gap: 10 }}>
          <SectionTitle>{t("m.mvc.new")}</SectionTitle>

          <Text style={s.lbl}>{t("m.mvc.vehicle")}</Text>
          <View style={s.chips}>
            {vehicles.map((v) => (
              <Pressable
                key={v.id}
                style={[s.chip, form.vehicleId === v.id && s.chipOn]}
                onPress={() => set({ vehicleId: v.id })}
              >
                <Text style={[s.chipText, form.vehicleId === v.id && { color: palette.white }]}>
                  {v.registration}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={s.lbl}>{t("m.mvc.category")}</Text>
          <View style={s.chips}>
            {VEHICLE_COST_CATEGORIES.map((c) => (
              <Pressable
                key={c}
                style={[s.chip, form.category === c && s.chipOn]}
                onPress={() => set({ category: c })}
              >
                <Text style={[s.chipText, form.category === c && s.chipTextOn]}>{catLabel(c)}</Text>
              </Pressable>
            ))}
          </View>

          <View style={s.row2}>
            <View style={{ flex: 2 }}>
              <Text style={s.lbl}>{t("m.mvc.amount")}</Text>
              <TextInput
                style={s.input}
                value={form.amount}
                onChangeText={(v) => set({ amount: v })}
                placeholder="0.00"
                placeholderTextColor={palette.smoke}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <Text style={s.lbl}>{t("m.mvc.currency")}</Text>
          <View style={s.chips}>
            {CURRENCIES.map((c) => (
              <Pressable
                key={c}
                style={[s.chip, form.currency === c && s.chipOn]}
                onPress={() => set({ currency: c })}
              >
                <Text style={[s.chipText, form.currency === c && s.chipTextOn]}>{c}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={s.lbl}>{t("m.mvc.date")}</Text>
          <TextInput
            style={s.input}
            value={form.costDate}
            onChangeText={(v) => set({ costDate: v })}
            placeholder="2026-07-14"
            placeholderTextColor={palette.smoke}
            autoCapitalize="none"
          />

          <Text style={s.lbl}>{t("m.mvc.description")}</Text>
          <TextInput
            style={[s.input, { minHeight: 60 }]}
            value={form.description}
            onChangeText={(v) => set({ description: v })}
            placeholder="—"
            placeholderTextColor={palette.smoke}
            multiline
          />

          {msg && <Text style={s.err}>{msg}</Text>}
          <PrimaryButton label={busy ? "…" : t("m.manage.save")} onPress={save} />
          <Pressable
            onPress={() => {
              setForm(null);
              setMsg(null);
            }}
          >
            <Text style={s.cancel}>{t("m.manage.cancel")}</Text>
          </Pressable>
        </Card>
      ) : (
        <Pressable
          style={s.addBtn}
          onPress={() => {
            if (vehicles.length === 0) {
              warn();
              setMsg(t("m.msvc.noVehicles"));
              return;
            }
            setMsg(null);
            setForm({ ...empty, costDate: todayISO(), currency: defaultCurrency });
          }}
        >
          <Text style={s.addText}>➕ {t("m.mvc.new")}</Text>
        </Pressable>
      )}

      {!form && (
        <>
          {msg && <Text style={s.err}>{msg}</Text>}
          <SectionTitle>
            {t("m.mvc.costs")} ({rows.length})
          </SectionTitle>
          {rows.length === 0 && <Text style={s.dim}>{t("m.mvc.empty")}</Text>}
          {rows.map((r) => (
            <Card key={r.id} style={{ gap: 6 }}>
              <View style={s.rowTop}>
                <Text style={s.name}>
                  {catLabel(r.category)} · {r.amount} {r.currency}
                </Text>
                <Pressable
                  onPress={() => confirmDelete(r)}
                  hitSlop={8}
                  accessibilityLabel={t("m.manage.delete")}
                >
                  <Text style={s.delLink}>🗑</Text>
                </Pressable>
              </View>
              <Text style={s.dim}>
                {[`🚚 ${regOf(r.vehicle_id)}`, r.cost_date, r.description]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
            </Card>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.black },
  content: { padding: 16, gap: 10, paddingBottom: 32 },
  addBtn: {
    backgroundColor: palette.red,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  addText: { color: palette.white, fontWeight: "800", fontSize: 15 },
  lbl: { color: palette.smoke, fontSize: 12.5 },
  input: {
    borderWidth: 1,
    borderColor: palette.graphite,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: palette.offWhite,
    fontSize: 15,
    backgroundColor: palette.nearBlack,
  },
  row2: { flexDirection: "row", gap: 10 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: palette.graphite,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipOn: { backgroundColor: palette.red, borderColor: palette.red },
  chipText: { color: palette.smoke, fontSize: 12.5, fontWeight: "600" },
  // [#388] Wygląd tekstu wybranego chipa w jednym miejscu — kategorie miały go
  // wpisanego w JSX-ie, więc drugi zestaw chipów musiałby to skopiować.
  chipTextOn: { color: palette.white },
  err: { color: palette.red, fontSize: 13 },
  cancel: { color: palette.smoke, textAlign: "center", paddingVertical: 8 },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  name: { color: palette.offWhite, fontSize: 14.5, fontWeight: "800", flexShrink: 1 },
  delLink: { fontSize: 16 },
  dim: { color: palette.smoke, fontSize: 12.5 },
});
