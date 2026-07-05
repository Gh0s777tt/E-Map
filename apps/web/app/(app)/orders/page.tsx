"use client";

import {
  type Company,
  type CompanyMember,
  type Contractor,
  createInvoiceFromOrder,
  deleteOrder,
  getCompany,
  listCompanyMembers,
  listContractors,
  listOrders,
  type Order,
  saveOrder,
  setOrderStatus,
  upsertContractor,
} from "@e-logistic/api";
import {
  FREIGHT_EXPORT_HEADERS,
  filterSortOrders,
  firstZodError,
  freightExportRows,
  freightRowCells,
  ORDER_STATUSES,
  type OrderInput,
  type OrderSort,
  type OrderStatus,
  type OrderTransportCost,
  orderSchema,
  orderTransportCosts,
  round2,
} from "@e-logistic/core";
import { cssPalette as palette } from "@e-logistic/ui";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CargoPhotos } from "@/components/CargoPhotos";
import { CmrDoc } from "@/components/CmrDoc";
import { useConfirm } from "@/components/ConfirmProvider";
import { DataImport, type ImportColumn } from "@/components/DataImport";
import * as f from "@/components/formStyles";
import { ListStatus } from "@/components/ListStatus";
import { useT } from "@/components/LocaleProvider";
import { PodDoc } from "@/components/PodDoc";
import { useToast } from "@/components/Toast";
import { Badge, Button, PageHeader, SetupNotice } from "@/components/ui";
import { csvDateStamp, downloadCsv } from "@/lib/csv";
import { orderStatusLabel } from "@/lib/labels";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { useFleet } from "@/lib/useFleet";
import { downloadXlsx } from "@/lib/xlsx";

const STATUS_COLOR: Record<OrderStatus, string> = {
  new: palette.smoke,
  assigned: "#3b82f6",
  in_progress: "#f59e0b",
  delivered: "#22c55e",
  invoiced: "#a855f7",
  cancelled: palette.red,
};

type OrderImportRow = { input: OrderInput; registration: string };

// #246: surowe wiersze do wyliczenia kosztu transportu. `order_id` opcjonalne —
// kolumna dochodzi migracją 0052 (typy DB dogonią po gen:types), więc cast jest bezpieczny.
type LegRow = {
  order_id?: string | null;
  action: string;
  vehicle_id: string | null;
  odometer_km: number | null;
  created_at: string;
};
type FuelRow = {
  vehicle_id: string | null;
  odometer_km: number;
  liters: number;
  price_total: number | null;
};

/** Kolumny importu zleceń (kolumna „Pojazd" = rejestracja, mapowana na pojazd w handlerze). */
const IMPORT_COLUMNS: ImportColumn[] = [
  { key: "referenceNo", label: "Numer", aliases: ["nr", "reference", "ref", "numer zlecenia"] },
  { key: "shipper", label: "Nadawca", aliases: ["shipper", "zaladowca"] },
  { key: "consignee", label: "Odbiorca", aliases: ["consignee"] },
  { key: "origin", label: "Skąd", aliases: ["skad", "origin", "from", "zaladunek"] },
  { key: "destination", label: "Dokąd", aliases: ["dokad", "destination", "to", "rozladunek"] },
  { key: "cargo", label: "Ładunek", aliases: ["ladunek", "cargo", "towar"] },
  { key: "weightKg", label: "Waga kg", aliases: ["waga", "weight"] },
  { key: "price", label: "Stawka", aliases: ["stawka", "cena", "price", "rate", "fracht"] },
  { key: "currency", label: "Waluta", aliases: ["currency"] },
  { key: "vehicle", label: "Pojazd", aliases: ["rejestracja", "vehicle", "registration"] },
  { key: "loadDate", label: "Załadunek", aliases: ["data zaladunku", "load date"] },
  { key: "unloadDate", label: "Rozładunek", aliases: ["data rozladunku", "unload date"] },
  { key: "notes", label: "Uwagi", aliases: ["komentarz", "notes", "notatki"] },
];

