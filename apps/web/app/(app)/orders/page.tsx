"use client";

import {
  type Company,
  createInvoiceFromOrder,
  deleteOrder,
  getCompany,
  listOrders,
  type Order,
  saveOrder,
  setOrderStatus,
} from "@e-logistic/api";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUSES,
  type OrderStatus,
  orderSchema,
  round2,
  toCsv,
} from "@e-logistic/core";
import { palette } from "@e-logistic/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useConfirm } from "@/components/ConfirmProvider";
import { ListStatus } from "@/components/ListStatus";
import { Badge, Button, PageHeader, SetupNotice } from "@/components/ui";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { useFleet } from "@/lib/useFleet";

const STATUS_COLOR: Record<OrderStatus, string> = {
  new: palette.smoke,
  assigned: "#3b82f6",
  in_progress: "#f59e0b",
  delivered: "#22c55e",
  invoiced: "#a855f7",
  cancelled: palette.red,
};

function download(filename: string, text: string) {
  const blob = new Blob([`﻿${text}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function OrdersPage() {
  const { vehicles, source } = useFleet();
  const confirm = useConfirm();
  const [orders, setOrders] = useState<Order[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [cmrOrder, setCmrOrder] = useState<Order | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [referenceNo, setReferenceNo] = useState("");
  const [shipper, setShipper] = useState("");
  const [consignee, setConsignee] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [cargo, setCargo] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [vehicleId, setVehicleId] = useState("");
  const [loadDate, setLoadDate] = useState("");
  const [unloadDate, setUnloadDate] = useState("");
  const [notes, setNotes] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadErr(null);
    try {
      const sb = getBrowserSupabase();
      const m = await getCachedMembership(sb);
      if (!m) {
        setOrders([]);
        return;
      }
      setCanManage(m.role === "owner" || m.role === "dispatcher");
      const [ord, comp] = await Promise.all([
        listOrders(sb, m.companyId),
        getCompany(sb, m.companyId),
      ]);
      setOrders(ord);
      setCompany(comp);
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Nie udało się pobrać zleceń.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const regOf = (id: string | null) =>
    id ? (vehicles.find((v) => v.id === id)?.registration ?? "—") : "—";

  const filtered = useMemo(
    () => (filter === "all" ? orders : orders.filter((o) => o.status === filter)),
    [orders, filter],
  );

  // Podsumowanie (wartość liczona dla zleceń w EUR — mieszane waluty pomijane w sumie).
  const summary = useMemo(() => {
    const eur = (arr: Order[]) =>
      round2(arr.filter((o) => o.currency === "EUR").reduce((a, o) => a + (o.price ?? 0), 0));
    const delivered = filtered.filter((o) => o.status === "delivered");
    return {
      count: filtered.length,
      valueEur: eur(filtered),
      deliveredCount: delivered.length,
      deliveredValueEur: eur(delivered),
    };
  }, [filtered]);

  function resetForm() {
    setEditingId(null);
    setReferenceNo("");
    setShipper("");
    setConsignee("");
    setOrigin("");
    setDestination("");
    setCargo("");
    setWeightKg("");
    setPrice("");
    setCurrency("EUR");
    setVehicleId("");
    setLoadDate("");
    setUnloadDate("");
    setNotes("");
    setMsg(null);
  }

  function startEdit(o: Order) {
    setEditingId(o.id);
    setReferenceNo(o.reference_no ?? "");
    setShipper(o.shipper ?? "");
    setConsignee(o.consignee ?? "");
    setOrigin(o.origin ?? "");
    setDestination(o.destination ?? "");
    setCargo(o.cargo ?? "");
    setWeightKg(o.weight_kg != null ? String(o.weight_kg) : "");
    setPrice(o.price != null ? String(o.price) : "");
    setCurrency(o.currency);
    setVehicleId(o.vehicle_id ?? "");
    setLoadDate(o.load_date ?? "");
    setUnloadDate(o.unload_date ?? "");
    setNotes(o.notes ?? "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save() {
    setMsg(null);
    const parsed = orderSchema.safeParse({
      referenceNo: referenceNo.trim() || undefined,
      shipper: shipper.trim() || undefined,
      consignee: consignee.trim() || undefined,
      origin: origin.trim() || undefined,
      destination: destination.trim() || undefined,
      cargo: cargo.trim() || undefined,
      weightKg: weightKg ? Number(weightKg) : undefined,
      price: price ? Number(price) : undefined,
      currency: currency.trim() || "EUR",
      vehicleId: vehicleId || undefined,
      loadDate: loadDate || undefined,
      unloadDate: unloadDate || undefined,
      notes: notes.trim() || undefined,
    });
    if (!parsed.success) {
      setMsg("Sprawdź dane zlecenia.");
      return;
    }
    try {
      const sb = getBrowserSupabase();
      const m = await getCachedMembership(sb);
      if (!m) {
        setMsg("Brak firmy.");
        return;
      }
      await saveOrder(sb, m.companyId, parsed.data, editingId ?? undefined);
      setMsg(editingId ? "✅ Zlecenie zaktualizowane." : "✅ Zlecenie dodane.");
      resetForm();
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Błąd zapisu.");
    }
  }

  async function changeStatus(id: string, s: OrderStatus) {
    try {
      await setOrderStatus(getBrowserSupabase(), id, s);
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Błąd zmiany statusu.");
    }
  }

  async function invoice(o: Order) {
    if (
      !(await confirm(
        `Wystawić fakturę za zlecenie ${o.reference_no || "(bez numeru)"} (VAT 23%)?`,
      ))
    )
      return;
    try {
      const r = await createInvoiceFromOrder(getBrowserSupabase(), o.id, 23);
      setMsg(`✅ Faktura ${r.number} (brutto ${r.gross} ${o.currency}) — patrz zakładka Faktury.`);
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Błąd wystawiania faktury.");
    }
  }

  async function remove(id: string) {
    if (!(await confirm("Usunąć zlecenie?"))) return;
    try {
      await deleteOrder(getBrowserSupabase(), id);
      if (editingId === id) resetForm();
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Błąd usuwania.");
    }
  }

  function exportCsv() {
    const headers = [
      "Nr",
      "Status",
      "Nadawca",
      "Odbiorca",
      "Skąd",
      "Dokąd",
      "Ładunek",
      "Waga (kg)",
      "Stawka",
      "Waluta",
      "Pojazd",
      "Załadunek",
      "Rozładunek",
    ];
    const rows = filtered.map((o) => [
      o.reference_no ?? "",
      ORDER_STATUS_LABELS[o.status],
      o.shipper ?? "",
      o.consignee ?? "",
      o.origin ?? "",
      o.destination ?? "",
      o.cargo ?? "",
      o.weight_kg ?? "",
      o.price ?? "",
      o.currency,
      regOf(o.vehicle_id),
      o.load_date ?? "",
      o.unload_date ?? "",
    ]);
    download(`zlecenia_${new Date().toISOString().slice(0, 10)}.csv`, toCsv(headers, rows));
  }

  if (cmrOrder) {
    return (
      <CmrDoc
        order={cmrOrder}
        company={company}
        vehicleReg={regOf(cmrOrder.vehicle_id)}
        onBack={() => setCmrOrder(null)}
      />
    );
  }

  return (
    <div style={{ maxWidth: 920 }}>
      <PageHeader
        title="Zlecenia / ładunki"
        subtitle="Zlecenia transportowe: trasa, ładunek, stawka i status (Nowe → W trakcie → Dostarczone → Zafakturowane)."
      />

      <SetupNotice source={source} noVehicles="Dodaj pojazd, aby przypisywać zlecenia." />

      {canManage && (
        <div style={styles.form}>
          {editingId && (
            <div style={{ color: palette.red, fontWeight: 700 }}>✏️ Edycja zlecenia</div>
          )}
          <div style={styles.grid}>
            <Field
              label="Nr referencyjny"
              v={referenceNo}
              set={setReferenceNo}
              ph="np. ZL/2026/123"
            />
            <Field label="Ładunek" v={cargo} set={setCargo} ph="np. palety EUR ×33" />
          </div>
          <div style={styles.grid}>
            <Field label="Nadawca" v={shipper} set={setShipper} />
            <Field label="Odbiorca" v={consignee} set={setConsignee} />
          </div>
          <div style={styles.grid}>
            <Field label="Załadunek (skąd)" v={origin} set={setOrigin} />
            <Field label="Rozładunek (dokąd)" v={destination} set={setDestination} />
          </div>
          <div style={styles.grid}>
            <label style={styles.field}>
              <span style={styles.label}>Data załadunku</span>
              <input
                style={styles.input}
                type="date"
                value={loadDate}
                onChange={(e) => setLoadDate(e.target.value)}
              />
            </label>
            <label style={styles.field}>
              <span style={styles.label}>Data rozładunku</span>
              <input
                style={styles.input}
                type="date"
                value={unloadDate}
                onChange={(e) => setUnloadDate(e.target.value)}
              />
            </label>
          </div>
          <div style={styles.grid}>
            <label style={styles.field}>
              <span style={styles.label}>Waga (kg)</span>
              <input
                style={styles.input}
                type="number"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
              />
            </label>
            <label style={styles.field}>
              <span style={styles.label}>Stawka</span>
              <input
                style={styles.input}
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </label>
            <label style={{ ...styles.field, maxWidth: 90 }}>
              <span style={styles.label}>Waluta</span>
              <input
                style={styles.input}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              />
            </label>
            <label style={styles.field}>
              <span style={styles.label}>Pojazd</span>
              <select
                style={styles.input}
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
          </div>
          <label style={styles.field}>
            <span style={styles.label}>Notatki</span>
            <textarea
              style={{ ...styles.input, minHeight: 50 }}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <div style={{ display: "flex", gap: 10 }}>
            <Button onClick={save}>{editingId ? "Zapisz" : "Dodaj zlecenie"}</Button>
            {editingId && (
              <Button variant="ghost" onClick={resetForm}>
                Anuluj
              </Button>
            )}
          </div>
          {msg && <p style={{ color: palette.smoke, fontSize: 14 }}>{msg}</p>}
        </div>
      )}

      {orders.length > 0 && (
        <div style={styles.summary}>
          <span>
            📦 Zleceń: <strong>{summary.count}</strong>
          </span>
          <span>
            💶 Wartość (EUR): <strong style={{ color: palette.red }}>{summary.valueEur}</strong>
          </span>
          <span>
            📤 Do zafakturowania: <strong>{summary.deliveredCount}</strong> (
            {summary.deliveredValueEur} EUR)
          </span>
        </div>
      )}

      <div style={styles.filters}>
        {(["all", ...ORDER_STATUSES] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            style={filter === s ? styles.chipActive : styles.chip}
          >
            {s === "all" ? "Wszystkie" : ORDER_STATUS_LABELS[s]}
          </button>
        ))}
        <span style={{ flex: 1 }} />
        <Button variant="ghost" onClick={exportCsv}>
          ⬇️ CSV
        </Button>
        <span style={{ color: palette.smoke, fontSize: 13, whiteSpace: "nowrap" }}>
          {filtered.length} z {orders.length}
        </span>
      </div>

      <ListStatus
        loading={loading}
        error={loadErr}
        empty={orders.length === 0}
        emptyText="Brak zleceń."
        onRetry={load}
      />
      {!loading && !loadErr && filtered.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          {filtered.map((o) => (
            <div key={o.id} style={styles.card}>
              <div style={styles.cardHead}>
                <strong>{o.reference_no || "(bez numeru)"}</strong>
                <Badge color={STATUS_COLOR[o.status]}>{ORDER_STATUS_LABELS[o.status]}</Badge>
                <span style={{ flex: 1 }} />
                {o.price != null && (
                  <strong style={{ color: palette.red }}>
                    {o.price} {o.currency}
                  </strong>
                )}
              </div>
              <div style={styles.cardBody}>
                {(o.origin || o.destination) && (
                  <span>
                    📍 {o.origin || "?"} → {o.destination || "?"}
                  </span>
                )}
                {o.cargo && <span style={styles.dim}>📦 {o.cargo}</span>}
                {o.weight_kg != null && <span style={styles.dim}>{o.weight_kg} kg</span>}
                {o.vehicle_id && <span style={styles.dim}>🚚 {regOf(o.vehicle_id)}</span>}
                {o.load_date && <span style={styles.dim}>zał. {o.load_date}</span>}
              </div>
              <div style={styles.cardActions}>
                <Button variant="ghost" onClick={() => setCmrOrder(o)}>
                  📄 CMR
                </Button>
              </div>
              {canManage && (
                <div style={styles.cardActions}>
                  {o.status === "delivered" && (
                    <Button variant="ghost" onClick={() => invoice(o)}>
                      🧾 Faktura
                    </Button>
                  )}
                  <select
                    style={styles.statusSel}
                    value={o.status}
                    onChange={(e) => changeStatus(o.id, e.target.value as OrderStatus)}
                  >
                    {ORDER_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {ORDER_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                  <Button variant="ghost" onClick={() => startEdit(o)}>
                    ✏️
                  </Button>
                  <Button variant="danger" onClick={() => remove(o.id)}>
                    🗑️
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  v,
  set,
  ph,
}: {
  label: string;
  v: string;
  set: (s: string) => void;
  ph?: string;
}) {
  return (
    <label style={styles.field}>
      <span style={styles.label}>{label}</span>
      <input
        style={styles.input}
        value={v}
        onChange={(e) => set(e.target.value)}
        placeholder={ph}
      />
    </label>
  );
}

/** Drukowalny międzynarodowy list przewozowy CMR (uproszczony) ze zlecenia. */
function CmrDoc({
  order,
  company,
  vehicleReg,
  onBack,
}: {
  order: Order;
  company: Company | null;
  vehicleReg: string;
  onBack: () => void;
}) {
  const carrier = [
    company?.name,
    company?.address,
    company?.tax_id ? `NIP ${company.tax_id}` : null,
  ]
    .filter(Boolean)
    .join(", ");
  return (
    <div style={{ maxWidth: 820 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }} className="no-print">
        <Button variant="ghost" onClick={onBack}>
          ← Zlecenia
        </Button>
        <span style={{ flex: 1 }} />
        <Button onClick={() => window.print()}>🖨️ Drukuj / PDF</Button>
      </div>

      <div style={cmr.doc}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>LIST PRZEWOZOWY CMR</div>
            <div style={cmr.muted}>Międzynarodowy samochodowy list przewozowy (uproszczony)</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 800, color: palette.red }}>E-Logistic</div>
            {order.reference_no && <div style={cmr.muted}>Zlecenie: {order.reference_no}</div>}
          </div>
        </div>

        <div style={cmr.grid}>
          <Box n={1} title="Nadawca">
            <strong>{order.shipper || "—"}</strong>
            {order.origin && <div style={cmr.muted}>{order.origin}</div>}
          </Box>
          <Box n={2} title="Odbiorca">
            <strong>{order.consignee || "—"}</strong>
            {order.destination && <div style={cmr.muted}>{order.destination}</div>}
          </Box>
          <Box n={3} title="Miejsce przeznaczenia (rozładunek)">
            {order.destination || "—"}
            {order.unload_date && <div style={cmr.muted}>Data: {order.unload_date}</div>}
          </Box>
          <Box n={4} title="Miejsce i data załadowania">
            {order.origin || "—"}
            {order.load_date && <div style={cmr.muted}>Data: {order.load_date}</div>}
          </Box>
        </div>

        <Box n="6–9" title="Rodzaj towaru / opakowanie / ilość">
          {order.cargo || "—"}
        </Box>

        <div style={cmr.grid}>
          <Box n={11} title="Waga brutto (kg)">
            {order.weight_kg != null ? `${order.weight_kg} kg` : "—"}
          </Box>
          <Box n={16} title="Przewoźnik">
            {carrier || "—"}
            {company?.country && <div style={cmr.muted}>{company.country}</div>}
          </Box>
          <Box n={25} title="Nr rejestracyjny pojazdu">
            {vehicleReg}
          </Box>
        </div>

        {order.notes && (
          <Box n={13} title="Zlecenia / uwagi nadawcy">
            {order.notes}
          </Box>
        )}

        <div style={cmr.signs}>
          {["22 · Podpis nadawcy", "23 · Podpis przewoźnika", "24 · Podpis odbiorcy"].map((s) => (
            <div key={s} style={cmr.sign}>
              <div style={cmr.signLine} />
              <div style={cmr.muted}>{s}</div>
            </div>
          ))}
        </div>

        <p style={cmr.muted}>
          Dokument uproszczony wygenerowany w E-Logistic na podstawie zlecenia. Nie zastępuje
          urzędowego formularza CMR — pełną zgodność (konwencja CMR) potwierdza przewoźnik.
        </p>
      </div>

      <style>{`@media print { .no-print { display: none !important; } .app-sidebar { display: none !important; } }`}</style>
    </div>
  );
}

function Box({
  n,
  title,
  children,
}: {
  n: number | string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={cmr.box}>
      <div style={cmr.boxHead}>
        <span style={cmr.boxNum}>{n}</span> {title}
      </div>
      <div style={{ fontSize: 14 }}>{children}</div>
    </div>
  );
}

const cmr: Record<string, React.CSSProperties> = {
  doc: {
    marginTop: 16,
    background: palette.white,
    color: "#111",
    borderRadius: 12,
    padding: 28,
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  muted: { color: "#555", fontSize: 12 },
  grid: { display: "flex", gap: 12, flexWrap: "wrap" },
  box: {
    flex: 1,
    minWidth: 220,
    border: "1px solid #bbb",
    borderRadius: 6,
    padding: "8px 10px",
  },
  boxHead: { fontSize: 11, textTransform: "uppercase", color: "#888", marginBottom: 4 },
  boxNum: {
    display: "inline-block",
    minWidth: 18,
    fontWeight: 800,
    color: palette.red,
  },
  signs: { display: "flex", gap: 16, marginTop: 8 },
  sign: { flex: 1, textAlign: "center" },
  signLine: { borderBottom: "1px solid #999", height: 40 },
};

const styles: Record<string, React.CSSProperties> = {
  form: { display: "flex", flexDirection: "column", gap: 12, marginTop: 16, maxWidth: 720 },
  grid: { display: "flex", gap: 12, flexWrap: "wrap" },
  field: { display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 160 },
  label: { fontSize: 12, color: palette.smoke },
  input: {
    background: palette.black,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
    padding: "10px 12px",
    color: palette.offWhite,
    width: "100%",
  },
  summary: {
    display: "flex",
    gap: 20,
    flexWrap: "wrap",
    marginTop: 24,
    padding: "12px 16px",
    borderRadius: 12,
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    fontSize: 14,
  },
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
  cardHead: { display: "flex", gap: 10, alignItems: "center" },
  cardBody: { display: "flex", gap: 14, flexWrap: "wrap", fontSize: 14 },
  cardActions: { display: "flex", gap: 8, alignItems: "center" },
  statusSel: {
    background: palette.black,
    color: palette.offWhite,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
    padding: "6px 10px",
    fontSize: 13,
  },
  dim: { color: palette.smoke, fontSize: 13 },
};
