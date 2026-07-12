/**
 * #295: FAB „＋" — pływający przycisk szybkich akcji (prawy dolny róg pulpitu).
 * Rozwija pionową listę: Tankowanie / AdBlue / Wydatek / Usterka — kierowca
 * na stacji dodaje wpis jednym dotknięciem, bez nawigowania po menu.
 */
import { type IconName, palette } from "@e-logistic/ui";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { tap } from "../lib/haptics";
import { Icon } from "./Icon";

export interface FabAction {
  icon: IconName;
  label: string;
  onPress: () => void;
}

export function Fab({ actions }: { actions: FabAction[] }) {
  const [open, setOpen] = useState(false);

  function run(a: FabAction) {
    setOpen(false);
    tap();
    a.onPress();
  }

  return (
    <>
      {open && (
        <Pressable
          style={s.backdrop}
          onPress={() => setOpen(false)}
          accessibilityLabel="Zamknij szybkie akcje"
        />
      )}
      <View pointerEvents="box-none" style={s.wrap}>
        {open &&
          actions.map((a) => (
            <Pressable key={a.label} style={s.item} onPress={() => run(a)}>
              <Text style={s.itemLabel}>{a.label}</Text>
              <View style={s.itemIcon}>
                <Icon name={a.icon} size={18} color={palette.white} />
              </View>
            </Pressable>
          ))}
        <Pressable
          style={s.fab}
          onPress={() => {
            tap();
            setOpen((o) => !o);
          }}
          accessibilityLabel={open ? "Zamknij szybkie akcje" : "Szybkie akcje"}
        >
          <Icon name={open ? "x" : "plus"} size={26} color={palette.white} strokeWidth={2.4} />
        </Pressable>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#000000aa",
  },
  wrap: { position: "absolute", right: 18, bottom: 22, alignItems: "flex-end", gap: 10 },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: palette.red,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  item: { flexDirection: "row", alignItems: "center", gap: 10 },
  itemLabel: {
    color: palette.offWhite,
    fontSize: 14,
    fontWeight: "700",
    backgroundColor: palette.nearBlack,
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    overflow: "hidden",
  },
  itemIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: palette.red,
    alignItems: "center",
    justifyContent: "center",
  },
});
