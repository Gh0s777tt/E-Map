"use client";

import {
  deleteVehicleCost,
  insertVehicleCost,
  listVehicleCosts,
  type VehicleCost,
} from "@e-logistic/api";
import {
  VEHICLE_COST_CATEGORIES,
  VEHICLE_COST_CATEGORY_LABELS,
  type VehicleCostCategory,
  type VehicleCostInput,
} from "@e-logistic/core";
import { cssPalette as palette } from "@e-logistic/ui";
import { useCallback, useEffect, useState } from "react";
import { useConfirm } from "@/components/ConfirmProvider";
import { DataImport, type ImportColumn } from "@/components/DataImport";
import { type Column, DataTable } from "@/components/DataTable";
import * as f from "@/components/formStyles";
import { ListStatus } from "@/components/ListStatus";
import { useToast } from "@/components/Toast";
import { Button, PageHeader } from "@/components/ui";
import { csvDateStamp, downloadCsv } from "@/lib/csv";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { useFleet } from "@/lib/useFleet";
import { downloadXlsx } from "@/lib/xlsx";

type CostImportRow = { input: Omit<VehicleCostInput, "vehicleId">; registration: string };

/** Aliasy kategorii: klucze enum + polskie etykiety (round-trip z eksportem) + potoczne warianty. */
const CATEGORY_ALIASES: Record<string, VehicleCostCategory> = (() => {
  const m: Record<string, VehicleCostCategory> = {};
  for (const cat of VEHICLE_COST_CATEGORIES) {
    m[cat] = cat;
    m[VEHICLE_COST_CATEGORY_LABELS[cat].toLowerCase()] = cat;
  }
  return Object.assign(m, {
    naprawa: "repair",
    serwis: "repair",
    rata: "leasing",
    oc: "insurance",
    podatek: "tax",
    oplaty: "tax",
    mandat: "fine",
    kara: "fine",
    postoj: "parking",
  } satisfies Record<string, VehicleCostCategory>);
})();

const IMPORT_COLUMNS: ImportColumn[] = [
  { key: "vehicle", label: "Pojazd", aliases: ["rejestracja", "registration"], required: true },
  { key: "category", label: "Kategoria", aliases: ["category", "typ", "rodzaj"], required: true },
  { key: "amount", label: "Kwota", aliases: ["amount", "koszt", "cena"], required: true },
  { key: "currency", label: "Waluta", aliases: ["currency"] },
  { key: "costDate", label: "Data", aliases: ["data", "date"], required: true },
  { key: "description", label: "Opis", aliases: ["opis", "description", "notes", "komentarz"] },
];

