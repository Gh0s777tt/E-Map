/**
 * [#375] Pole „Kraj" dla kierowcy — kod ISO 3166-1 alpha-2.
 *
 * W przeglądarce ten sam problem rozwiązuje `datalist`; tutaj go nie ma, więc
 * pole robi dwie rzeczy: daje skróty do krajów, po których ta flota realnie
 * jeździ, i od razu pokazuje, czy wpis został rozpoznany. To drugie jest
 * ważniejsze — do tej pory kierowca nie miał żadnego sygnału, że w polu „Kraj"
 * wylądowało „10115 Berlin" z geokodera (#372), a wpis po cichu wypadał
 * z rozliczenia VAT dopiero u księgowej.
 *
 * Pole nie blokuje pisania. Kraju spoza skrótów nadal można wpisać z ręki,
 * a ostrzeżenie jest ostrzeżeniem, nie zaporą — walidację twardą robi schemat
 * przy zapisie.
 */
import { normalizeCountry } from "@e-logistic/core";
import { palette } from "@e-logistic/ui";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useT } from "../lib/i18n";

/** Skróty: kierunki, na których ta flota jeździ najczęściej. */
const QUICK = ["PL", "DE", "NL", "BE", "FR", "CZ", "SK", "AT", "IT", "ES", "GB"] as const;

export function CountryField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const t = useT();
  const code = normalizeCountry(value);
  const typed = value.trim().length > 0;

  return (
    <View style={{ gap: 8 }}>
      <View style={s.row}>
        <TextInput
          style={[s.input, { flex: 1 }]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder ?? t("m.country.hint")}
          placeholderTextColor={palette.smoke}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={56}
        />
        {/* Potwierdzenie rozpoznania. Pokazujemy kod, a nie nazwę: nazwy mamy
            tylko po polsku, a aplikacja chodzi w czterech językach. */}
        {typed && code && <Text style={s.ok}>✓ {code}</Text>}
      </View>

      {typed && !code && <Text style={s.warn}>{t("m.country.unknown")}</Text>}

      <View style={s.chips}>
        {QUICK.map((c) => (
          <Pressable key={c} style={[s.chip, code === c && s.chipOn]} onPress={() => onChange(c)}>
            <Text style={[s.chipText, code === c && s.chipTextOn]}>{c}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
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
  ok: { color: palette.offWhite, fontSize: 15, fontWeight: "800" },
  warn: { color: palette.red, fontSize: 13 },
  chips: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  chip: {
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipOn: { backgroundColor: palette.red, borderColor: palette.red },
  chipText: { color: palette.smoke, fontSize: 13, fontWeight: "700" },
  chipTextOn: { color: palette.white, fontWeight: "800" },
});
