/**
 * #294: Globalny pasek outboxu — cienka belka nad zakładkami, widoczna tylko
 * gdy jakieś wpisy (tankowanie/wydatek/trip/checklista) czekają na wysyłkę.
 * Dotknięcie = ponowna próba synchronizacji całej kolejki. Kierowca zawsze
 * widzi, że dane wypełnione bez zasięgu nie zginęły.
 */
import { palette } from "@e-logistic/ui";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { success, tap } from "../lib/haptics";
import { flushQueued, pendingCount, subscribeOutbox } from "../lib/outbox";
import { Icon } from "./Icon";

export function OfflineBar() {
  const insets = useSafeAreaInsets();
  const [pending, setPending] = useState(0);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    pendingCount()
      .then(setPending)
      .catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    return subscribeOutbox(refresh);
  }, [refresh]);

  if (pending === 0) return null;

  async function retry() {
    if (busy) return;
    tap();
    setBusy(true);
    try {
      await flushQueued();
      if ((await pendingCount()) === 0) success();
    } catch {
      // stan i tak odświeży subskrypcja
    } finally {
      setBusy(false);
    }
  }

  const few =
    pending % 10 >= 2 && pending % 10 <= 4 && !(pending % 100 >= 12 && pending % 100 <= 14);
  const label =
    pending === 1
      ? "1 wpis czeka na wysyłkę"
      : few
        ? `${pending} wpisy czekają na wysyłkę`
        : `${pending} wpisów czeka na wysyłkę`;
  return (
    <Pressable
      style={({ pressed }) => [s.bar, { paddingTop: insets.top + 7 }, pressed && { opacity: 0.8 }]}
      onPress={retry}
    >
      <Icon name="cloudOff" size={15} color={palette.white} strokeWidth={2.2} />
      <Text style={s.text}>{busy ? "Wysyłam…" : `${label} — dotknij, aby ponowić`}</Text>
      <Icon name="refresh" size={14} color={palette.white} strokeWidth={2.2} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: palette.red,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  text: { color: palette.white, fontSize: 13, fontWeight: "700" },
});
