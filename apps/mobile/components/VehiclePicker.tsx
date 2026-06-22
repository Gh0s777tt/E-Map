import { palette } from "@e-logistic/ui";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { FleetVehicle } from "../lib/useFleet";

/** Wybór pojazdu (chipy rejestracji) — wspólny dla formularzy mobilnych. */
export function VehiclePicker({
  vehicles,
  loading,
  selectedId,
  onSelect,
}: {
  vehicles: FleetVehicle[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (loading) return <Text style={styles.note}>Ładowanie floty…</Text>;
  if (vehicles.length === 0) {
    return <Text style={styles.note}>Brak pojazdów — dodaj je w aplikacji web.</Text>;
  }
  return (
    <View style={styles.row}>
      {vehicles.map((v) => {
        const active = v.id === selectedId;
        return (
          <Pressable
            key={v.id}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onSelect(v.id)}
          >
            <Text style={active ? styles.chipTextActive : styles.chipText}>{v.registration}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  note: { color: palette.smoke, fontSize: 13 },
  chip: {
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipActive: { backgroundColor: palette.red, borderColor: palette.red },
  chipText: { color: palette.offWhite, fontSize: 13 },
  chipTextActive: { color: palette.white, fontWeight: "700", fontSize: 13 },
});
