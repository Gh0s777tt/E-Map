/**
 * Zbiorczy eksport danych firmy do jednego skoroszytu `.xlsx` (arkusz na moduł):
 * kontrahenci, pojazdy, kierowcy, zlecenia, koszty pojazdu, paliwo, AdBlue, trasa
 * oraz arkusz „Statystyki" (agregaty per pojazd). Import pozostaje granularny (per element).
 */
import {
  listContractors,
  listDrivers,
  listFuelLogs,
  listOrders,
  listTripEvents,
  listVehicleCosts,
  listVehicles,
  type TypedSupabaseClient,
} from "@e-logistic/api";
import { round2 } from "@e-logistic/core";
import { csvDateStamp } from "./csv";
import { downloadXlsxWorkbook, type XlsxSheet } from "./xlsx";

interface FuelRow {
  vehicle_id: string | null;
  created_at: string;
  odometer_km: number;
  liters: number;
  price_total: number | null;
  station_country: string | null;
  station_city: string | null;
}
interface TripRow {
  vehicle_id: string | null;
  created_at: string;
  action: string;
  country: string | null;
  location: string | null;
  odometer_km: number | null;
  weight_kg: number | null;
  amount: number | null;
}

const d = (s: string | null | undefined) => (s ?? "").slice(0, 10);

/** Gromadzi wszystkie moduły firmy i pobiera je jako jeden wieloarkuszowy `.xlsx`. */
export async function exportCompanyWorkbook(
  sb: TypedSupabaseClient,
  companyId: string,
): Promise<void> {
  const [contractors, vehicles, drivers, orders, costs, fuelRaw, adblueRaw, tripsRaw] =
    await Promise.all([
      listContractors(sb, companyId),
      listVehicles(sb, companyId),
      listDrivers(sb, companyId),
      listOrders(sb, companyId),
      listVehicleCosts(sb, companyId),
      listFuelLogs(sb, { table: "fuel_logs" }),
      listFuelLogs(sb, { table: "adblue_logs" }),
      listTripEvents(sb, {}),
    ]);
  const fuel = fuelRaw as unknown as FuelRow[];
  const adblue = adblueRaw as unknown as FuelRow[];
  const trips = tripsRaw as unknown as TripRow[];

  const regOf = (id: string | null) =>
    id ? (vehicles.find((v) => v.id === id)?.registration ?? "—") : "—";

  const fuelSheet = (name: string, rows: FuelRow[]): XlsxSheet => ({
    name,
    headers: ["Pojazd", "Data", "Licznik", "Litry", "Cena", "Kraj", "Miasto"],
    rows: rows.map((r) => [
      regOf(r.vehicle_id),
      d(r.created_at),
      r.odometer_km,
      r.liters,
      r.price_total ?? "",
      r.station_country ?? "",
      r.station_city ?? "",
    ]),
  });

  const statsRows = vehicles.map((v) => {
    const f = fuel.filter((r) => r.vehicle_id === v.id);
    const t = trips.filter((r) => r.vehicle_id === v.id);
    const o = orders.filter((r) => r.vehicle_id === v.id);
    const liters = f.reduce((s, r) => s + (r.liters || 0), 0);
    const fuelCost = f.reduce((s, r) => s + (r.price_total || 0), 0);
    const revenue = o.reduce((s, r) => s + (r.price || 0), 0);
    return [
      v.registration,
      f.length,
      round2(liters),
      round2(fuelCost),
      t.length,
      o.length,
      round2(revenue),
    ];
  });

  const sheets: XlsxSheet[] = [
    {
      name: "Kontrahenci",
      headers: ["Nazwa", "NIP", "Adres", "Kraj"],
      rows: contractors.map((c) => [c.name, c.tax_id ?? "", c.address ?? "", c.country ?? ""]),
    },
    {
      name: "Pojazdy",
      headers: [
        "Rejestracja",
        "Marka",
        "Model",
        "Typ",
        "VIN",
        "Rok",
        "Przegląd",
        "OC",
        "Leasing",
        "Ubezpieczyciel",
      ],
      rows: vehicles.map((v) => [
        v.registration,
        v.make ?? "",
        v.model ?? "",
        v.vehicle_type ?? "",
        v.vin ?? "",
        v.year ?? "",
        v.inspection_expiry ?? "",
        v.insurance_expiry ?? "",
        v.leasing_end ?? "",
        v.insurer ?? "",
      ]),
    },
    {
      name: "Kierowcy",
      headers: [
        "Nazwisko",
        "Imię",
        "Kategorie",
        "Uprawnienia",
        "Prawo jazdy",
        "Kod 95",
        "Badania lek.",
        "Psychotechn.",
        "ADR",
      ],
      rows: drivers.map((dr) => [
        dr.last_name,
        dr.first_name,
        dr.license_categories.join(" "),
        dr.qualifications.join("; "),
        dr.license_expiry ?? "",
        dr.code95_expiry ?? "",
        dr.medical_expiry ?? "",
        dr.psychotech_expiry ?? "",
        dr.adr_expiry ?? "",
      ]),
    },
    {
      name: "Zlecenia",
      headers: [
        "Numer",
        "Status",
        "Nadawca",
        "Odbiorca",
        "Skąd",
        "Dokąd",
        "Ładunek",
        "Waga",
        "Stawka",
        "Waluta",
        "Pojazd",
        "Załadunek",
        "Rozładunek",
      ],
      rows: orders.map((o) => [
        o.reference_no ?? "",
        o.status,
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
      ]),
    },
    {
      name: "Koszty pojazdu",
      headers: ["Pojazd", "Kategoria", "Kwota", "Waluta", "Data", "Opis"],
      rows: costs.map((c) => [
        regOf(c.vehicle_id),
        c.category,
        c.amount,
        c.currency,
        c.cost_date,
        c.description ?? "",
      ]),
    },
    fuelSheet("Paliwo", fuel),
    fuelSheet("AdBlue", adblue),
    {
      name: "Trasa",
      headers: ["Pojazd", "Data", "Akcja", "Kraj", "Lokalizacja", "Licznik", "Waga", "Kwota"],
      rows: trips.map((r) => [
        regOf(r.vehicle_id),
        d(r.created_at),
        r.action,
        r.country ?? "",
        r.location ?? "",
        r.odometer_km ?? "",
        r.weight_kg ?? "",
        r.amount ?? "",
      ]),
    },
    {
      name: "Statystyki",
      headers: [
        "Pojazd",
        "Tankowań",
        "Litry",
        "Koszt paliwa",
        "Zdarzeń trasy",
        "Zleceń",
        "Przychód zleceń",
      ],
      rows: statsRows,
    },
  ];

  await downloadXlsxWorkbook(`firma_eksport_${csvDateStamp()}.xlsx`, sheets);
}
