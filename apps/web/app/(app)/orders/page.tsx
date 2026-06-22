"use client";

import {
  type Company,
  type CompanyMember,
  createInvoiceFromOrder,
  deleteOrder,
  getCompany,
  listCompanyMembers,
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
} from "@e-logistic/core";
import { palette } from "@e-logistic/ui";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CmrDoc } from "@/components/CmrDoc";
import { useConfirm } from "@/components/ConfirmProvider";
import { ListStatus } from "@/components/ListStatus";
import { Badge, Button, PageHeader, SetupNotice } from "@/components/ui";
import { csvDateStamp, downloadCsv } from "@/lib/csv";
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

export default function OrdersPage() {
  const { vehicles, source } = useFleet();
  const confirm = useConfirm();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [members, setMembers] = useState<CompanyMember[]>([]);
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
  const [assignedTo, setAssignedTo] = useState("");
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
      const manage = m.role === "owner" || m.role === "dispatcher";
      setCanManage(manage);
      const [ord, comp, mem] = await Promise.all([
        listOrders(sb, m.companyId),
        getCompany(sb, m.companyId),
        manage ? listCompanyMembers(sb) : Promise.resolve([]),
      ]);
      setOrders(ord);
      setCompany(comp);
      setMembers(mem);
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

  // Kandydaci do przypisania: aktywni kierowcy firmy (kierowca = rola driver).
  const drivers = useMemo(
    () => members.filter((mb) => mb.status === "active" && mb.role === "driver"),
    [members],
  );
  const emailOf = (uid: string | null) =>
    uid ? (members.find((mb) => mb.user_id === uid)?.email ?? "—") : null;

  function showOnMap(o: Order) {
    const p = new URLSearchParams();
    if (o.origin) p.set("from", o.origin);
    if (o.destination) p.set("to", o.destination);
    router.push(`/map?${p.toString()}`);
  }

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
    setAssignedTo("");
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
    setAssignedTo(o.assigned_to ?? "");
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
      assignedTo: assignedTo || undefined,
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
      // Czy przypisanie kierowcy faktycznie się zmieniło (do natychmiastowego push).
      const prevAssigned = editingId
        ? (orders.find((o) => o.id === editingId)?.assigned_to ?? "")
        : "";
      const id = await saveOrder(sb, m.companyId, parsed.data, editingId ?? undefined);
      if (assignedTo && assignedTo !== prevAssigned) {
        // Natychmiastowy push do kierowcy (best-effort — powiadomienie w aplikacji powstaje przez trigger).
        void fetch("/api/orders/notify-assignment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: id }),
        }).catch(() => {});
      }
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
        `Wystawić fakturę za zlecenie ${o.reference_no || "(bez numeru)"} (VAT wg ustawień firmy)?`,
      ))
    )
      return;
    try {
      const r = await createInvoiceFromOrder(getBrowserSupabase(), o.id);
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
    downloadCsv(`zlecenia_${csvDateStamp()}.csv`, headers, rows);
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
            <label style={styles.field}>
              <span style={styles.label}>Kierowca</span>
              <select
                style={styles.input}
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
              >
                <option value="">— nieprzypisane —</option>
                {drivers.map((d) => (
                  <option key={d.user_id} value={d.user_id}>
                    {d.email}
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
                {o.assigned_to && <span style={styles.dim}>👤 {emailOf(o.assigned_to)}</span>}
                {o.load_date && <span style={styles.dim}>zał. {o.load_date}</span>}
              </div>
              <div style={styles.cardActions}>
                <Button variant="ghost" onClick={() => setCmrOrder(o)}>
                  📄 CMR
                </Button>
                {(o.origin || o.destination) && (
                  <Button variant="ghost" onClick={() => showOnMap(o)}>
                    🗺️ Mapa
                  </Button>
                )}
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
