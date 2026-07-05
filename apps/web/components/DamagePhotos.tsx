"use client";

import {
  type DamagePhoto,
  listDamagePhotos,
  removeDamagePhoto,
  uploadDamagePhoto,
} from "@e-logistic/api";
import { cssPalette as palette } from "@e-logistic/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/Toast";
import { getBrowserSupabase } from "@/lib/supabase/client";

/**
 * #270: dowody szkody (zdjęcia, skan polisy/protokołu) — zwijana sekcja na
 * karcie szkody. Pliki w prywatnym buckecie, podpisane URL-e, usuwanie wg roli.
 */
export function DamagePhotos({ companyId, claimId }: { companyId: string; claimId: string }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [photos, setPhotos] = useState<DamagePhoto[]>([]);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const refresh = useCallback(async () => {
    try {
      setPhotos(await listDamagePhotos(getBrowserSupabase(), companyId, claimId));
    } catch {
      // brak dostępu / offline — sekcja pozostaje pusta
    }
  }, [companyId, claimId]);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      for (const f of Array.from(files)) {
        await uploadDamagePhoto(getBrowserSupabase(), companyId, claimId, f);
      }
      toast(`Dodano ${files.length} plik(ów).`, "success");
      await refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Błąd wgrywania.", "error");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function remove(path: string) {
    try {
      await removeDamagePhoto(getBrowserSupabase(), path);
      await refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Błąd usuwania.", "error");
    }
  }

  return (
    <div style={{ marginTop: 8 }}>
      <button type="button" style={styles.toggle} onClick={() => setOpen((v) => !v)}>
        📎 Dowody szkody {open ? "▾" : "▸"}
        {photos.length > 0 ? ` (${photos.length})` : ""}
      </button>
      {open && (
        <div style={styles.box}>
          <div style={styles.grid}>
            {photos.map((p) => (
              <div key={p.path} style={styles.thumbWrap}>
                <a href={p.signedUrl} target="_blank" rel="noreferrer">
                  {/* biome-ignore lint/performance/noImgElement: podpisany URL z prywatnego bucketa */}
                  <img src={p.signedUrl} alt={p.name} style={styles.thumb} />
                </a>
                <button type="button" style={styles.del} onClick={() => remove(p.path)}>
                  ✕
                </button>
              </div>
            ))}
            {photos.length === 0 && (
              <span style={{ color: palette.smoke, fontSize: 13 }}>
                Brak plików — dodaj zdjęcia uszkodzeń, protokół lub skan polisy.
              </span>
            )}
          </div>
          <label style={styles.addBtn}>
            {busy ? "Wgrywam…" : "➕ Dodaj pliki"}
            <input
              ref={fileRef}
              type="file"
              accept="image/*,.pdf"
              multiple
              style={{ display: "none" }}
              disabled={busy}
              onChange={(e) => onFiles(e.target.files)}
            />
          </label>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  toggle: {
    background: "transparent",
    border: "none",
    color: palette.offWhite,
    cursor: "pointer",
    padding: 0,
    fontSize: 13,
    fontWeight: 700,
  },
  box: { marginTop: 8, display: "flex", flexDirection: "column", gap: 10 },
  grid: { display: "flex", flexWrap: "wrap", gap: 8 },
  thumbWrap: { position: "relative" },
  thumb: {
    width: 92,
    height: 92,
    objectFit: "cover",
    borderRadius: 8,
    border: `1px solid ${palette.graphite}`,
  },
  del: {
    position: "absolute",
    top: -6,
    right: -6,
    background: palette.red,
    color: palette.white,
    border: "none",
    borderRadius: 999,
    width: 20,
    height: 20,
    cursor: "pointer",
    fontSize: 11,
    lineHeight: "20px",
    padding: 0,
  },
  addBtn: {
    alignSelf: "flex-start",
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
    padding: "8px 14px",
    color: palette.offWhite,
    cursor: "pointer",
    fontSize: 13,
  },
};
