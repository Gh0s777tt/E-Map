"use client";

import {
  type CompanyMember,
  type DocumentMeta,
  deleteDocument,
  getDocumentUrl,
  listCompanyMembers,
  listDocumentsAll,
  type PagedRows,
  setDocumentVisibility,
  uploadDocument,
} from "@e-logistic/api";
import { DOCUMENT_CATEGORIES, type ExpiryLevel, expiryStatus } from "@e-logistic/core";
import { cssPalette as palette } from "@e-logistic/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useRef, useState } from "react";
import { useConfirm } from "@/components/ConfirmProvider";
import * as f from "@/components/formStyles";
import { ListStatus } from "@/components/ListStatus";
import { useT } from "@/components/LocaleProvider";
import { ShowMore } from "@/components/ShowMore";
import { useToast } from "@/components/Toast";
import { Badge, Button, PageHeader, SetupNotice } from "@/components/ui";
import { csvDateStamp, downloadCsv } from "@/lib/csv";
import { getCachedMembership } from "@/lib/membership";
import { queryErrorMessage } from "@/lib/queryError";
import { queryKeys } from "@/lib/queryKeys";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { useFleet } from "@/lib/useFleet";
import { useRenderWindow } from "@/lib/useRenderWindow";

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
  const t = useT();
  const { vehicles, source } = useFleet();
  const confirm = useConfirm();
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("all");

  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  // #275: widoczność — zarząd / cała firma / wybrane osoby.
  const [visibility, setVisibility] = useState<"management" | "company" | "selected">("management");
  const [allowed, setAllowed] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  // #310 (fala 2): kartoteka dokumentów przez TanStack Query — wchodzi się tu przy
  // każdej kontroli terminów, a lista jest duża i praktycznie niezmienna między wejściami.
  const membership = useQuery({
    queryKey: queryKeys.membership(),
    queryFn: () => getCachedMembership(getBrowserSupabase()),
  });
  const companyId = membership.data?.companyId ?? null;
  const canManage = membership.data?.role === "owner" || membership.data?.role === "dispatcher";

  const docsQuery = useQuery({
    queryKey: queryKeys.documents(companyId),
    /*
     * STRONAMI: brak `limit` nie znaczył „cała kartoteka", tylko sufit `api.max_rows`
     * PostgREST (1000) egzekwowany bez błędu — a z tej listy czyta się TERMINY (kolumna
     * „ważne do" z `expiryStatus`) i z niej wychodzi eksport CSV. Obcięcie działa po
     * `created_at`, więc wypadały z niej skany wgrane dawno, z terminem daleko
     * w przyszłości: licencja wspólnotowa, świadectwo kierowcy, umowa leasingu.
     */
    // Bez firmy pusta kartoteka, a nie błąd — tak zachowywał się dawny `load()`.
    queryFn: (): Promise<PagedRows<DocumentMeta>> =>
      companyId
        ? listDocumentsAll(getBrowserSupabase(), companyId)
        : Promise.resolve({ rows: [], complete: true, pages: 0 }),
    enabled: !membership.isPending,
  });
  const docs = useMemo(() => docsQuery.data?.rows ?? [], [docsQuery.data]);
  /** Kartoteka nie dojechała w komplecie — terminy poniżej nie są pełną listą. */
  const incomplete = docsQuery.data?.complete === false;
  const loading = membership.isPending || docsQuery.isPending;
  const loadErr = queryErrorMessage(membership.error ?? docsQuery.error, t("documents.loadError"));

  // Lista członków zasila wyłącznie pole „kto widzi" w formularzu wgrywania, a ten
  // renderuje się tylko dla zarządu — stąd `canManage` w `enabled`: kierowca nie ma po co
  // wołać RPC, które i tak mu nic nie zwróci. Błąd tego zapytania świadomie NIE trafia
  // do `loadErr` — brak podpowiedzi osób nie może zasłonić kartoteki (przed migracją
  // dokładnie to samo robił `.catch(() => {})`).
  const membersQuery = useQuery({
    queryKey: queryKeys.companyMembers(companyId),
    queryFn: (): Promise<CompanyMember[]> => listCompanyMembers(getBrowserSupabase()),
    enabled: !membership.isPending && canManage,
  });
  const members = membersQuery.data ?? [];

  /** Odświeżenie kartoteki po wgraniu/usunięciu/zmianie widoczności. */
  const reloadDocs = useCallback(
    () => qc.invalidateQueries({ queryKey: queryKeys.documents(companyId) }),
    [qc, companyId],
  );
  /** „Ponów": błąd mógł pochodzić z odczytu członkostwa, więc ponawiamy oba zapytania. */
  const retry = () => {
    void membership.refetch();
    void docsQuery.refetch();
  };

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
  /** Okno renderowania — eksport i filtry biorą komplet, w DOM ląduje oglądana porcja. */
  const okno = useRenderWindow(filtered);

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
    if (!file) {
      toast(t("documents.pickFile"), "error");
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      toast(
        `${t("documents.fileTooBigPrefix")}${MAX_MB}${t("documents.fileTooBigSuffix")}`,
        "error",
      );
      return;
    }
    if (!companyId) {
      toast(t("documents.noCompany"), "error");
      return;
    }
    setBusy(true);
    try {
      await uploadDocument(getBrowserSupabase(), companyId, file, {
        name: name.trim() || file.name,
        vehicleId: vehicleId || undefined,
        category: category || undefined,
        expiryDate: expiryDate || undefined,
        visibility,
        allowedUserIds: visibility === "selected" ? allowed : [],
      });
      toast(t("documents.uploaded"), "success");
      resetForm();
      await reloadDocs();
    } catch (e) {
      toast(e instanceof Error ? e.message : t("documents.uploadError"), "error");
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
      toast(e instanceof Error ? e.message : t("documents.openError"), "error");
    }
  }

  // #audyt B6: „Pobierz" wymusza pobranie pliku (Content-Disposition przez &download=),
  // zamiast otwierać podgląd w nowej karcie jak klik w nazwę.
  async function downloadDoc(d: DocumentMeta) {
    try {
      const url = await getDocumentUrl(getBrowserSupabase(), d.path, 120);
      const dl = `${url}${url.includes("?") ? "&" : "?"}download=${encodeURIComponent(d.name)}`;
      const a = document.createElement("a");
      a.href = dl;
      a.download = d.name;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      toast(e instanceof Error ? e.message : t("documents.downloadError"), "error");
    }
  }

  async function remove(d: DocumentMeta) {
    if (
      !(await confirm(
        `${t("documents.deleteConfirmPrefix")}${d.name}${t("documents.deleteConfirmSuffix")}`,
      ))
    )
      return;
    try {
      await deleteDocument(getBrowserSupabase(), d);
      toast(t("documents.deleted"), "success");
      await reloadDocs();
    } catch (e) {
      toast(e instanceof Error ? e.message : t("documents.deleteError"), "error");
    }
  }

  return (
    <div style={{ maxWidth: 920 }}>
      <PageHeader title={t("documents.title")} subtitle={t("documents.subtitle")} />

      <SetupNotice source={source} />

      {canManage && (
        <div style={styles.form}>
          <div style={styles.grid}>
            <label style={styles.field}>
              <span style={f.label}>
                {t("documents.fieldFilePrefix")}
                {MAX_MB}
                {t("documents.fieldFileSuffix")}
              </span>
              <input
                ref={fileRef}
                style={f.input}
                type="file"
                onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <label style={styles.field}>
              <span style={f.label}>{t("documents.fieldName")}</span>
              <input
                style={f.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("documents.namePlaceholder")}
              />
            </label>
          </div>
          <div style={styles.grid}>
            <label style={styles.field}>
              <span style={f.label}>{t("documents.fieldCategory")}</span>
              <select
                style={f.input}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">{t("documents.optionNone")}</option>
                {DOCUMENT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label style={styles.field}>
              <span style={f.label}>{t("documents.fieldVisibility")}</span>
              <select
                style={f.input}
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as typeof visibility)}
              >
                <option value="management">{t("documents.visManagement")}</option>
                <option value="company">{t("documents.visCompany")}</option>
                <option value="selected">{t("documents.visSelected")}</option>
              </select>
            </label>
            {visibility === "selected" && (
              <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
                <span style={f.label}>{t("documents.whoSees")}</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {members.map((mm) => (
                    <label key={mm.user_id} style={{ fontSize: 13, display: "flex", gap: 4 }}>
                      <input
                        type="checkbox"
                        checked={allowed.includes(mm.user_id)}
                        onChange={(e) =>
                          setAllowed((a) =>
                            e.target.checked
                              ? [...a, mm.user_id]
                              : a.filter((x) => x !== mm.user_id),
                          )
                        }
                      />
                      {mm.email}
                    </label>
                  ))}
                </div>
              </div>
            )}
            <label style={styles.field}>
              <span style={f.label}>{t("documents.fieldVehicleOptional")}</span>
              <select
                style={f.input}
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
              >
                <option value="">{t("documents.optionNone")}</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registration}
                  </option>
                ))}
              </select>
            </label>
            <label style={styles.field}>
              <span style={f.label}>{t("documents.fieldExpiry")}</span>
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
              {busy ? t("documents.uploading") : t("documents.upload")}
            </Button>
            {file && (
              <span style={styles.dim}>
                {file.name} · {formatBytes(file.size)}
              </span>
            )}
          </div>
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
              {c === "all" ? t("common.all") : c}
            </button>
          ))}
          <span style={{ flex: 1 }} />
          <Button variant="ghost" onClick={exportCsv}>
            ⬇️ CSV
          </Button>
          <span style={{ color: palette.smoke, fontSize: 13, whiteSpace: "nowrap" }}>
            {filtered.length} {t("documents.countOf")} {docs.length}
          </span>
        </div>
      )}

      {/* Nad listą, bo dotyczy tego, czego na niej NIE MA — a brakujące dokumenty
          wyglądają dokładnie jak dokumenty, których nigdy nie wgrano. */}
      {!loading && !loadErr && incomplete && (
        <div style={styles.warn}>⚠️ {t("documents.incomplete")}</div>
      )}

      <ListStatus
        loading={loading}
        error={loadErr}
        empty={docs.length === 0}
        emptyText={t("documents.empty")}
        onRetry={retry}
      />
      {!loading && !loadErr && filtered.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          {okno.visible.map((d) => {
            const exp = d.expiry_date ? expiryStatus(d.expiry_date, today) : null;
            return (
              <div key={d.id} style={styles.card}>
                <div style={styles.cardHead}>
                  <button type="button" style={styles.docName} onClick={() => openDoc(d)}>
                    📄 {d.name}
                  </button>
                  {d.category && <Badge color={palette.smoke}>{d.category}</Badge>}
                  <select
                    style={{ ...f.input, width: "auto", padding: "4px 8px", fontSize: 12 }}
                    value={d.visibility}
                    title={t("documents.whoSeesTitle")}
                    onChange={async (e) => {
                      const next = e.target.value as DocumentMeta["visibility"];
                      // #audyt B5: „wybrane osoby" bez wskazanych osób ukryłoby dokument
                      // wszystkim (listę osób ustawia się przy wgrywaniu) — blokujemy zmianę.
                      if (next === "selected" && (d.allowed_user_ids?.length ?? 0) === 0) {
                        toast(t("documents.selectedVisibilityWarning"), "error");
                        await reloadDocs();
                        return;
                      }
                      try {
                        await setDocumentVisibility(
                          getBrowserSupabase(),
                          d.id,
                          next,
                          d.allowed_user_ids,
                        );
                        await reloadDocs();
                      } catch {
                        toast(t("documents.visibilityError"), "error");
                      }
                    }}
                  >
                    <option value="management">{t("documents.visManagementShort")}</option>
                    <option value="company">{t("documents.visCompanyShort")}</option>
                    <option value="selected">{t("documents.visSelectedShort")}</option>
                  </select>
                  {exp && (
                    <Badge color={EXPIRY_COLOR[exp.level]}>
                      {exp.level === "expired"
                        ? `${t("documents.expiredPrefix")}${-exp.daysLeft}${t("documents.daysParen")}`
                        : `${t("documents.validUntilPrefix")}${d.expiry_date} (${exp.daysLeft}${t("documents.daysParen")}`}
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
                  <span style={styles.dim}>
                    {t("documents.addedPrefix")}
                    {d.created_at.slice(0, 10)}
                  </span>
                  <Button variant="ghost" onClick={() => downloadDoc(d)}>
                    {t("documents.download")}
                  </Button>
                </div>
              </div>
            );
          })}
          <ShowMore hidden={okno.hidden} onShowMore={okno.showMore} />
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  /** Ta sama ramka ostrzeżenia co na pozostałych ekranach z niepełnym zbiorem. */
  warn: {
    border: `1px solid ${palette.warning}`,
    borderRadius: 10,
    padding: "10px 14px",
    marginTop: 12,
    color: palette.offWhite,
    fontSize: 13,
    lineHeight: 1.5,
    background: palette.nearBlack,
  },
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