function costNum(s: string | undefined): number | undefined {
  const raw = (s ?? "").trim().replace(/\s/g, "").replace(",", ".");
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function validateCostRow(
  rec: Record<string, string>,
): { ok: true; value: CostImportRow } | { ok: false; error: string } {
  const registration = (rec.vehicle ?? "").trim();
  if (!registration) return { ok: false, error: "brak pojazdu (rejestracji)" };
  const category = CATEGORY_ALIASES[(rec.category ?? "").trim().toLowerCase()];
  if (!category) return { ok: false, error: `nieznana kategoria: ${rec.category ?? ""}` };
  const amount = costNum(rec.amount);
  if (amount == null || amount < 0) return { ok: false, error: "brak/niepoprawna kwota" };
  const costDate = (rec.costDate ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(costDate)) {
    return { ok: false, error: "data w formacie RRRR-MM-DD" };
  }
  return {
    ok: true,
    value: {
      input: {
        category,
        amount,
        currency: (rec.currency ?? "").trim() || "EUR",
        costDate,
        description: (rec.description ?? "").trim() || undefined,
      },
      registration,
    },
  };
}

const catLabel = (c: string) => VEHICLE_COST_CATEGORY_LABELS[c as VehicleCostCategory] ?? c;

export default function CostsPage() {
  const confirm = useConfirm();
  const toast = useToast();
  const { vehicles } = useFleet();
  const [costs, setCosts] = useState<VehicleCost[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const [vehicleId, setVehicleId] = useState("");
  const [category, setCategory] = useState<VehicleCostCategory>("repair");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [costDate, setCostDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadErr(null);
    try {
      const sb = getBrowserSupabase();
      const m = await getCachedMembership(sb);
      if (!m) {
        setCosts([]);
        return;
      }
      setCanManage(m.role === "owner" || m.role === "dispatcher");
      setCosts(await listVehicleCosts(sb, m.companyId));
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Nie udało się pobrać kosztów.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!vehicleId && vehicles[0]) setVehicleId(vehicles[0].id);
  }, [vehicles, vehicleId]);

  const regOf = useCallback(
    (id: string | null) => (id ? (vehicles.find((v) => v.id === id)?.registration ?? "—") : "—"),
    [vehicles],
  );

  async function save() {
    if (!vehicleId) {
      toast("Wybierz pojazd.", "error");
      return;
    }
    const val = Number(amount);
    if (!Number.isFinite(val) || val < 0) {
      toast("Podaj poprawną kwotę (≥ 0).", "error");
      return;
    }
    try {
      const sb = getBrowserSupabase();
      const m = await getCachedMembership(sb);
      if (!m) {
        toast("Brak firmy — utwórz ją na Pulpicie.", "error");
        return;
      }
      await insertVehicleCost(
        sb,
        {
          vehicleId,
          category,
          amount: val,
          currency: currency.trim() || "EUR",
          costDate,
          description: description.trim() || undefined,
        },
        m.companyId,
      );
      toast("Koszt dodany.", "success");
      setAmount("");
      setDescription("");
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Błąd zapisu.", "error");
    }
  }

  async function remove(c: VehicleCost) {
    if (!(await confirm(`Usunąć koszt ${catLabel(c.category)} (${c.amount} ${c.currency})?`)))
      return;
    try {
      await deleteVehicleCost(getBrowserSupabase(), c.id);
      toast("Koszt usunięty.", "success");
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Błąd usuwania.", "error");
    }
  }

  function exportCsv() {
    const headers = ["Pojazd", "Kategoria", "Kwota", "Waluta", "Data", "Opis"];
    const rows = costs.map((c) => [
      regOf(c.vehicle_id),
      catLabel(c.category),
      c.amount,
      c.currency,
      c.cost_date,
      c.description ?? "",
    ]);
    downloadCsv(`koszty_${csvDateStamp()}.csv`, headers, rows);
  }

  async function exportXlsx() {
    const headers = ["Pojazd", "Kategoria", "Kwota", "Waluta", "Data", "Opis"];
    const rows = costs.map((c) => [
      regOf(c.vehicle_id),
      catLabel(c.category),
      c.amount,
      c.currency,
      c.cost_date,
      c.description ?? "",
    ]);
    await downloadXlsx(`koszty_${csvDateStamp()}.xlsx`, headers, rows);
  }

  const importCosts = useCallback(
    async (rows: CostImportRow[]) => {
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
      const keyOf = (vid: string, cat: string, amt: number, date: string, desc: string) =>
        `${vid}|${cat}|${amt}|${date}|${desc}`;
      const existing = new Set(
        (await listVehicleCosts(sb, m.companyId)).map((c) =>
          keyOf(c.vehicle_id, c.category, c.amount, c.cost_date, c.description ?? ""),
        ),
      );
      let inserted = 0;
      let failed = 0;
      const errors: string[] = [];
      for (const { input, registration } of rows) {
        const vehicleIdMapped = regMap.get(registration.toUpperCase());
        if (!vehicleIdMapped) {
          failed++;
          if (errors.length < 8) errors.push(`${registration}: pojazd nierozpoznany (pominięto)`);
          continue;
        }
        const key = keyOf(
          vehicleIdMapped,
          input.category,
          input.amount,
          input.costDate,
          input.description ?? "",
        );
        if (existing.has(key)) {
          failed++;
          if (errors.length < 8)
            errors.push(`${registration} ${input.category}: duplikat (pominięto)`);
          continue;
        }
        try {
          await insertVehicleCost(sb, { vehicleId: vehicleIdMapped, ...input }, m.companyId);
          existing.add(key);
          inserted++;
        } catch (e) {
          failed++;
          if (errors.length < 8) {
            errors.push(`${registration}: ${e instanceof Error ? e.message : "błąd"}`);
          }
        }
      }
      return { inserted, failed, errors };
    },
    [vehicles],
  );

  const cols: Column<VehicleCost>[] = [
    {
      key: "vehicle",
      header: "Pojazd",
      sort: (c) => regOf(c.vehicle_id),
      cell: (c) => regOf(c.vehicle_id),
    },
    {
      key: "category",
      header: "Kategoria",
      sort: (c) => c.category,
      cell: (c) => catLabel(c.category),
    },
    {
      key: "amount",
      header: "Kwota",
      align: "right",
      sort: (c) => c.amount,
      cell: (c) => `${c.amount} ${c.currency}`,
    },
    { key: "cost_date", header: "Data", sort: (c) => c.cost_date, cell: (c) => c.cost_date },
    { key: "description", header: "Opis", cell: (c) => c.description ?? "—" },
    ...(canManage
      ? [
          {
            key: "actions",
            header: "",
            align: "right" as const,
            cell: (c: VehicleCost) => (
              <Button variant="danger" onClick={() => remove(c)}>
                🗑️
              </Button>
            ),
          },
        ]
      : []),
  ];

  return (
    <div style={{ maxWidth: 900 }}>
      <PageHeader
        title="Koszty pojazdów"
        subtitle="Koszty inne niż paliwo (naprawy, leasing, ubezpieczenie, podatki…). Zasilają zysk floty. Import/eksport CSV i Excel."
      />

      {canManage && (
        <div style={styles.form}>
          <div style={styles.grid}>
            <label style={styles.field}>
              <span style={styles.label}>Pojazd</span>
              <select
                style={styles.input}
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registration}
                  </option>
                ))}
              </select>
            </label>
            <label style={styles.field}>
              <span style={styles.label}>Kategoria</span>
              <select
                style={styles.input}
                value={category}
                onChange={(e) => setCategory(e.target.value as VehicleCostCategory)}
              >
                {VEHICLE_COST_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {VEHICLE_COST_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div style={styles.grid}>
            <label style={styles.field}>
              <span style={styles.label}>Kwota</span>
              <input
                style={styles.input}
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="np. 1200"
              />
            </label>
            <label style={styles.field}>
              <span style={styles.label}>Waluta</span>
              <input
                style={{ ...styles.input, maxWidth: 120 }}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              />
            </label>
            <label style={styles.field}>
              <span style={styles.label}>Data</span>
              <input
                style={styles.input}
                type="date"
                value={costDate}
                onChange={(e) => setCostDate(e.target.value)}
              />
            </label>
          </div>
          <label style={styles.field}>
            <span style={styles.label}>Opis</span>
            <input
              style={styles.input}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="np. wymiana rozrządu"
            />
          </label>
          <div>
            <Button onClick={save}>Dodaj koszt</Button>
          </div>
        </div>
      )}

      {canManage && (
        <div style={{ marginTop: 16 }}>
          <DataImport
            columns={IMPORT_COLUMNS}
            validate={validateCostRow}
            onImport={importCosts}
            templateBase="koszty"
            onDone={load}
          />
          <p style={{ fontSize: 12, color: palette.smoke, marginTop: 6 }}>
            Kolumna „Pojazd" = rejestracja. „Kategoria": naprawa / leasing / ubezpieczenie / podatek
            / mandat / parking / opony / inne (lub klucze EN). Duplikaty (ten sam
            pojazd+kategoria+kwota+data+opis) są pomijane.
          </p>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Rejestr kosztów</h2>
        <span style={{ flex: 1 }} />
        {costs.length > 0 && (
          <>
            <Button variant="ghost" onClick={exportCsv}>
              ⬇️ CSV
            </Button>
            <Button variant="ghost" onClick={exportXlsx}>
              ⬇️ XLSX
            </Button>
          </>
        )}
      </div>

      <ListStatus
        loading={loading}
        error={loadErr}
        empty={costs.length === 0}
        emptyText="Brak kosztów — dodaj powyżej lub zaimportuj (albo dopisz koszt na karcie pojazdu)."
        onRetry={load}
      />
      {!loading && !loadErr && costs.length > 0 && (
        <DataTable
          urlKey="k"
          rows={costs}
          rowKey={(c) => c.id}
          searchText={(c) => [regOf(c.vehicle_id), catLabel(c.category), c.description].join(" ")}
          initialSort={{ key: "cost_date", dir: "desc" }}
          columns={cols}
        />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: f.formWrap,
  grid: f.grid,
  field: f.field,
  label: f.label,
  input: f.input,
};
