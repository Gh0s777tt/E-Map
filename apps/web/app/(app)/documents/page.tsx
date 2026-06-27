"use client";

import {
  type DocumentMeta,
  deleteDocument,
  getDocumentUrl,
  listDocuments,
  uploadDocument,
} from "@e-logistic/api";
import { DOCUMENT_CATEGORIES, type ExpiryLevel, expiryStatus } from "@e-logistic/core";
import { cssPalette as palette } from "@e-logistic/ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useConfirm } from "@/components/ConfirmProvider";
import * as f from "@/components/formStyles";
import { ListStatus } from "@/components/ListStatus";
import { Badge, Button, PageHeader, SetupNotice } from "@/components/ui";
import { csvDateStamp, downloadCsv } from "@/lib/csv";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { useFleet } from "@/lib/useFleet";

const EXPIRY_COLOR: Record<ExpiryLevel, string> = {
  expired: palette.red,
  soon: "#f59e0b",
  ok: "#22c55e",
};

function formatBytes(n: number | null): string {
  if (n == null) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

const MAX_MB = 25;

export default function DocumentsPage() {
  const { vehicles, source } = useFleet();
  const confirm = useConfirm();
  const fileRef = useRef<HTMLInputElement>(null);
  const [docs, setDocs] = useState<DocumentMeta[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadErr(null);
    try {
      const sb = getBrowserSupabase();
      const m = await getCachedMembership(sb);
      if (!m) {
        setDocs([]);
        return;
      }
      setCanManage(m.role === "owner" || m.role === "dispatcher");
      setDocs(await listDocuments(sb, m.companyId));
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Nie udało się pobrać dokumentów.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const today = new Date().toISOString().slice(0, 10);
  const regOf = (id: string | null) =>
    id ? (vehicles.find((v) => v.id === id)?.registration ?? "—") : null;

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const d of docs) if (d.category) set.add(d.category);
    return [...set].sort();
  }, [docs]);

  const filtered = useMemo(
    () => (filter === "all" ? docs : docs.filter((d) => d.category === filter)),
    [docs, filter],
  );

  function pickFile(f: File | null) {
    setFile(f);
    if (f && !name.trim()) setName(f.name.replace(/\.[^.]+$/, ""));
  }

  function resetForm() {
    setFile(null);
    setName("");
    setCategory("");
    setVehicleId("");
    setExpiryDate("");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function upload() {
    setMsg(null);
    if (!file) {
      setMsg("Wybierz plik.");
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setMsg(`Plik za duży (max ${MAX_MB} MB).`);
      return;
    }
    setBusy(true);
    try {
      const sb = getBrowserSupabase();
      const m = await getCachedMembership(sb);
      if (!m) {
        setMsg("Brak firmy.");
        return;
      }
      await uploadDocument(sb, m.companyId, file, {
        name: name.trim() || file.name,
        vehicleId: vehicleId || undefined,
        category: category || undefined,
        expiryDate: expiryDate || undefined,
      });
      setMsg("✅ Dokument wgrany.");
      resetForm();
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Błąd wgrywania.");
    } finally {
      setBusy(false);
    }
  }

  function exportCsv() {
    const headers = ["Nazwa", "Kategoria", "Pojazd", "Rozmiar (B)", "Termin", "Dodano"];
    const rows = filtered.map((d) => [
      d.name,
      d.category ?? "",
      regOf(d.vehicle_id) ?? "",
      d.size_bytes ?? "",
      d.expiry_date ?? "",
      d.created_at.slice(0, 10),
    ]);
    downloadCsv(`dokumenty_${csvDateStamp()}.csv`, headers, rows);
  }

  async function openDoc(d: DocumentMeta) {
    try {
      const url = await getDocumentUrl(getBrowserSupabase(), d.path, 120);
      window.open(url, "_blank", "noopener");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Nie udało się otworzyć dokumentu.");
    }
  }

  async function remove(d: DocumentMeta) {
    if (!(await confirm(`Usunąć dokument „${d.name}"?`))) return;
    try {
      await deleteDocument(getBrowserSupabase(), d);
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Błąd usuwania.");
    }
  }

  return (
    <div style={{ maxWidth: 920 }}>
      <PageHeader
        title="Sejf dokumentów"
        subtitle="Bezpieczne miejsce na dokumenty firmy i pojazdów (OC, przeglądy, leasing, umowy). Prywatne — dostęp tylko dla Twojej firmy; przypomnienia o terminach ważności."
      />

      <SetupNotice source={source} />

      {canManage && (
        <div style={styles.form}>
          <div style={styles.grid}>
            <label style={styles.field}>
              <span style={f.label}>Plik (max {MAX_MB} MB)</span>
              <input
                ref={fileRef}
                style={f.input}
                type="file"
                onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <label style={styles.field}>
              <span style={f.label}>Nazwa</span>
              <input
                style={f.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="np. OC ciągnik 2026"
              />
            </label>
          </div>
          <div style={styles.grid}>
            <label style={styles.field}>
              <span style={f.label}>Kategoria</span>
              <select
                style={f.input}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">— brak —</option>
                {DOCUMENT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label style={styles.field}>
              <span style={f.label}>Pojazd (opcjonalnie)</span>
              <select
                style={f.input}
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
              >
                <option value="">— brak —</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registration}
                  </option>
                ))}
              </select>
            </label>
            <label style={styles.field}>
              <span style={f.label}>Termin ważności</span>
              <input
                style={f.input}
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </label>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Button onClick={upload} disabled={busy || !file}>
              {busy ? "Wgrywanie…" : "⬆️ Wgraj dokument"}
            </Button>
            {file && (
              <span style={styles.dim}>
                {file.name} · {formatBytes(file.size)}
              </span>
            )}
          </div>
          {msg && <p style={{ color: palette.smoke, fontSize: 14 }}>{msg}</p>}
        </div>
      )}

      {docs.length > 0 && (
        <div style={styles.filters}>
          {["all", ...categories].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setFilter(c)}
              style={filter === c ? styles.chipActive : styles.chip}
            >
              {c === "all" ? "Wszystkie" : c}
            </button>
          ))}
          <span style={{ flex: 1 }} />
          <Button variant="ghost" onClick={exportCsv}>
            ⬇️ CSV
          </Button>
          <span style={{ color: palette.smoke, fontSize: 13, whiteSpace: "nowrap" }}>
            {filtered.length} z {docs.length}
          </span>
        </div>
      )}

      <ListStatus
        loading={loading}
        error={loadErr}
        empty={docs.length === 0}
        emptyText="Brak dokumentów. Wgraj pierwszy plik."
        onRetry={load}
      />
      {!loading && !loadErr && filtered.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          {filtered.map((d) => {
            const exp = d.expiry_date ? expiryStatus(d.expiry_date, today) : null;
            return (
              <div key={d.id} style={styles.card}>
                <div style={styles.cardHead}>
                  <button type="button" style={styles.docName} onClick={() => openDoc(d)}>
                    📄 {d.name}
                  </button>
                  {d.category && <Badge color={palette.smoke}>{d.category}</Badge>}
                  {exp && (
                    <Badge color={EXPIRY_COLOR[exp.level]}>
                      {exp.level === "expired"
                        ? `przeterminowany (${-exp.daysLeft} dni)`
                        : `ważny do ${d.expiry_date} (${exp.daysLeft} dni)`}
                    </Badge>
                  )}
                  <span style={{ flex: 1 }} />
                  {canManage && (
                    <Button variant="danger" onClick={() => remove(d)}>
                      🗑️
                    </Button>
                  )}
                </div>
                <div style={styles.cardBody}>
                  {regOf(d.vehicle_id) && <span style={styles.dim}>🚚 {regOf(d.vehicle_id)}</span>}
                  <span style={styles.dim}>{formatBytes(d.size_bytes)}</span>
                  <span style={styles.dim}>dodano {d.created_at.slice(0, 10)}</span>
                  <Button variant="ghost" onClick={() => openDoc(d)}>
                    ⬇️ Pobierz
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: { display: "flex", flexDirection: "column", gap: 12, marginTop: 16, maxWidth: 720 },
  grid: { display: "flex", gap: 12, flexWrap: "wrap" },
  field: { display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 160 },
  filters: { display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginTop: 16 },
  chip: {
    background: "transparent",
    color: palette.smoke,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 999,
    padding: "5px 12px",
    fontSize: 13,
    cursor: "pointer",
  },
  chipActive: {
    background: palette.red,
    color: palette.white,
    border: `1px solid ${palette.red}`,
    borderRadius: 999,
    padding: "5px 12px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
  card: {
    borderRadius: 10,
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    padding: "12px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  cardHead: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },
  docName: {
    background: "transparent",
    border: "none",
    color: palette.offWhite,
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer",
    padding: 0,
    textAlign: "left",
  },
  cardBody: { display: "flex", gap: 14, flexWrap: "wrap", fontSize: 14, alignItems: "center" },
  dim: { color: palette.smoke, fontSize: 13 },
};
