import {
  getActiveMembership,
  getOrderPhotoUrl,
  listOrderPhotos,
  type OrderPhoto,
  uploadOrderPhotoBinary,
} from "@e-logistic/api";
import {
  buildPodCaption,
  DEFAULT_PHOTO_CATEGORY,
  PHOTO_CATEGORIES,
  PHOTO_KIND_LABEL,
  PHOTO_KINDS,
  type PhotoKind,
  parsePodCaption,
  photoCategoryCaption,
  resolvePhotoKind,
} from "@e-logistic/core";
import { palette } from "@e-logistic/ui";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useT } from "../lib/i18n";
import { getSupabase, supabaseConfigured } from "../lib/supabase";
import { SignaturePadMobile } from "./SignaturePadMobile";

function extFromMime(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("heic")) return "heic";
  return "jpg";
}

/** Załączniki zlecenia na telefonie — zdjęcia towaru + podpis odbiorcy (POD). */
export function CargoPhotosMobile({ orderId }: { orderId: string }) {
  const t = useT();
  const [photos, setPhotos] = useState<OrderPhoto[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [podOpen, setPodOpen] = useState(false);
  const [recipient, setRecipient] = useState("");
  // #248: kategoria kolejnego zdjęcia (Towar/CMR/Dokument/Inne) → zapisywana w caption.
  const [category, setCategory] = useState<string>(DEFAULT_PHOTO_CATEGORY);
  // #249: filtr wyświetlanych załączników po typie.
  const [filterKind, setFilterKind] = useState<PhotoKind | "all">("all");

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
      setErr(e instanceof Error ? e.message : t("m.cargo.loadError"));
    }
  }, [orderId, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function addFrom(source: "camera" | "library") {
    setErr(null);
    if (!companyId) {
      setErr(t("m.cargo.noCompany"));
      return;
    }
    try {
      const perm =
        source === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setErr(t("m.cargo.permDenied"));
        return;
      }
      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync({ quality: 0.6 })
          : await ImagePicker.launchImageLibraryAsync({ quality: 0.6 });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset?.uri) {
        setErr(t("m.cargo.readFail"));
        return;
      }
      setBusy(true);
      const contentType = asset.mimeType ?? "image/jpeg";
      // #audyt Ś12: bez `base64:true` — czytamy bajty wprost z uri (fetch→arrayBuffer).
      // Base64 puchło o ~33%, trzymało cały string w pamięci JS i blokowało wątek
      // przy decode. Uint8Array idzie prosto do uploadu (jak ścieżka podpisu POD).
      const bytes = new Uint8Array(await (await fetch(asset.uri)).arrayBuffer());
      await uploadOrderPhotoBinary(getSupabase(), companyId, orderId, bytes, {
        contentType,
        ext: extFromMime(contentType),
        sizeBytes: asset.fileSize,
        caption: photoCategoryCaption(category),
      });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("m.cargo.uploadFail"));
    } finally {
      setBusy(false);
    }
  }

  /** Zapis podpisu odbiorcy (POD) jako wektorowy SVG z podpisem w `caption`. */
  async function savePod(svg: string) {
    if (!companyId) {
      setErr(t("m.cargo.noCompany"));
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const bytes = Uint8Array.from(svg, (c) => c.charCodeAt(0));
      const stamp = new Date().toLocaleString("pl-PL");
      await uploadOrderPhotoBinary(getSupabase(), companyId, orderId, bytes, {
        contentType: "image/svg+xml",
        ext: "svg",
        sizeBytes: bytes.length,
        caption: buildPodCaption(recipient, stamp),
      });
      setPodOpen(false);
      setRecipient("");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("m.cargo.signSaveFail"));
    } finally {
      setBusy(false);
    }
  }

  const shown = photos.filter((p) => filterKind === "all" || resolvePhotoKind(p) === filterKind);
  const presentKinds = PHOTO_KINDS.filter((k) => photos.some((p) => resolvePhotoKind(p) === k));

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.title}>{t("m.cargo.attachments")}</Text>
        <Text style={styles.count}>
          {photos.length > 0 ? t("m.cargo.count", { n: photos.length }) : t("m.cargo.countHint")}
        </Text>
      </View>

      <View style={styles.catChips}>
        {PHOTO_CATEGORIES.map((c) => (
          <Pressable
            key={c}
            style={[styles.catChip, category === c && styles.catChipActive]}
            onPress={() => setCategory(c)}
            disabled={busy}
          >
            <Text style={category === c ? styles.catChipTextActive : styles.catChipText}>{c}</Text>
          </Pressable>
        ))}
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
            <Text style={styles.btnText}>{t("m.cargo.photo")}</Text>
          )}
        </Pressable>
        <Pressable
          style={[styles.btnGhost, busy && styles.btnDisabled]}
          disabled={busy}
          onPress={() => addFrom("library")}
        >
          <Text style={styles.btnGhostText}>{t("m.cargo.gallery")}</Text>
        </Pressable>
        <Pressable
          style={[styles.btnGhost, busy && styles.btnDisabled]}
          disabled={busy}
          onPress={() => setPodOpen((v) => !v)}
        >
          <Text style={styles.btnGhostText}>{t("m.cargo.signature")}</Text>
        </Pressable>
      </View>

      {podOpen && (
        <View style={styles.podBox}>
          <Text style={styles.podHint}>{t("m.cargo.podHint")}</Text>
          <TextInput
            value={recipient}
            onChangeText={setRecipient}
            placeholder={t("m.cargo.recipientPh")}
            placeholderTextColor={palette.smoke}
            style={styles.input}
          />
          <SignaturePadMobile onSave={savePod} onCancel={() => setPodOpen(false)} busy={busy} />
        </View>
      )}

      {err && <Text style={styles.err}>{err}</Text>}

      {presentKinds.length > 1 && (
        <View style={styles.catChips}>
          <Pressable
            style={[styles.catChip, filterKind === "all" && styles.catChipActive]}
            onPress={() => setFilterKind("all")}
          >
            <Text style={filterKind === "all" ? styles.catChipTextActive : styles.catChipText}>
              {t("m.cargo.all", { n: photos.length })}
            </Text>
          </Pressable>
          {presentKinds.map((k) => (
            <Pressable
              key={k}
              style={[styles.catChip, filterKind === k && styles.catChipActive]}
              onPress={() => setFilterKind(k)}
            >
              <Text style={filterKind === k ? styles.catChipTextActive : styles.catChipText}>
                {PHOTO_KIND_LABEL[k]} ({photos.filter((p) => resolvePhotoKind(p) === k).length})
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {shown.length > 0 && (
        <View style={styles.grid}>
          {shown.map((p) => {
            const kind = resolvePhotoKind(p);
            if (kind === "pod") {
              const info = parsePodCaption(p.caption);
              return (
                <View key={p.id} style={styles.podChip}>
                  <Text style={styles.podChipTitle}>{t("m.cargo.pod")}</Text>
                  <Text style={styles.podChipText} numberOfLines={2}>
                    {info.recipient ?? t("m.cargo.signFallback")}
                  </Text>
                  {info.when && (
                    <Text style={styles.podChipWhen} numberOfLines={1}>
                      {info.when}
                    </Text>
                  )}
                </View>
              );
            }
            return (
              <View key={p.id} style={styles.thumbWrap}>
                {urls[p.id] ? (
                  <Image source={{ uri: urls[p.id] }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, styles.thumbEmpty]} />
                )}
                {kind !== "cargo" ? (
                  <View style={styles.catBadge}>
                    <Text style={styles.catBadgeText} numberOfLines={1}>
                      {PHOTO_KIND_LABEL[kind]}
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          })}
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
  podBox: {
    padding: 10,
    backgroundColor: palette.coal,
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 8,
    gap: 8,
  },
  podHint: { color: palette.smoke, fontSize: 12 },
  input: {
    color: palette.offWhite,
    backgroundColor: palette.black,
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
  },
  err: { color: palette.red, fontSize: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  thumb: { width: 84, height: 84, borderRadius: 8, backgroundColor: palette.nearBlack },
  thumbEmpty: { borderColor: palette.graphite, borderWidth: 1 },
  thumbWrap: { position: "relative", width: 84, height: 84 },
  catBadge: {
    position: "absolute",
    top: 4,
    left: 4,
    backgroundColor: palette.graphite,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 1,
    maxWidth: 76,
  },
  catBadgeText: { color: palette.white, fontSize: 10, fontWeight: "700" },
  catChips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  catChip: {
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  catChipActive: { backgroundColor: palette.red, borderColor: palette.red },
  catChipText: { color: palette.offWhite, fontSize: 12 },
  catChipTextActive: { color: palette.white, fontWeight: "700", fontSize: 12 },
  podChip: {
    width: 110,
    minHeight: 84,
    borderRadius: 8,
    borderColor: palette.red,
    borderWidth: 1,
    backgroundColor: palette.nearBlack,
    padding: 8,
    justifyContent: "center",
    gap: 2,
  },
  podChipTitle: { color: palette.red, fontWeight: "700", fontSize: 11 },
  podChipText: { color: palette.offWhite, fontSize: 12, fontWeight: "600" },
  podChipWhen: { color: palette.smoke, fontSize: 10 },
});
