/**
 * #358: współdzielony przycisk „📍 z GPS" — pobiera bieżącą pozycję i reverse-geocode
 * (TomTom → expo fallback, patrz lib/geoFill) do autouzupełnienia pól adresowych
 * formularzy zarządzania (kontrahenci, zlecenia). Sugestia edytowalna — nie blokuje
 * ręcznego wpisu. Fail-safe: brak zgody/uprawnień → onMsg(denied), formularz działa dalej.
 */
import { palette } from "@e-logistic/ui";
import { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { fillFromLocation, type PlaceFill } from "../lib/geoFill";
import { useT } from "../lib/i18n";

export function GeoFillButton({
  onFill,
  onMsg,
}: {
  onFill: (p: PlaceFill) => void;
  onMsg?: (s: string) => void;
}) {
  const t = useT();
  const [busy, setBusy] = useState(false);

  async function run() {
    if (busy) return; // guard: pojedynczy odczyt na tap
    setBusy(true);
    onMsg?.(t("m.geo.filling"));
    try {
      const p = await fillFromLocation();
      if (!p) {
        onMsg?.(t("m.geo.denied"));
        return;
      }
      onFill(p);
      onMsg?.(t("m.geo.filled"));
    } catch {
      onMsg?.(t("m.geo.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Pressable style={styles.btn} onPress={run} disabled={busy}>
      <Text style={styles.text}>{busy ? t("m.geo.filling") : t("m.geo.fromGps")}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: "center",
  },
  text: { color: palette.offWhite, fontWeight: "600", fontSize: 13 },
});