function orderNum(s: string | undefined): number | undefined {
  const raw = (s ?? "").trim().replace(/\s/g, "").replace(",", ".");
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function validateOrderRow(
  rec: Record<string, string>,
): { ok: true; value: OrderImportRow } | { ok: false; error: string } {
  const candidate = {
    referenceNo: (rec.referenceNo ?? "").trim() || undefined,
    shipper: (rec.shipper ?? "").trim() || undefined,
    consignee: (rec.consignee ?? "").trim() || undefined,
    origin: (rec.origin ?? "").trim() || undefined,
    destination: (rec.destination ?? "").trim() || undefined,
    cargo: (rec.cargo ?? "").trim() || undefined,
    weightKg: orderNum(rec.weightKg),
    price: orderNum(rec.price),
    currency: (rec.currency ?? "").trim() || undefined,
    loadDate: (rec.loadDate ?? "").trim() || undefined,
    unloadDate: (rec.unloadDate ?? "").trim() || undefined,
    notes: (rec.notes ?? "").trim() || undefined,
  };
  const hasContent = [
    candidate.referenceNo,
    candidate.shipper,
    candidate.consignee,
    candidate.origin,
    candidate.destination,
    candidate.cargo,
  ].some(Boolean);
  if (!hasContent) return { ok: false, error: "pusty wiersz (brak numeru/trasy/ładunku)" };
  const parsed = orderSchema.safeParse(candidate);
  if (!parsed.success) return { ok: false, error: firstZodError(parsed.error) };
  return { ok: true, value: { input: parsed.data, registration: (rec.vehicle ?? "").trim() } };
}

export default function OrdersPage() {
  const t = useT();
  const { vehicles, source } = useFleet();
  const confirm = useConfirm();
  const toast = useToast();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  // #246: surowe dane do kosztu transportu per zlecenie (trasy z order_id + tankowania).
  const [legRows, setLegRows] = useState<LegRow[]>([]);
  const [fuelRows, setFuelRows] = useState<FuelRow[]>([]);
  const [adblueRows, setAdblueRows] = useState<FuelRow[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [cmrOrder, setCmrOrder] = useState<Order | null>(null);
  const [podOrder, setPodOrder] = useState<Order | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<OrderSort>("date_desc");

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
      const [ord, comp, mem, contr, legs, fuel, adblue] = await Promise.all([
        listOrders(sb, m.companyId),
        getCompany(sb, m.companyId),
        manage ? listCompanyMembers(sb) : Promise.resolve([]),
        manage ? listContractors(sb, m.companyId) : Promise.resolve([]),
        // Koszt transportu (#246, slim #266): tylko trasy POWIĄZANE ze zleceniem
        // (ułamek tabeli) i 4 kolumny tankowań — zamiast 3×5000 pełnych wierszy.
        sb
          .from("trip_events")
          .select("order_id, action, vehicle_id, odometer_km, created_at")
          .not("order_id", "is", null)
          .limit(5000)
          .then((r) => r.data ?? []),
        sb
          .from("fuel_logs")
          .select("vehicle_id, odometer_km, liters, price_total")
          .order("created_at", { ascending: false })
          .limit(2000)
          .then((r) => r.data ?? []),
        sb
          .from("adblue_logs")
          .select("vehicle_id, odometer_km, liters, price_total")
          .order("created_at", { ascending: false })
          .limit(2000)
          .then((r) => r.data ?? []),
      ]);
      setOrders(ord);
      setCompany(comp);
      setMembers(mem);
      setContractors(contr);
      setLegRows(legs as LegRow[]);
      setFuelRows(fuel as FuelRow[]);
      setAdblueRows(adblue as FuelRow[]);
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
    () => filterSortOrders(orders, { text: query, status: filter, sort }),
    [orders, filter, query, sort],
  );

  // #246: koszt transportu per zlecenie — dystans z liczników load→unload × koszt/km pojazdu.
  const costByOrder = useMemo(() => {
    const events = legRows
      .filter((r) => r.order_id)
      .map((r) => ({
        orderId: r.order_id ?? null,
        action: r.action,
        vehicleId: r.vehicle_id,
        odometerKm: r.odometer_km,
        createdAt: r.created_at,
      }));
    const toFuel = (r: FuelRow) => ({
      vehicleId: r.vehicle_id,
      odometerKm: r.odometer_km,
      liters: r.liters,
      priceTotal: r.price_total,
    });
    const list = orderTransportCosts({
      orders: orders.map((o) => ({ id: o.id, price: o.price, currency: o.currency })),
      events,
      fuel: fuelRows.map(toFuel),
      adblue: adblueRows.map(toFuel),
    });
    return new Map<string, OrderTransportCost>(list.map((c) => [c.orderId, c]));
  }, [orders, legRows, fuelRows, adblueRows]);

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
      toast("Sprawdź dane zlecenia.", "error");
      return;
    }
    try {
      const sb = getBrowserSupabase();
      const m = await getCachedMembership(sb);
      if (!m) {
        toast("Brak firmy.", "error");
        return;
      }
      // Czy przypisanie kierowcy faktycznie się zmieniło (do natychmiastowego push).
      const prevAssigned = editingId
        ? (orders.find((o) => o.id === editingId)?.assigned_to ?? "")
        : "";
      const id = await saveOrder(sb, m.companyId, parsed.data, editingId ?? undefined);
      // Organicznie buduj rejestr kontrahentów z nadawcy/odbiorcy (best-effort).
      await Promise.all(
        [shipper.trim(), consignee.trim()]
          .filter((n) => n && !contractors.some((c) => c.name === n))
          .map((name) => upsertContractor(sb, m.companyId, { name }).catch(() => {})),
      );
      if (assignedTo && assignedTo !== prevAssigned) {
        // Natychmiastowy push do kierowcy (best-effort — powiadomienie w aplikacji powstaje przez trigger).
        void fetch("/api/orders/notify-assignment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: id }),
        }).catch(() => {});
      }
      toast(editingId ? "Zlecenie zaktualizowane." : "Zlecenie dodane.", "success");
      resetForm();
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Błąd zapisu.", "error");
    }
  }

  async function changeStatus(id: string, s: OrderStatus) {
    // Optymistycznie: zmień status lokalnie od razu; przy błędzie cofnij (bez pełnego reloadu).
    const prev = orders.find((o) => o.id === id)?.status;
    setOrders((list) => list.map((o) => (o.id === id ? { ...o, status: s } : o)));
    try {
      await setOrderStatus(getBrowserSupabase(), id, s);
      toast("Status zaktualizowany.", "success");
    } catch (e) {
      if (prev) setOrders((list) => list.map((o) => (o.id === id ? { ...o, status: prev } : o)));
      toast(e instanceof Error ? e.message : "Błąd zmiany statusu.", "error");
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
      toast(
        `Faktura ${r.number} (brutto ${r.gross} ${o.currency}) — patrz zakładka Faktury.`,
        "success",
      );
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Błąd wystawiania faktury.", "error");
    }
  }

  async function remove(id: string) {
    if (!(await confirm("Usunąć zlecenie?"))) return;
    try {
      await deleteOrder(getBrowserSupabase(), id);
      if (editingId === id) resetForm();
      toast("Zlecenie usunięte.", "success");
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Błąd usuwania.", "error");
    }
  }

  function exportCsv() {
    const headers = [
      t("orders.csv.number"),
      t("common.status"),
      t("orders.csv.shipper"),
      t("orders.csv.consignee"),
      t("orders.csv.from"),
      t("orders.csv.to"),
      t("orders.csv.cargo"),
      t("orders.csv.weight"),
      t("orders.csv.rate"),
      t("orders.csv.currency"),
      t("common.vehicle"),
      t("orders.csv.loadDate"),
      t("orders.csv.unloadDate"),
    ];
    const rows = filtered.map((o) => [
      o.reference_no ?? "",
      orderStatusLabel(t, o.status),
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

  async function exportXlsx() {
    const headers = [
      t("orders.csv.number"),
      t("common.status"),
      t("orders.csv.shipper"),
      t("orders.csv.consignee"),
      t("orders.csv.from"),
      t("orders.csv.to"),
      t("orders.csv.cargo"),
      t("orders.csv.weight"),
      t("orders.csv.rate"),
      t("orders.csv.currency"),
      t("common.vehicle"),
      t("orders.csv.loadDate"),
      t("orders.csv.unloadDate"),
    ];
    const rows = filtered.map((o) => [
      o.reference_no ?? "",
      orderStatusLabel(t, o.status),
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
    await downloadXlsx(`zlecenia_${csvDateStamp()}.xlsx`, headers, rows);
  }

  const importOrders = useCallback(
    async (rows: OrderImportRow[]) => {
      const sb = getBrowserSupabase();
      const m = await getCachedMembership(sb);
      if (!m) {
        return {
          inserted: 0,
          failed: rows.length,
          errors: ["Brak firmy — utwórz ją na Pulpicie."],
        };
      }
      const regMap = new Map(vehicles.map((v) => [v.registration.toUpperCase(), v.id]));
      const existingRefs = new Set(
        (await listOrders(sb, m.companyId))
          .map((o) => (o.reference_no ?? "").trim().toUpperCase())
          .filter(Boolean),
      );
      let inserted = 0;
      let failed = 0;
      const errors: string[] = [];
      for (const { input, registration } of rows) {
        const ref = (input.referenceNo ?? "").trim().toUpperCase();
        if (ref && existingRefs.has(ref)) {
          failed++;
          if (errors.length < 8)
            errors.push(`${input.referenceNo}: zlecenie już istnieje (pominięto)`);
          continue;
        }
        const vehicleId = registration ? regMap.get(registration.toUpperCase()) : undefined;
        if (registration && !vehicleId && errors.length < 8) {
          errors.push(
            `${input.referenceNo || "zlecenie"}: pojazd „${registration}" nierozpoznany (zapis bez pojazdu)`,
          );
        }
        try {
          await saveOrder(sb, m.companyId, { ...input, vehicleId });
          if (ref) existingRefs.add(ref);
          inserted++;
        } catch (e) {
          failed++;
          if (errors.length < 8) {
            errors.push(
              `${input.referenceNo || "zlecenie"}: ${e instanceof Error ? e.message : "błąd"}`,
            );
          }
        }
      }
      return { inserted, failed, errors };
    },
    [vehicles],
  );

  /** Eksport zleceń do publikacji na giełdzie transportowej (uniwersalny CSV frachtu). */
  function exportFreight() {
    const rows = freightExportRows(
      filtered.map((o) => ({
        referenceNo: o.reference_no,
        origin: o.origin,
        destination: o.destination,
        loadDate: o.load_date,
        unloadDate: o.unload_date,
        cargo: o.cargo,
        weightKg: o.weight_kg,
        price: o.price,
        currency: o.currency,
        notes: o.notes,
      })),
    ).map(freightRowCells);
    downloadCsv(`gielda_${csvDateStamp()}.csv`, [...FREIGHT_EXPORT_HEADERS], rows);
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

  if (podOrder) {
    return (
      <PodDoc
        order={podOrder}
        company={company}
        vehicleReg={regOf(podOrder.vehicle_id)}
        onBack={() => setPodOrder(null)}
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
            <Field label="Nadawca" v={shipper} set={setShipper} list="contractors-dl" />
            <Field label="Odbiorca" v={consignee} set={setConsignee} list="contractors-dl" />
          </div>
          <datalist id="contractors-dl">
            {contractors.map((c) => (
              <option key={c.id} value={c.name} />
            ))}
          </datalist>
          <div style={styles.grid}>
            <Field label="Załadunek (skąd)" v={origin} set={setOrigin} />
            <Field label="Rozładunek (dokąd)" v={destination} set={setDestination} />
          </div>
          <div style={styles.grid}>
            <label style={styles.field}>
              <span style={f.label}>Data załadunku</span>
              <input
                style={f.input}
                type="date"
                value={loadDate}
                onChange={(e) => setLoadDate(e.target.value)}
              />
            </label>
            <label style={styles.field}>
              <span style={f.label}>Data rozładunku</span>
              <input
                style={f.input}
                type="date"
                value={unloadDate}
                onChange={(e) => setUnloadDate(e.target.value)}
              />
            </label>
          </div>
          <div style={styles.grid}>
            <label style={styles.field}>
              <span style={f.label}>Waga (kg)</span>
              <input
                style={f.input}
                type="number"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
              />
            </label>
            <label style={styles.field}>
              <span style={f.label}>Stawka</span>
              <input
                style={f.input}
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </label>
            <label style={{ ...styles.field, maxWidth: 90 }}>
              <span style={f.label}>Waluta</span>
              <input
                style={f.input}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              />
            </label>
            <label style={styles.field}>
              <span style={f.label}>Pojazd</span>
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
              <span style={f.label}>Kierowca</span>
              <select
                style={f.input}
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
            <span style={f.label}>Notatki</span>
            <textarea
              style={{ ...f.input, minHeight: 50 }}
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

      <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
        <input
          style={styles.search}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="🔎 Szukaj: nadawca, odbiorca, trasa, nr…"
        />
        <select
          style={styles.sortSel}
          value={sort}
          onChange={(e) => setSort(e.target.value as OrderSort)}
          aria-label="Sortowanie"
        >
          <option value="date_desc">Data ↓ (najnowsze)</option>
          <option value="date_asc">Data ↑ (najstarsze)</option>
          <option value="price_desc">Stawka ↓</option>
          <option value="price_asc">Stawka ↑</option>
        </select>
      </div>

      <div style={styles.filters}>
        {(["all", ...ORDER_STATUSES] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            style={filter === s ? styles.chipActive : styles.chip}
          >
            {s === "all" ? t("common.all") : orderStatusLabel(t, s)}
          </button>
        ))}
        <span style={{ flex: 1 }} />
        <Button variant="ghost" onClick={exportFreight}>
          📤 Giełda (CSV)
        </Button>
        <Button variant="ghost" onClick={exportCsv}>
          ⬇️ CSV
        </Button>
        <Button variant="ghost" onClick={exportXlsx}>
          ⬇️ XLSX
        </Button>
        <span style={{ color: palette.smoke, fontSize: 13, whiteSpace: "nowrap" }}>
          {filtered.length} z {orders.length}
        </span>
      </div>

      {canManage && (
        <div style={{ marginBottom: 16 }}>
          <DataImport
            columns={IMPORT_COLUMNS}
            validate={validateOrderRow}
            onImport={importOrders}
            templateBase="zlecenia"
            onDone={load}
          />
          <p style={{ fontSize: 12, color: palette.smoke, marginTop: 6 }}>
            Kolumna „Pojazd" = rejestracja (mapowana na pojazd; nierozpoznana → zapis bez
            przypisania). Kierowcę i status ustawisz po imporcie. Dedup po numerze zlecenia.
          </p>
        </div>
      )}

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
                <Badge color={STATUS_COLOR[o.status]}>{orderStatusLabel(t, o.status)}</Badge>
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
              <TransportCostLine tc={costByOrder.get(o.id)} />
              <div style={styles.cardActions}>
                <Button variant="ghost" onClick={() => setCmrOrder(o)}>
                  📄 CMR
                </Button>
                <Button variant="ghost" onClick={() => setPodOrder(o)}>
                  🧾 POD
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
                        {orderStatusLabel(t, s)}
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
              <CargoPhotos orderId={o.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** #246: linia kosztu transportu na karcie zlecenia (dystans · koszt · zysk/marża). */
function TransportCostLine({ tc }: { tc: OrderTransportCost | undefined }) {
  if (!tc || tc.distanceKm == null) return null;
  return (
    <div style={styles.costLine}>
      🧭 Transport: <strong>{tc.distanceKm} km</strong>
      {tc.cost != null ? (
        <>
          {" · koszt "}
          <strong>
            {tc.cost} {tc.currency}
          </strong>
          {tc.profit != null && (
            <>
              {" · zysk "}
              <strong style={{ color: tc.profit >= 0 ? "#22c55e" : palette.red }}>
                {tc.profit} {tc.currency}
              </strong>
              {tc.marginPercent != null ? ` (${tc.marginPercent}%)` : ""}
            </>
          )}
        </>
      ) : (
        <span style={styles.dim}> · koszt/km pojazdu nieznany (brak historii tankowań)</span>
      )}
    </div>
  );
}

function Field({
  label,
  v,
  set,
  ph,
  list,
}: {
  label: string;
  v: string;
  set: (s: string) => void;
  ph?: string;
  list?: string;
}) {
  return (
    <label style={styles.field}>
      <span style={f.label}>{label}</span>
      <input
        style={f.input}
        value={v}
        onChange={(e) => set(e.target.value)}
        placeholder={ph}
        list={list}
      />
    </label>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: { display: "flex", flexDirection: "column", gap: 12, marginTop: 16, maxWidth: 720 },
  grid: { display: "flex", gap: 12, flexWrap: "wrap" },
  field: { display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 160 },
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
  filters: { display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginTop: 10 },
  search: {
    flex: 1,
    minWidth: 220,
    background: palette.black,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
    padding: "9px 12px",
    color: palette.offWhite,
  },
  sortSel: {
    background: palette.black,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
    padding: "9px 12px",
    color: palette.offWhite,
  },
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
  costLine: {
    fontSize: 13,
    color: palette.offWhite,
    paddingTop: 6,
    borderTop: `1px dashed ${palette.graphite}`,
  },
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
