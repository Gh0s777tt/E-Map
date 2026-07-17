/**
 * #289: QR potwierdzenia/śledzenia zlecenia (mockup POD) — kierowca pokazuje
 * odbiorcy kod, odbiorca skanuje i widzi publiczną stronę statusu przesyłki.
 * Ten sam link firma może wysłać klientowi (portal śledzenia).
 */
import { getOrderTrackingToken, trackingUrl } from "@e-logistic/api";
import { palette } from "@e-logistic/ui";
import { useState } from "react";
import { Modal, Pressable, Share, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useT } from "../lib/i18n";
import { getSupabase } from "../lib/supabase";

export function TrackingQrButton({ orderId, label }: { orderId: string; label: string }) {
  const t = useT();
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function open() {
    setBusy(true);
    setErr(null);
    try {
      const token = await getOrderTrackingToken(getSupabase(), orderId);
      setUrl(trackingUrl(token));
    } catch {
      setErr(t("m.track.loadError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Pressable style={s.btn} onPress={open} disabled={busy}>
        <Text style={s.btnText}>{busy ? t("m.track.loading") : t("m.track.qrButton")}</Text>
      </Pressable>
      {err && <Text style={s.err}>{err}</Text>}

      <Modal visible={url !== null} transparent animationType="fade">
        <View style={s.backdrop}>
          <View style={s.sheet}>
            <Text style={s.title}>{t("m.track.title")}</Text>
            <Text style={s.subtitle}>{label}</Text>
            <View style={s.qrBox}>{url && <QRCode value={url} size={220} />}</View>
            <Text style={s.hint}>{t("m.track.hint")}</Text>
            <View style={s.row}>
              <Pressable
                style={s.share}
                onPress={() => url && Share.share({ message: url }).catch(() => {})}
              >
                <Text style={s.shareText}>{t("m.track.share")}</Text>
              </Pressable>
              <Pressable style={s.close} onPress={() => setUrl(null)}>
                <Text style={s.closeText}>{t("m.track.close")}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  btn: {
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: "center",
  },
  btnText: { color: palette.offWhite, fontWeight: "600", fontSize: 14 },
  err: { color: palette.red, fontSize: 12 },
  backdrop: {
    flex: 1,
    backgroundColor: "#000000cc",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  sheet: {
    backgroundColor: palette.nearBlack,
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    gap: 10,
    width: "100%",
    maxWidth: 360,
  },
  title: { color: palette.offWhite, fontSize: 20, fontWeight: "800" },
  subtitle: { color: palette.smoke, fontSize: 14, textAlign: "center" },
  qrBox: { backgroundColor: palette.white, borderRadius: 16, padding: 16, marginVertical: 8 },
  hint: { color: palette.smoke, fontSize: 12, textAlign: "center", lineHeight: 17 },
  row: { flexDirection: "row", gap: 10, marginTop: 8, alignSelf: "stretch" },
  share: {
    flex: 1,
    backgroundColor: palette.red,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  shareText: { color: palette.white, fontWeight: "700" },
  close: {
    flex: 1,
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  closeText: { color: palette.offWhite, fontWeight: "700" },
});
