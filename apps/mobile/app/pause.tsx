/**
 * [#375] Pauza / postój — ekran kierowcy.
 *
 * To on stoi na parkingu, więc bez tej wersji funkcja byłaby w połowie martwa:
 * panel webowy wypełnia zarząd, a nie osoba, która faktycznie robi postój.
 *
 * Świadomie BEZ kolejki offline. Postój to wpis o miejscu i przebiegu w danym
 * momencie — zsynchronizowany trzy dni później miałby sens tylko z datą
 * zdarzenia, a tej kierowca na parkingu i tak nie wpisuje ręcznie. Zamiast
 * udawać, że zapisano, mówimy wprost, że trzeba zasięgu.
 */
import { getActiveMembership, insertPauseEvent, listFuelCardsForUser } from "@e-logistic/api";
import { palette } from "@e-logistic/ui";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AppHeader } from "../components/AppHeader";
import { Card, PrimaryButton, SectionTitle, wide } from "../components/ui";
import { VehiclePicker } from "../components/VehiclePicker";
import { fillFromLocation, requiresPostcode } from "../lib/geoFill";
import { tap, warn } from "../lib/haptics";
import { useT } from "../lib/i18n";
import { getSupabase, supabaseConfigured } from "../lib/supabase";
import { useFleet } from "../lib/useFleet";

const CURRENCIES = ["PLN", "EUR", "GBP", "CZK"] as const;
/** Zgodne z `_is_payment_method` z migracji 0095. */
const PAYMENTS = ["cash", "card", "toll_box", "snap", "travis", "other"] as const;
/** Etykiety metod płatności — krótkie, bez tłumaczenia (nazwy własne usług). */
const PAY_LABEL: Record<(typeof PAYMENTS)[number], string> = {
  cash: "Gotówka",
  card: "Karta",
  toll_box: "Toll",
  snap: "SNAP",
  travis: "Travis",
  other: "Inne",
};

