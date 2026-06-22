"use client";

import {
  deleteOrderPhoto,
  getOrderPhotoUrl,
  listOrderPhotos,
  type OrderPhoto,
  uploadOrderPhoto,
} from "@e-logistic/api";
import { buildPodCaption, isPodCaption, parsePodCaption } from "@e-logistic/core";
import { palette } from "@e-logistic/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import { useConfirm } from "@/components/ConfirmProvider";
import { SignaturePad } from "@/components/SignaturePad";
import { Button } from "@/components/ui";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";

/**
 * Załączniki zlecenia: zdjęcia towaru (dowód zabezpieczenia) + podpis odbiorcy
 * (e-CMR / dowód dostawy — POD). Upload: każdy aktywny członek (kierowca).
 * Usuwanie: owner/dispatcher. Samodzielny — pobiera firmę/rolę z membership
 * i podpisane URL-e (bucket prywatny).
 */
export function CargoPhotos({ orderId }: { orderId: string }) {
  const confirm = useConfirm();
  const [photos, setPhotos] = useState<OrderPhoto[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [podOpen, setPodOpen] = useState(false);
  const [recipient, setRecipient] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const sb = getBrowserSupabase();
      const m = await getCachedMembership(sb);
      if (!m) return;
      setCompanyId(m.companyId);
      setCanManage(m.role === "owner" || m.role === "dispatcher");
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

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length || !companyId) return;
    setBusy(true);
    setErr(null);
    try {
      const sb = getBrowserSupabase();
      for (const f of Array.from(files)) {
        if (!f.type.startsWith("image/")) continue;
        await uploadOrderPhoto(sb, companyId, orderId, f);
      }
      await load();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Błąd wgrywania zdjęcia.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  /** Zapis podpisu odbiorcy (POD) jako załącznik PNG z podpisem w `caption`. */
  async function savePod(blob: Blob) {
    if (!companyId) return;
    setBusy(true);
    setErr(null);
    try {
      const sb = getBrowserSupabase();
      const stamp = new Date().toLocaleString("pl-PL");
      const caption = buildPodCaption(recipient, stamp);
      const file = new File([blob], "pod-podpis.png", { type: "image/png" });
      await uploadOrderPhoto(sb, companyId, orderId, file, caption);
      setPodOpen(false);
      setRecipient("");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Błąd zapisu podpisu.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(p: OrderPhoto) {
    const what = isPodCaption(p.caption) ? "podpis odbiorcy (POD)" : "zdjęcie towaru";
    if (!(await confirm(`Usunąć ${what}?`))) return;
    try {
      await deleteOrderPhoto(getBrowserSupabase(), p);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Błąd usuwania.");
    }
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.head}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>📸 Załączniki zlecenia</span>
        <span style={{ color: palette.smoke, fontSize: 12 }}>
          {photos.length > 0 ? `${photos.length} szt.` : "zdjęcia / podpis (opcjonalnie)"}
        </span>
        <span style={{ flex: 1 }} />
        <Button variant="ghost" onClick={() => setPodOpen((v) => !v)} disabled={busy}>
          ✍️ Podpis (POD)
        </Button>
        <Button variant="ghost" onClick={() => fileRef.current?.click()} disabled={busy}>
          {busy ? "Wgrywam…" : "➕ Dodaj"}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          capture="environment"
          onChange={onPick}
          style={{ display: "none" }}
        />
      </div>

      {podOpen && (
        <div style={styles.podBox}>
          <div style={{ fontSize: 12, color: palette.smoke, marginBottom: 6 }}>
            🧾 Dowód dostawy (e-CMR) — podpis odbiorcy potwierdza odbiór towaru.
          </div>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="Imię i nazwisko odbiorcy (opcjonalnie)"
            style={styles.input}
          />
          <div style={{ marginTop: 8 }}>
            <SignaturePad onSave={savePod} onCancel={() => setPodOpen(false)} busy={busy} />
          </div>
        </div>
      )}

      {err && <p style={{ color: palette.red, fontSize: 12, margin: "4px 0 0" }}>{err}</p>}

      {photos.length > 0 && (
        <div style={styles.grid}>
          {photos.map((p) => {
            const pod = isPodCaption(p.caption);
            const podInfo = pod ? parsePodCaption(p.caption) : null;
            return (
              <div key={p.id} style={styles.thumb}>
                {urls[p.id] ? (
                  <a href={urls[p.id]} target="_blank" rel="noreferrer">
                    {/* biome-ignore lint/performance/noImgElement: podgląd z podpisanego URL Storage (bucket prywatny, nie next/image) */}
                    <img
                      src={urls[p.id]}
                      alt={pod ? "Podpis odbiorcy" : "Towar"}
                      style={{ ...styles.img, ...(pod ? styles.imgPod : null) }}
                    />
                  </a>
                ) : (
                  <div style={{ ...styles.img, background: palette.black }} />
                )}
                {pod && <span style={styles.podBadge}>✍️ POD</span>}
                {canManage && (
                  <button
                    type="button"
                    style={styles.del}
                    onClick={() => remove(p)}
                    aria-label="Usuń"
                  >
                    ✕
                  </button>
                )}
                {pod && p.caption && (
                  <span style={styles.cap} title={p.caption}>
                    {podInfo?.recipient ?? podInfo?.when ?? "podpis"}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    marginTop: 4,
    padding: "10px 12px",
    background: palette.black,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
  },
  head: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  podBox: {
    marginTop: 8,
    padding: 10,
    background: palette.coal,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
  },
  input: {
    width: "100%",
    padding: "8px 10px",
    background: palette.black,
    color: palette.white,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
    fontSize: 13,
  },
  grid: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 },
  thumb: { position: "relative", width: 84, height: 84 },
  img: {
    width: 84,
    height: 84,
    objectFit: "cover",
    borderRadius: 8,
    border: `1px solid ${palette.graphite}`,
    display: "block",
  },
  imgPod: { objectFit: "contain", background: "#ffffff", border: `1px solid ${palette.red}` },
  podBadge: {
    position: "absolute",
    top: 4,
    left: 4,
    fontSize: 10,
    fontWeight: 700,
    padding: "1px 5px",
    borderRadius: 999,
    background: palette.red,
    color: palette.white,
  },
  cap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    fontSize: 9,
    lineHeight: 1.2,
    padding: "2px 4px",
    background: "rgba(0,0,0,0.65)",
    color: palette.white,
    borderRadius: "0 0 8px 8px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  del: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 999,
    background: palette.red,
    color: palette.white,
    border: "none",
    cursor: "pointer",
    fontSize: 12,
    lineHeight: 1,
  },
};
