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
import { useT } from "@/components/LocaleProvider";
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
  const t = useT();
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
      setLoadErr(e instanceof Error ? e.message : t("costs.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

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
      toast(t("costs.selectVehicle"), "error");
      return;
    }
    const val = Number(amount);
    if (!Number.isFinite(val) || val < 0) {
      toast(t("costs.invalidAmount"), "error");
      return;
    }
    try {
      const sb = getBrowserSupabase();
      const m = await getCachedMembership(sb);
      if (!m) {
        toast(t("vehicles.noCompanyImport"), "error");
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
      toast(t("costs.added"), "success");
      setAmount("");
      setDescription("");
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : t("costs.saveError"), "error");
    }
  }

  async function remove(c: VehicleCost) {
    if (
      !(await confirm(
        `${t("costs.deleteConfirmPrefix")}${catLabel(c.category)} (${c.amount} ${c.currency})?`,
      ))
    )
      return;
    try {
      await deleteVehicleCost(getBrowserSupabase(), c.id);
      toast(t("costs.deleted"), "success");
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : t("costs.deleteError"), "error");
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
          errors: [t("vehicles.noCompanyImport")],
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
          if (errors.length < 8) errors.push(`${registration}: ${t("costs.importVehicleUnknown")}`);
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
            errors.push(`${registration} ${input.category}: ${t("costs.importDuplicate")}`);
          continue;
        }
        try {
          await insertVehicleCost(sb, { vehicleId: vehicleIdMapped, ...input }, m.companyId);
          existing.add(key);
          inserted++;
        } catch (e) {
          failed++;
          if (errors.length < 8) {
            errors.push(`${registration}: ${e instanceof Error ? e.message : t("common.error")}`);
          }
        }
      }
      return { inserted, failed, errors };
    },
    [vehicles, t],
  );

  const cols: Column<VehicleCost>[] = [
    {
      key: "vehicle",
      header: t("common.vehicle"),
      sort: (c) => regOf(c.vehicle_id),
      cell: (c) => regOf(c.vehicle_id),
    },
    {
      key: "category",
      header: t("costs.fieldCategory"),
      sort: (c) => c.category,
      cell: (c) => catLabel(c.category),
    },
    {
      key: "amount",
      header: t("form.field.amount"),
      align: "right",
      sort: (c) => c.amount,
      cell: (c) => `${c.amount} ${c.currency}`,
    },
    {
      key: "cost_date",
      header: t("common.date"),
      sort: (c) => c.cost_date,
      cell: (c) => c.cost_date,
    },
    { key: "description", header: t("costs.fieldDescription"), cell: (c) => c.description ?? "—" },
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
      <PageHeader title={t("nav.costs")} subtitle={t("costs.subtitle")} />

      {canManage && (
        <div style={styles.form}>
          <div style={styles.grid}>
            <label style={styles.field}>
              <span style={styles.label}>{t("common.vehicle")}</span>
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
              <span style={styles.label}>{t("costs.fieldCategory")}</span>
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
              <span style={styles.label}>{t("form.field.amount")}</span>
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
              <span style={styles.label}>{t("costs.fieldCurrency")}</span>
              <input
                style={{ ...styles.input, maxWidth: 120 }}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              />
            </label>
            <label style={styles.field}>
              <span style={styles.label}>{t("common.date")}</span>
              <input
                style={styles.input}
                type="date"
                value={costDate}
                onChange={(e) => setCostDate(e.target.value)}
              />
            </label>
          </div>
          <label style={styles.field}>
            <span style={styles.label}>{t("costs.fieldDescription")}</span>
            <input
              style={styles.input}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("costs.descriptionPlaceholder")}
            />
          </label>
          <div>
            <Button onClick={save}>{t("costs.add")}</Button>
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
            {t("costs.importNote")}
          </p>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{t("costs.registryHeading")}</h2>
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
        emptyText={t("costs.empty")}
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