export default function PauseScreen() {
  const t = useT();
  const { vehicles, loading } = useFleet();
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [postcode, setPostcode] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [odometerKm, setOdometerKm] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState<(typeof CURRENCIES)[number]>("EUR");
  const [secured, setSecured] = useState(false);
  const [payment, setPayment] = useState<(typeof PAYMENTS)[number] | null>(null);
  const [cards, setCards] = useState<{ id: string; label: string }[]>([]);
  const [cardId, setCardId] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!vehicleId && vehicles[0]) setVehicleId(vehicles[0].id);
  }, [vehicles, vehicleId]);

  useEffect(() => {
    if (!supabaseConfigured) return;
    listFuelCardsForUser(getSupabase())
      .then((rows) =>
        setCards(
          rows.map((c) => ({
            id: c.id,
            label: `${String(c.provider).toUpperCase()} •••• ${c.card_number_masked ?? ""}`.trim(),
          })),
        ),
      )
      .catch(() => {});
  }, []);

  const fillGps = useCallback(async () => {
    const place = await fillFromLocation();
    if (!place) {
      warn();
      setMsg(t("m.chat.locationDenied"));
      return;
    }
    setCountry(place.country);
    setCity(place.city);
    setPostcode(place.postcode);
    setCoords({ lat: place.lat, lng: place.lng });
    tap();
  }, [t]);

  async function save() {
    if (busy) return;
    if (!country.trim()) {
      warn();
      setMsg(t("m.pause.needCountry"));
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const sb = getSupabase();
      const m = await getActiveMembership(sb);
      if (!m) throw new Error(t("m.chat.noCompany"));
      await insertPauseEvent(sb, {
        companyId: m.companyId,
        vehicleId,
        country: country.trim(),
        city: city || null,
        postcode: postcode || null,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        odometerKm: odometerKm ? Number(odometerKm) : null,
        priceTotal: price ? Number(price) : null,
        currency,
        securedParking: secured,
        paymentMethod: payment,
        fuelCardId: payment === "card" ? cardId : null,
        comment: comment || null,
      });
      tap();
      setMsg(t("m.pause.saved"));
      setPrice("");
      setOdometerKm("");
      setComment("");
    } catch {
      warn();
      setMsg(t("m.pause.saveFail"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={s.screen}>
      <AppHeader subtitle={t("m.pause.title")} />
      <ScrollView contentContainerStyle={[s.content, wide]} keyboardShouldPersistTaps="handled">
        <Text style={s.hint}>{t("m.pause.hint")}</Text>

        <VehiclePicker
          vehicles={vehicles}
          loading={loading}
          selectedId={vehicleId}
          onSelect={setVehicleId}
        />

        <Card style={{ gap: 10 }}>
          <Pressable style={s.gps} onPress={fillGps}>
            <Text style={s.gpsText}>{t("m.pause.fillFromGps")}</Text>
          </Pressable>

          <TextInput
            style={s.input}
            value={country}
            onChangeText={setCountry}
            placeholder={t("m.trip.country")}
            placeholderTextColor={palette.smoke}
            autoCapitalize="characters"
          />
          <TextInput
            style={s.input}
            value={city}
            onChangeText={setCity}
            placeholder={t("m.trip.city")}
            placeholderTextColor={palette.smoke}
          />
          {/* Kod pocztowy pokazujemy tam, gdzie realnie identyfikuje miejsce
              (UK: jeden kod = jeden punkt) — patrz `requiresPostcode`. */}
          {requiresPostcode(country) && (
            <TextInput
              style={s.input}
              value={postcode}
              onChangeText={setPostcode}
              placeholder={t("m.trip.postcode")}
              placeholderTextColor={palette.smoke}
              autoCapitalize="characters"
            />
          )}
        </Card>

        <Card style={{ gap: 10 }}>
          <TextInput
            style={s.input}
            value={odometerKm}
            onChangeText={setOdometerKm}
            placeholder={t("m.trip.odometer")}
            placeholderTextColor={palette.smoke}
            keyboardType="numeric"
          />

          <SectionTitle>{t("m.pause.price")}</SectionTitle>
          <View style={s.row}>
            <TextInput
              style={[s.input, { flex: 1 }]}
              value={price}
              onChangeText={setPrice}
              placeholder="0,00"
              placeholderTextColor={palette.smoke}
              keyboardType="decimal-pad"
            />
            <View style={s.chips}>
              {CURRENCIES.map((c) => (
                <Pressable
                  key={c}
                  style={[s.chip, currency === c && s.chipOn]}
                  onPress={() => setCurrency(c)}
                >
                  <Text style={[s.chipText, currency === c && s.chipTextOn]}>{c}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <SectionTitle>{t("m.pause.payment")}</SectionTitle>
          <View style={s.chips}>
            {PAYMENTS.map((p) => (
              <Pressable
                key={p}
                style={[s.chip, payment === p && s.chipOn]}
                onPress={() => setPayment(payment === p ? null : p)}
              >
                <Text style={[s.chipText, payment === p && s.chipTextOn]}>{PAY_LABEL[p]}</Text>
              </Pressable>
            ))}
          </View>

          {payment === "card" && cards.length > 0 && (
            <View style={s.chips}>
              {cards.map((c) => (
                <Pressable
                  key={c.id}
                  style={[s.chip, cardId === c.id && s.chipOn]}
                  onPress={() => setCardId(c.id)}
                >
                  <Text style={[s.chipText, cardId === c.id && s.chipTextOn]}>{c.label}</Text>
                </Pressable>
              ))}
            </View>
          )}

          <Pressable style={s.check} onPress={() => setSecured((v) => !v)}>
            <Text style={s.checkBox}>{secured ? "☑" : "☐"}</Text>
            <Text style={s.checkText}>{t("m.pause.secured")}</Text>
          </Pressable>

          <TextInput
            style={[s.input, { minHeight: 70, textAlignVertical: "top" }]}
            value={comment}
            onChangeText={setComment}
            placeholder={t("m.trip.comment")}
            placeholderTextColor={palette.smoke}
            multiline
          />
        </Card>

        {msg && <Text style={s.msg}>{msg}</Text>}
        <PrimaryButton label={busy ? "…" : t("m.profile.save")} onPress={save} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.black },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  hint: { color: palette.smoke, fontSize: 13, lineHeight: 19 },
  input: {
    backgroundColor: palette.nearBlack,
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 12,
    color: palette.offWhite,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  row: { flexDirection: "row", gap: 8, alignItems: "center", flexWrap: "wrap" },
  chips: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  chip: {
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chipOn: { backgroundColor: palette.red, borderColor: palette.red },
  chipText: { color: palette.smoke, fontSize: 14, fontWeight: "600" },
  chipTextOn: { color: palette.white, fontWeight: "800" },
  gps: {
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  gpsText: { color: palette.offWhite, fontSize: 15, fontWeight: "700" },
  check: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  checkBox: { color: palette.red, fontSize: 22 },
  checkText: { color: palette.offWhite, fontSize: 15 },
  msg: { color: palette.smoke, fontSize: 13 },
});
