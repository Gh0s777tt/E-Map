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
  listFxRates,
  listOrderReferences,
  listOrdersAll,
  type Order,
  saveOrder,
  setOrderStatus,
  toFxRates,
  upsertContractor,
} from "@e-logistic/api";
import {
  FREIGHT_EXPORT_HEADERS,
  type FxRate,
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
  rowAmountEur,
} from "@e-logistic/core";
import { cssPalette as palette } from "@e-logistic/ui";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CargoPhotos } from "@/components/CargoPhotos";
import { CmrDoc } from "@/components/CmrDoc";
import { useConfirm } from "@/components/ConfirmProvider";
import { DataImport, type ImportColumn } from "@/components/DataImport";
import * as f from "@/components/formStyles";
import { ListStatus } from "@/components/ListStatus";
import { useT } from "@/components/LocaleProvider";
import { PodDoc } from "@/components/PodDoc";
import { ShowMore } from "@/components/ShowMore";
import { useToast } from "@/components/Toast";
import { Badge, Button, PageHeader, SetupNotice } from "@/components/ui";
import { csvDateStamp, downloadCsv } from "@/lib/csv";
import { orderStatusLabel } from "@/lib/labels";
import { getCachedMembership } from "@/lib/membership";
import { queryKeyPrefixes } from "@/lib/queryKeys";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { useFleet } from "@/lib/useFleet";
import { useRenderWindow } from "@/lib/useRenderWindow";
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
  /**
   * [#378] Waluta i data ZDARZENIA. Bez tych dwóch kolumn koszt/km pojazdu
   * powstawał z sumy, w której tankowanie za 1200 PLN liczyło się jak 1200 € —
   * koszt transportu zlecenia wychodził zawyżony ponad czterokrotnie, a linia
   * „zysk" na karcie zlecenia potrafiła z tego powodu zrobić się ujemna.
   */
  currency: string | null;
  occurred_at: string;
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
  const qc = useQueryClient();
  const [orders, setOrders] = useState<Order[]>([]);
  /**
   * Lista nie dojechała w komplecie — podsumowanie NAD nią jest wtedy zaniżone.
   *
   * Ten ekran pokazuje wartość zleceń w euro i licznik „X z Y". Obie liczby po
   * uciętym pobraniu wyglądają dokładnie tak samo jak prawdziwe, a sąsiedni eksport
   * pobiera komplet osobno — więc arkusz i ekran podawały z tego samego filtra
   * dwie różne liczby wierszy, bez żadnego wyjaśnienia.
   */
  const [ordersIncomplete, setOrdersIncomplete] = useState(false);
  // #246: surowe dane do kosztu transportu per zlecenie (trasy z order_id + tankowania).
  const [legRows, setLegRows] = useState<LegRow[]>([]);
  const [fuelRows, setFuelRows] = useState<FuelRow[]>([]);
  const [adblueRows, setAdblueRows] = useState<FuelRow[]>([]);
  /** [#378] Kursy EBC — bez nich kwota w innej walucie niż euro nie ma jak wejść do sumy. */
  const [rates, setRates] = useState<FxRate[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [cmrOrder, setCmrOrder] = useState<Order | null>(null);
  const [podOrder, setPodOrder] = useState<Order | null>(null);
  const [canManage, setCanManage] = useState(false);
  // #297: zaznaczanie wielu zleceń → pasek akcji zbiorczych (status hurtem)
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<OrderSort>("date_desc");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [invByOrder, setInvByOrder] = useState<Record<string, { id: string; number: string }>>({});
  const focusDone = useRef(false);
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
      // [#378] Okno kursów. Ten ekran nie ma wyboru okresu — lista jest pełna
      // (schodzi stronami, patrz `listOrdersAll` niżej), więc bierzemy 24 miesiące
      // wstecz (tyle samo, co analityka we /stats), co pokrywa każde zlecenie,
      // którym ktokolwiek jeszcze się zajmuje.
      // Starsze zlecenie w obcej walucie nie zniknie po cichu: wpadnie do
      // licznika „brak kursu" pod podsumowaniem.
      const now = new Date();
      const fxFrom = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 23, 1))
        .toISOString()
        .slice(0, 10);
      const [ordPaged, comp, mem, contr, legs, fuel, adblue, fxRows] = await Promise.all([
        /*
         * STRONAMI, a nie jednym zapytaniem. `listOrders` bez `limit` nie znaczyło
         * „cała lista", tylko sufit `api.max_rows` PostgREST (1000) egzekwowany bez
         * błędu — a z tego stanu liczą się kwoty w podsumowaniu, licznik nad listą
         * i eksport giełdowy. Renderowanie zostaje ograniczone oknem (`okno` niżej):
         * komplet jest potrzebny liczbom, nie drzewu DOM.
         */
        listOrdersAll(sb, m.companyId),
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
          .select("vehicle_id, odometer_km, liters, price_total, currency, occurred_at")
          .order("created_at", { ascending: false })
          .limit(2000)
          .then((r) => r.data ?? []),
        sb
          .from("adblue_logs")
          .select("vehicle_id, odometer_km, liters, price_total, currency, occurred_at")
          .order("created_at", { ascending: false })
          .limit(2000)
          .then((r) => r.data ?? []),
        // [#378] Zapas 10 dni wstecz: kurs bierzemy z DNIA zdarzenia, a EBC nie
        // publikuje w weekendy i święta — zlecenie z 1. dnia miesiąca może
        // potrzebować notowania sprzed kilku dni. Ten sam wzorzec co /stats.
        listFxRates(sb, {
          from: new Date(Date.parse(fxFrom) - 10 * 86_400_000).toISOString().slice(0, 10),
        }),
      ]);
      setOrders(ordPaged.rows);
      setOrdersIncomplete(!ordPaged.complete);
      setRates(toFxRates(fxRows));
      // #268: mapa zlecenie→faktura (slim) — link 🧾 na wierszu zlecenia.
      sb.from("invoices")
        .select("id, number, order_id")
        .not("order_id", "is", null)
        .then((r) => {
          const map: Record<string, { id: string; number: string }> = {};
          for (const row of r.data ?? []) {
            if (row.order_id) map[row.order_id] = { id: row.id, number: row.number };
          }
          setInvByOrder(map);
        });
      setCompany(comp);
      setMembers(mem);
      setContractors(contr);
      setLegRows(legs as LegRow[]);
      setFuelRows(fuel as FuelRow[]);
      setAdblueRows(adblue as FuelRow[]);
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : t("orders.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  // #268: link kontekstowy z faktury — ?focus=<orderId> otwiera edycję zlecenia.
  // biome-ignore lint/correctness/useExhaustiveDependencies: jednorazowy focus po załadowaniu listy
  useEffect(() => {
    if (focusDone.current || orders.length === 0) return;
    const id = new URLSearchParams(window.location.search).get("focus");
    if (!id) return;
    focusDone.current = true;
    const o = orders.find((x) => x.id === id);
    if (o) {
      startEdit(o);
      setTimeout(
        () => document.getElementById(`ord-${id}`)?.scrollIntoView({ block: "center" }),
        50,
      );
    }
  }, [orders]);

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
  /**
   * Okno renderowania. Sumy, licznik i eksport liczą się z `filtered` (czyli z kompletu),
   * a w DOM ląduje tylko tyle kart, ile ktoś realnie przegląda — firma z kilkoma tysiącami
   * zleceń inaczej montowałaby je wszystkie naraz, razem z checkboxem i galerią zdjęć.
   */
  const okno = useRenderWindow(filtered);

  /**
   * [#378] Cena zlecenia przeliczona na euro po kursie z dnia ZAŁADUNKU.
   *
   * Data załadunku, a nie utworzenia wpisu: kurs ma odpowiadać momentowi, w którym
   * fracht został zrealizowany, bo taką datę ma dokument. Fallback na `created_at`
   * tylko wtedy, gdy załadunku nie wpisano.
   *
   * Zwraca `null` w DWÓCH różnych sytuacjach — brak kwoty i brak notowania — więc
   * wywołujący musi je rozróżnić, zanim cokolwiek napisze użytkownikowi.
   */
  const priceEur = useCallback(
    (o: Order) => rowAmountEur(o.price, o.currency, o.load_date ?? o.created_at, rates),
    [rates],
  );

  // #246: koszt transportu per zlecenie — dystans z liczników load→unload × koszt/km pojazdu.
  const transportCost = useMemo(() => {
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
      // [#378] Wcześniej szła tu surowa `price_total` bez spojrzenia na walutę,
      // więc tankowanie za 1200 PLN podbijało koszt/km pojazdu tak, jakby
      // kosztowało 1200 €. Zawyżony koszt/km mnożył się potem przez dystans
      // zlecenia i pokazywał stratę na trasie, która realnie zarobiła.
      priceTotal: rowAmountEur(r.price_total, r.currency, r.occurred_at, rates),
    });
    const fuelAll = fuelRows.map(toFuel);
    const adblueAll = adblueRows.map(toFuel);

    /**
     * [#378] Wpis bez przeliczonej kwoty MUSI wypaść z licznika i z wydatku
     * JEDNOCZEŚNIE. `fuelCostPerKmByVehicle` sumuje `priceTotal ?? 0`, ale dystans
     * bierze z rozpiętości min–max licznika WSZYSTKICH przekazanych wierszy — więc
     * tankowanie bez notowania (albo bez wpisanej kwoty) dokładało zero do wydatku,
     * a mimo to rozciągało dystans. Pojazd z ośmioma tankowaniami w złotówkach bez
     * kursu i dwoma w euro liczył wydatek z dwóch, a kilometry z całego zakresu:
     * koszt/km wychodził kilkukrotnie za niski, `cost` na karcie zaniżony, a `profit`
     * i `marginPercent` zawyżone — czyli trasa ze stratą wyglądała na dochodową.
     * Filtr tutaj zdejmuje taki wiersz z obu stron ułamka naraz, więc koszt/km jest
     * poprawnym średnim kosztem z tych tankowań, które dało się wycenić.
     */
    const priced = (e: { priceTotal: number | null }) => e.priceTotal != null;
    const fuel = fuelAll.filter(priced);
    const adblue = adblueAll.filter(priced);

    const list = orderTransportCosts({
      // [#378] Stawka też przeliczona, i to tym samym kursem co koszt. Silnik
      // odejmuje `koszt` od `ceny` bez patrzenia na waluty — przy zleceniu
      // w złotówkach i koszcie w euro „zysk" był odejmowaniem jabłek od gruszek
      // i jeszcze podpisywał wynik walutą zlecenia.
      orders: orders.map((o) => ({ id: o.id, price: priceEur(o), currency: "EUR" })),
      events,
      fuel,
      adblue,
    });

    /**
     * [#378] Ile wpisów odpadło i DLACZEGO — bo `summary.missingRate` pilnuje
     * wyłącznie cen zleceń, więc szacunek liczony z okrojonej historii tankowań
     * szedł na ekran jako liczba pewna. „Brak kwoty" i „brak notowania" to dwie
     * różne akcje naprawcze (wpisz cenę vs. poczekaj na kurs), więc liczymy osobno.
     */
    const rows = [...fuelRows, ...adblueRows];
    let skippedNoAmount = 0;
    let skippedNoRate = 0;
    // Pojazdy z okrojoną historią — tylko ich karty dostają znak „≈", żeby
    // ostrzeżenie nie wisiało przy zleceniach, których liczba wcale nie dotyczy.
    const partialVehicles = new Set<string>();
    for (const r of rows) {
      const dropped =
        r.price_total == null ||
        rowAmountEur(r.price_total, r.currency, r.occurred_at, rates) == null;
      if (!dropped) continue;
      if (r.price_total == null) skippedNoAmount += 1;
      else skippedNoRate += 1;
      if (r.vehicle_id) partialVehicles.add(r.vehicle_id);
    }

    return {
      byOrder: new Map<string, OrderTransportCost>(list.map((c) => [c.orderId, c])),
      skippedNoAmount,
      skippedNoRate,
      partialVehicles,
      /**
       * Baner nad listą tylko wtedy, gdy okrojona historia faktycznie stoi za jakąś
       * pokazaną kwotą — pominięte tankowanie pojazdu, który nie wozi żadnego zlecenia
       * z tej listy, nie psuje niczego, co widać na ekranie.
       */
      partial: list.some(
        (c) => c.cost != null && c.vehicleId != null && partialVehicles.has(c.vehicleId),
      ),
    };
  }, [orders, legRows, fuelRows, adblueRows, rates, priceEur]);

  /**
   * Podsumowanie nad listą — wartość zleceń w euro.
   *
   * [#378] Było `arr.filter((o) => o.currency === "EUR")`: zlecenie wystawione
   * w złotówkach po cichu wypadało z sumy. Wiersz z ceną widniał w tabeli tuż
   * pod spodem, więc podsumowanie wyglądało na zwykły błąd arytmetyczny —
   * a im więcej firma woziła po Polsce, tym bardziej zaniżony był jej przychód.
   * Teraz każde zlecenie przechodzi przez kurs z dnia załadunku.
   */
  const summary = useMemo(() => {
    // Pozycji bez kursu NIE liczymy jako zero („darmowy fracht") — pomijamy je
    // i mówimy wprost, ile ich było.
    const sum = (arr: Order[]) => round2(arr.reduce((a, o) => a + (priceEur(o) ?? 0), 0));
    const delivered = filtered.filter((o) => o.status === "delivered");
    return {
      count: filtered.length,
      valueEur: sum(filtered),
      deliveredCount: delivered.length,
      deliveredValueEur: sum(delivered),
      /**
       * Zlecenia, które MAJĄ cenę, ale nie ma dla niej notowania na dzień
       * załadunku. To coś innego niż „nie wpisano stawki" i nie wolno tego zlewać
       * w jeden komunikat: temu, kto wpisał 5000 PLN, prośba „uzupełnij kwotę"
       * jest nie do wykonania.
       */
      missingRate: filtered.filter((o) => o.price != null && priceEur(o) == null).length,
    };
  }, [filtered, priceEur]);

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
      toast(t("orders.checkData"), "error");
      return;
    }
    try {
      const sb = getBrowserSupabase();
      const m = await getCachedMembership(sb);
      if (!m) {
        toast(t("orders.noCompany"), "error");
        return;
      }
      // Czy przypisanie kierowcy faktycznie się zmieniło (do natychmiastowego push).
      const prevAssigned = editingId
        ? (orders.find((o) => o.id === editingId)?.assigned_to ?? "")
        : "";
      const id = await saveOrder(sb, m.companyId, parsed.data, editingId ?? undefined);
      // Organicznie buduj rejestr kontrahentów z nadawcy/odbiorcy (best-effort).
      const nowiKontrahenci = [shipper.trim(), consignee.trim()].filter(
        (n) => n && !contractors.some((c) => c.name === n),
      );
      await Promise.all(
        nowiKontrahenci.map((name) => upsertContractor(sb, m.companyId, { name }).catch(() => {})),
      );
      /*
       * Rejestr kontrahentów jest już na TanStack Query (`/kontrahenci`), a ten ekran nie —
       * bez unieważnienia wpis dopisany tutaj nie widniał tam przez `staleTime`, więc
       * dyspozytor dodawał tego samego kontrahenta ręcznie i przy różnicy w NIP/adresie
       * `upsertContractor` zakładał DRUGI rekord. Duplikat w rejestrze jest trwały,
       * a nieświeża lista tylko chwilowa — dlatego pilnujemy tego tutaj, przy źródle.
       */
      if (nowiKontrahenci.length > 0) {
        void qc.invalidateQueries({ queryKey: queryKeyPrefixes.contractors() });
      }
      if (assignedTo && assignedTo !== prevAssigned) {
        // Natychmiastowy push do kierowcy (best-effort — powiadomienie w aplikacji powstaje przez trigger).
        void fetch("/api/orders/notify-assignment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: id }),
        }).catch(() => {});
      }
      toast(editingId ? t("orders.updated") : t("orders.added"), "success");
      resetForm();
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : t("orders.saveError"), "error");
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /** #297: hurtowa zmiana statusu — optymistycznie, z cofnięciem nieudanych. */
  async function bulkChangeStatus(s: OrderStatus) {
    const ids = [...selected];
    if (ids.length === 0) return;
    const prevById = new Map(orders.map((o) => [o.id, o.status]));
    setOrders((list) => list.map((o) => (selected.has(o.id) ? { ...o, status: s } : o)));
    setSelected(new Set());
    const results = await Promise.allSettled(
      ids.map((id) => setOrderStatus(getBrowserSupabase(), id, s)),
    );
    const failed = ids.filter((_, i) => results[i]?.status === "rejected");
    if (failed.length > 0) {
      setOrders((list) =>
        list.map((o) =>
          failed.includes(o.id) ? { ...o, status: prevById.get(o.id) ?? o.status } : o,
        ),
      );
      toast(
        `${t("orders.bulkPartialPrefix")}${ids.length - failed.length}/${ids.length}${t("orders.bulkPartialSuffix")}`,
        "error",
      );
    } else {
      toast(`${t("orders.bulkDonePrefix")}${ids.length}${t("orders.bulkDoneSuffix")}`, "success");
    }
  }

  async function changeStatus(id: string, s: OrderStatus) {
    // Optymistycznie: zmień status lokalnie od razu; przy błędzie cofnij (bez pełnego reloadu).
    const prev = orders.find((o) => o.id === id)?.status;
    setOrders((list) => list.map((o) => (o.id === id ? { ...o, status: s } : o)));
    try {
      await setOrderStatus(getBrowserSupabase(), id, s);
      toast(t("orders.statusUpdated"), "success");
    } catch (e) {
      if (prev) setOrders((list) => list.map((o) => (o.id === id ? { ...o, status: prev } : o)));
      toast(e instanceof Error ? e.message : t("orders.statusError"), "error");
    }
  }

  async function invoice(o: Order) {
    if (
      !(await confirm(
        `${t("orders.invoiceConfirmPrefix")}${o.reference_no || t("common.noNumber")}${t("orders.invoiceConfirmSuffix")}`,
      ))
    )
      return;
    try {
      const r = await createInvoiceFromOrder(getBrowserSupabase(), o.id);
      toast(
        `${t("orders.invoiceBtn")} ${r.number} (${t("orders.grossWord")} ${r.gross} ${o.currency})${t("orders.invoiceCreatedTail")}`,
        "success",
      );
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : t("orders.invoiceError"), "error");
    }
  }

  async function remove(id: string) {
    if (!(await confirm(t("orders.deleteConfirm")))) return;
    try {
      await deleteOrder(getBrowserSupabase(), id);
      if (editingId === id) resetForm();
      toast(t("orders.deleted"), "success");
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : t("orders.deleteError"), "error");
    }
  }

  /**
   * Zbiór do eksportu pobierany OSOBNO i stronami — nie ze stanu `orders`.
   *
   * Lista na ekranie powstaje z jednego zapytania, więc obowiązuje ją sufit
   * `api.max_rows` (1000) egzekwowany bez błędu: dla firmy z większą historią
   * `orders` jest cichym wycinkiem. Na ekranie to strata kosmetyczna, w arkuszu
   * przekazanym księgowości — zaniżony przychód, którego po zapisaniu pliku nie da
   * się już odróżnić od prawdziwego. Filtr statusu idzie przy okazji do BAZY,
   * bo tylko on ma tam odpowiednik; tekst i sortowanie zostają w pamięci, na
   * komplecie, który właśnie zszedł.
   *
   * `null` = eksportu nie wolno zrobić; powód pokazał już toast.
   */
  const collectExportOrders = useCallback(async (): Promise<Order[] | null> => {
    try {
      const sb = getBrowserSupabase();
      const m = await getCachedMembership(sb);
      if (!m) {
        toast(t("vehicles.noCompanyImport"), "error");
        return null;
      }
      const paged = await listOrdersAll(
        sb,
        m.companyId,
        filter === "all" ? undefined : { statuses: [filter] },
      );
      if (!paged.complete) {
        toast(t("orders.exportIncomplete"), "error");
        return null;
      }
      return filterSortOrders(paged.rows, { text: query, status: filter, sort });
    } catch (e) {
      toast(e instanceof Error ? e.message : t("orders.exportFailed"), "error");
      return null;
    }
  }, [filter, query, sort, t, toast]);

  /**
   * Jeden zestaw nagłówków i komórek dla CSV i XLSX. Dwa osobne rozjechałyby się
   * przy pierwszej dołożonej kolumnie — a rozjazd między arkuszami tej samej listy
   * zauważa się dopiero u odbiorcy.
   */
  function exportTable(list: Order[]) {
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
    const rows = list.map((o) => [
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
    return { headers, rows };
  }

  async function exportCsv() {
    const list = await collectExportOrders();
    if (!list) return;
    const { headers, rows } = exportTable(list);
    downloadCsv(`zlecenia_${csvDateStamp()}.csv`, headers, rows);
  }

  async function exportXlsx() {
    const list = await collectExportOrders();
    if (!list) return;
    const { headers, rows } = exportTable(list);
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
          errors: [t("vehicles.noCompanyImport")],
        };
      }
      const regMap = new Map(vehicles.map((v) => [v.registration.toUpperCase(), v.id]));
      /**
       * Numery referencyjne CAŁEJ historii, stronami — nie 1000 najnowszych zleceń.
       *
       * Wykrywanie duplikatu na oknie „najnowszych" nie wykrywa niczego tam, gdzie
       * duplikat naprawdę powstaje: ponownie wgrany plik sprzed kwartału nie trafia
       * w to okno ani jednym numerem, więc każda pozycja wjeżdża do bazy drugi raz —
       * a potem drugi raz do przychodu w eksporcie i w zestawieniu miesięcznym.
       */
      const refsPaged = await listOrderReferences(sb, m.companyId);
      /**
       * Niepełny zbiór numerów = BRAK importu, nie import „na oko".
       *
       * Przy obciętej liście nie wiadomo, czy numeru nie ma w bazie, czy tylko nie
       * dojechał — a pomyłka w tę stronę kończy się podwojonym przychodem, którego
       * nikt później nie odróżni od prawdziwego. Odmowa jest odwracalna, duplikat nie.
       */
      if (!refsPaged.complete) {
        return { inserted: 0, failed: rows.length, errors: [t("orders.importRefsIncomplete")] };
      }
      const existingRefs = new Set(
        refsPaged.rows.map((o) => (o.reference_no ?? "").trim().toUpperCase()).filter(Boolean),
      );
      let inserted = 0;
      let failed = 0;
      const errors: string[] = [];
      for (const { input, registration } of rows) {
        const ref = (input.referenceNo ?? "").trim().toUpperCase();
        if (ref && existingRefs.has(ref)) {
          failed++;
          if (errors.length < 8)
            errors.push(`${input.referenceNo}: ${t("orders.importDuplicate")}`);
          continue;
        }
        const vehicleId = registration ? regMap.get(registration.toUpperCase()) : undefined;
        if (registration && !vehicleId && errors.length < 8) {
          errors.push(
            `${input.referenceNo || t("orders.importRowFallback")}: ${t("orders.importVehicleUnknownPrefix")}${registration}${t("orders.importVehicleUnknownSuffix")}`,
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
              `${input.referenceNo || t("orders.importRowFallback")}: ${e instanceof Error ? e.message : t("common.error")}`,
            );
          }
        }
      }
      return { inserted, failed, errors };
    },
    [vehicles, t],
  );

  /**
   * Eksport zleceń na giełdę transportową (uniwersalny CSV frachtu).
   *
   * Zbiór z `collectExportOrders`, a nie ze stanu `orders`, i ta sama bramka co przy
   * CSV/XLSX: przycisk stoi w tym samym rzędzie, więc gdyby jeden z trzech eksportów
   * był niepilnowany, użytkownik, któremu przed chwilą odmówiono, dostawałby z sąsiada
   * dokładnie ten niepełny plik, przed którym go chroniono. Plik po zapisaniu nie niesie
   * już informacji, że czegoś w nim brakuje — a niesprzedany fracht, który nie trafił
   * na giełdę, nie upomina się nigdzie.
   */
  async function exportFreight() {
    const list = await collectExportOrders();
    if (!list) return;
    const rows = freightExportRows(
      list.map((o) => ({
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
      <PageHeader title={t("orders.title")} subtitle={t("orders.subtitle")} />

      <SetupNotice source={source} noVehicles={t("orders.noVehicles")} />

      {canManage && (
        <div style={styles.form}>
          {editingId && (
            <div style={{ color: palette.red, fontWeight: 700 }}>{t("orders.editingBanner")}</div>
          )}
          <div style={styles.grid}>
            <Field
              label={t("orders.fieldReference")}
              v={referenceNo}
              set={setReferenceNo}
              ph={t("orders.referencePlaceholder")}
            />
            <Field
              label={t("orders.csv.cargo")}
              v={cargo}
              set={setCargo}
              ph={t("orders.cargoPlaceholder")}
            />
          </div>
          <div style={styles.grid}>
            <Field
              label={t("orders.csv.shipper")}
              v={shipper}
              set={setShipper}
              list="contractors-dl"
            />
            <Field
              label={t("orders.csv.consignee")}
              v={consignee}
              set={setConsignee}
              list="contractors-dl"
            />
          </div>
          <datalist id="contractors-dl">
            {contractors.map((c) => (
              <option key={c.id} value={c.name} />
            ))}
          </datalist>
          <div style={styles.grid}>
            <Field label={t("orders.fieldOrigin")} v={origin} set={setOrigin} />
            <Field label={t("orders.fieldDestination")} v={destination} set={setDestination} />
          </div>
          <div style={styles.grid}>
            <label style={styles.field}>
              <span style={f.label}>{t("orders.fieldLoadDate")}</span>
              <input
                style={f.input}
                type="date"
                value={loadDate}
                onChange={(e) => setLoadDate(e.target.value)}
              />
            </label>
            <label style={styles.field}>
              <span style={f.label}>{t("orders.fieldUnloadDate")}</span>
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
              <span style={f.label}>{t("orders.csv.weight")}</span>
              <input
                style={f.input}
                type="number"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
              />
            </label>
            <label style={styles.field}>
              <span style={f.label}>{t("orders.csv.rate")}</span>
              <input
                style={f.input}
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </label>
            <label style={{ ...styles.field, maxWidth: 90 }}>
              <span style={f.label}>{t("orders.csv.currency")}</span>
              <input
                style={f.input}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              />
            </label>
            <label style={styles.field}>
              <span style={f.label}>{t("common.vehicle")}</span>
              <select
                style={f.input}
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
              >
                <option value="">{t("orders.vehicleNone")}</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registration}
                  </option>
                ))}
              </select>
            </label>
            <label style={styles.field}>
              <span style={f.label}>{t("orders.fieldDriver")}</span>
              <select
                style={f.input}
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
              >
                <option value="">{t("orders.driverUnassigned")}</option>
                {drivers.map((d) => (
                  <option key={d.user_id} value={d.user_id}>
                    {d.email}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label style={styles.field}>
            <span style={f.label}>{t("orders.fieldNotes")}</span>
            <textarea
              style={{ ...f.input, minHeight: 50 }}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <div style={{ display: "flex", gap: 10 }}>
            <Button onClick={save}>{editingId ? t("common.save") : t("orders.add")}</Button>
            {editingId && (
              <Button variant="ghost" onClick={resetForm}>
                {t("common.cancel")}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Nad podsumowaniem, bo unieważnia dokładnie te liczby, które w nim stoją —
          i nie da się wskazać, którego wiersza brakuje. */}
      {!loading && !loadErr && ordersIncomplete && (
        <div style={styles.rateWarn}>{t("orders.incomplete")}</div>
      )}

      {orders.length > 0 && (
        <div style={styles.summary}>
          <span>
            {t("orders.summaryCount")} <strong>{summary.count}</strong>
          </span>
          <span>
            {t("orders.summaryValue")}{" "}
            <strong style={{ color: palette.red }}>{summary.valueEur}</strong>
          </span>
          <span>
            {t("orders.summaryToInvoice")} <strong>{summary.deliveredCount}</strong> (
            {summary.deliveredValueEur} EUR)
          </span>
        </div>
      )}

      {/* [#378] „Brak stawki" i „brak kursu" to dwie różne rzeczy. Tu chodzi
          wyłącznie o to drugie: kwota jest wpisana, brakuje notowania na dzień
          załadunku, więc zlecenie nie weszło do sumy. Bez tej informacji suma
          wyglądałaby na kompletną — a właśnie ta cicha niekompletność była
          pierwotnym błędem. */}
      {summary.missingRate > 0 && (
        <div style={styles.rateWarn}>
          ⚠️ Suma niepełna — {summary.missingRate}{" "}
          {summary.missingRate === 1 ? "zlecenie ma stawkę" : "zleceń ma stawkę"} w walucie bez
          notowania na dzień załadunku. Kwoty są wpisane; brakuje kursu, więc nie weszły do
          przeliczenia.
        </div>
      )}

      {/* [#378] Osobny sygnał, bo `summary.missingRate` mówi tylko o cenach zleceń.
          Koszt transportu bierze się z kosztu/km pojazdu, a ten liczymy wyłącznie
          z tankowań, które dało się wycenić — reszta wypada z wydatku i z licznika
          naraz. Liczba na karcie zlecenia jest więc poprawna, ale to szacunek z
          okrojonej historii i użytkownik musi o tym wiedzieć, zanim uzna wynik trasy
          za pewny. */}
      {transportCost.partial && (
        <div style={styles.rateWarn}>
          ⚠️ Koszt transportu to szacunek — koszt/km liczony jest bez części tankowań.
          {transportCost.skippedNoRate > 0 && (
            <> Bez notowania waluty na dzień tankowania: {transportCost.skippedNoRate}.</>
          )}
          {transportCost.skippedNoAmount > 0 && (
            <> Bez wpisanej kwoty: {transportCost.skippedNoAmount}.</>
          )}{" "}
          Te wpisy są pominięte razem ze swoimi licznikami, więc koszt/km pochodzi z pozostałych
          tankowań.
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
        <input
          style={styles.search}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("orders.searchPlaceholder")}
        />
        <select
          style={styles.sortSel}
          value={sort}
          onChange={(e) => setSort(e.target.value as OrderSort)}
          aria-label={t("orders.sortAria")}
        >
          <option value="date_desc">{t("orders.sortDateDesc")}</option>
          <option value="date_asc">{t("orders.sortDateAsc")}</option>
          <option value="price_desc">{t("orders.sortPriceDesc")}</option>
          <option value="price_asc">{t("orders.sortPriceAsc")}</option>
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
          {t("orders.exportFreight")}
        </Button>
        <Button variant="ghost" onClick={exportCsv}>
          ⬇️ CSV
        </Button>
        <Button variant="ghost" onClick={exportXlsx}>
          ⬇️ XLSX
        </Button>
        <span style={{ color: palette.smoke, fontSize: 13, whiteSpace: "nowrap" }}>
          {filtered.length} {t("orders.countOf")} {orders.length}
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
            {t("orders.importNote")}
          </p>
        </div>
      )}

      <ListStatus
        loading={loading}
        error={loadErr}
        empty={orders.length === 0}
        emptyText={t("orders.empty")}
        emptyIcon="package"
        onRetry={load}
      />
      {!loading && !loadErr && filtered.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          {okno.visible.map((o) => (
            <div key={o.id} style={styles.card}>
              <div style={styles.cardHead}>
                {canManage && (
                  <input
                    type="checkbox"
                    checked={selected.has(o.id)}
                    onChange={() => toggleSelect(o.id)}
                    aria-label={`${t("orders.selectAriaPrefix")}${o.reference_no || o.id}`}
                    style={styles.selectBox}
                  />
                )}
                <strong>{o.reference_no || t("common.noNumber")}</strong>
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
                {o.vehicle_id && (
                  /* #296: encje połączone — pojazd w zleceniu klikalny */
                  <Link
                    href={`/vehicles/${o.vehicle_id}`}
                    style={{ ...styles.dim, textDecoration: "underline dotted" }}
                    title={t("orders.openVehicleCard")}
                  >
                    🚚 {regOf(o.vehicle_id)}
                  </Link>
                )}
                {o.assigned_to && <span style={styles.dim}>👤 {emailOf(o.assigned_to)}</span>}
                {o.load_date && (
                  <span style={styles.dim}>
                    {t("orders.loadedShort")} {o.load_date}
                  </span>
                )}
              </div>
              <TransportCostLine
                tc={transportCost.byOrder.get(o.id)}
                partialVehicles={transportCost.partialVehicles}
              />
              <div style={styles.cardActions}>
                <Button variant="ghost" onClick={() => setCmrOrder(o)}>
                  📄 CMR
                </Button>
                <Button variant="ghost" onClick={() => setPodOrder(o)}>
                  🧾 POD
                </Button>
                {(o.origin || o.destination) && (
                  <Button variant="ghost" onClick={() => showOnMap(o)}>
                    🗺️ {t("nav.map")}
                  </Button>
                )}
              </div>
              {canManage && (
                <div style={styles.cardActions}>
                  {o.status === "delivered" && (
                    <Button variant="ghost" onClick={() => invoice(o)}>
                      🧾 {t("orders.invoiceBtn")}
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
                  {(() => {
                    const inv = invByOrder[o.id];
                    return inv ? (
                      <a
                        href={`/invoices?focus=${inv.id}`}
                        title={`${t("orders.invoiceBtn")} ${inv.number}`}
                        style={{ alignSelf: "center" }}
                      >
                        🧾
                      </a>
                    ) : null;
                  })()}
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
          <ShowMore hidden={okno.hidden} onShowMore={okno.showMore} />
        </div>
      )}

      {/* #297: pływający pasek akcji zbiorczych */}
      {canManage && selected.size > 0 && (
        <div style={styles.bulkBar}>
          <strong>
            {selected.size} {t("orders.selectedShort")}
          </strong>
          <select
            style={styles.statusSel}
            value=""
            onChange={(e) => bulkChangeStatus(e.target.value as OrderStatus)}
          >
            <option value="" disabled>
              {t("orders.bulkChangeStatus")}
            </option>
            {ORDER_STATUSES.map((st) => (
              <option key={st} value={st}>
                {orderStatusLabel(t, st)}
              </option>
            ))}
          </select>
          <Button variant="ghost" onClick={() => setSelected(new Set(filtered.map((o) => o.id)))}>
            {t("common.all")} ({filtered.length})
          </Button>
          <Button variant="ghost" onClick={() => setSelected(new Set())}>
            {t("orders.clear")}
          </Button>
        </div>
      )}
    </div>
  );
}

/** #246: linia kosztu transportu na karcie zlecenia (dystans · koszt · zysk/marża). */
function TransportCostLine({
  tc,
  /**
   * [#378] Pojazdy, których koszt/km powstał z niepełnej historii tankowań (część
   * wpisów bez kwoty albo bez notowania waluty — takie wypadają z wydatku i z licznika
   * naraz). Liczba jest poprawna dla danych, które są, ale nie wolno jej pokazywać jako
   * pewnej — stąd „≈" i podpowiedź przy samej wartości, a nie tylko baner na górze
   * listy, którego przy przewiniętej karcie nikt nie widzi.
   */
  partialVehicles,
}: {
  tc: OrderTransportCost | undefined;
  partialVehicles: ReadonlySet<string>;
}) {
  const t = useT();
  if (!tc || tc.distanceKm == null) return null;
  const partial = tc.vehicleId != null && partialVehicles.has(tc.vehicleId);
  const approxTitle = partial
    ? "Szacunek: koszt/km tego pojazdu policzony bez tankowań bez kwoty lub bez notowania waluty."
    : undefined;
  return (
    <div style={styles.costLine}>
      🧭 {t("orders.transportLabel")}: <strong>{tc.distanceKm} km</strong>
      {tc.cost != null ? (
        <>
          {` · ${t("orders.costLabel")} `}
          <strong title={approxTitle}>
            {partial ? "≈" : ""}
            {tc.cost} {tc.currency}
          </strong>
          {tc.profit != null && (
            <>
              {` · ${t("orders.profitLabel")} `}
              <strong
                title={approxTitle}
                style={{ color: tc.profit >= 0 ? "#22c55e" : palette.red }}
              >
                {partial ? "≈" : ""}
                {tc.profit} {tc.currency}
              </strong>
              {tc.marginPercent != null ? ` (${partial ? "≈" : ""}${tc.marginPercent}%)` : ""}
            </>
          )}
        </>
      ) : (
        <span style={styles.dim}>{t("orders.costUnknown")}</span>
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
  /** [#378] Ostrzeżenie o niepełnej sumie — ten sam styl co na /stats. */
  rateWarn: {
    border: `1px solid ${palette.warning}`,
    borderRadius: 10,
    padding: "10px 14px",
    marginTop: 10,
    color: palette.offWhite,
    fontSize: 13,
    lineHeight: 1.5,
    background: palette.nearBlack,
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
  selectBox: { width: 16, height: 16, accentColor: palette.red, cursor: "pointer" },
  bulkBar: {
    position: "fixed",
    bottom: 20,
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 60,
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 999,
    padding: "10px 16px",
    boxShadow: "0 12px 40px rgba(0,0,0,0.55)",
  },
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
