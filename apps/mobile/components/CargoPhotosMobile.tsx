import {
  getActiveMembership,
  getOrderPhotoUrl,
  listOrderPhotos,
  type OrderPhoto,
  uploadOrderPhotoBinary,
} from "@e-logistic/api";
import { palette } from "@e-logistic/ui";
import { decode } from "base64-arraybuffer";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { getSupabase, supabaseConfigured } from "../lib/supabase";

function extFromMime(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("heic")) return "heic";
  return "jpg";
}

/** Zdjęcia towaru przy zleceniu na telefonie — podgląd + aparat/galeria → upload. */
export function CargoPhotosMobile({ orderId }: { orderId: string }) {
  const [photos, setPhotos] = useState<OrderPhoto[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabaseConfigured) return;
    try {
      const sb = getSupabase();
      const m = await getActiveMembership(sb);
      if (!m) return;
      setCompanyId(m.companyId);
      const ps = await listOrderPhotos(sb, orderId);
      setPhotos(ps);
      const entries = await Promise.all(
        ps.map(async (p) => [p.id, await getOrderPhotoUrl(sb, p.path).catch(() => "")] as const),
      );
      setUrls(Object.fromEntries(entries));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Nie udało się pobrać zdjęć.");
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  async function addFrom(source: "camera" | "library") {
    setErr(null);
    if (!companyId) {
      setErr("Brak firmy.");
      return;
    }
    try {
      const perm =
        source === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setErr("Brak zgody na dostęp do aparatu/zdjęć.");
        return;
      }
      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync({ quality: 0.6, base64: true })
          : await ImagePicker.launchImageLibraryAsync({ quality: 0.6, base64: true });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset?.base64) {
        setErr("Nie udało się odczytać zdjęcia.");
        return;
      }
      setBusy(true);
      const contentType = asset.mimeType ?? "image/jpeg";
      await uploadOrderPhotoBinary(getSupabase(), companyId, orderId, decode(asset.base64), {
        contentType,
        ext: extFromMime(contentType),
        sizeBytes: asset.fileSize,
      });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Błąd wgrywania zdjęcia.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.title}>📸 Zdjęcia towaru</Text>
        <Text style={styles.count}>
          {photos.length > 0 ? `${photos.length} szt.` : "dowód zabezpieczenia"}
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={[styles.btn, busy && styles.btnDisabled]}
          disabled={busy}
          onPress={() => addFrom("camera")}
        >
          {busy ? (
            <ActivityIndicator color={palette.white} />
          ) : (
            <Text style={styles.btnText}>📷 Zrób zdjęcie</Text>
          )}
        </Pressable>
        <Pressable
          style={[styles.btnGhost, busy && styles.btnDisabled]}
          disabled={busy}
          onPress={() => addFrom("library")}
        >
          <Text style={styles.btnGhostText}>🖼️ Z galerii</Text>
        </Pressable>
      </View>
      {err && <Text style={styles.err}>{err}</Text>}

      {photos.length > 0 && (
        <View style={styles.grid}>
          {photos.map((p) =>
            urls[p.id] ? (
              <Image key={p.id} source={{ uri: urls[p.id] }} style={styles.thumb} />
            ) : (
              <View key={p.id} style={[styles.thumb, styles.thumbEmpty]} />
            ),
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 4,
    padding: 10,
    backgroundColor: palette.black,
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 8,
    gap: 8,
  },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { color: palette.offWhite, fontWeight: "700", fontSize: 13 },
  count: { color: palette.smoke, fontSize: 12 },
  actions: { flexDirection: "row", gap: 8 },
  btn: {
    flex: 1,
    backgroundColor: palette.red,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: palette.white, fontWeight: "700", fontSize: 14 },
  btnGhost: {
    flex: 1,
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  btnGhostText: { color: palette.offWhite, fontSize: 14 },
  err: { color: palette.red, fontSize: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  thumb: { width: 84, height: 84, borderRadius: 8, backgroundColor: palette.nearBlack },
  thumbEmpty: { borderColor: palette.graphite, borderWidth: 1 },
});
