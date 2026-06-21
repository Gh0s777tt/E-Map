"use client";

import { getActiveMembership, insertVehicle, listVehicles } from "@e-logistic/api";
import {
  INSURERS,
  VEHICLE_MAKE_GROUPS,
  VEHICLE_TYPES,
  type VehicleInput,
  vehicleSchema,
} from "@e-logistic/core";
import { createTranslator } from "@e-logistic/i18n";
import { palette } from "@e-logistic/ui";
import { useCallback, useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";

type DbVehicle = {
  id: string;
  registration: string;
  make: string | null;
  model: string;
  vehicle_type: string;
  vin: string | null;
  curb_weight_kg: number | null;
  inspection_expiry: string | null;
  insurance_expiry: string | null;
  insurer: string | null;
};

const t = createTranslator("pl");
const OTHER = "__other__";

export default function VehiclesPage() {
  const [list, setList] = useState<VehicleInput[]>([]);
  const [registration, setRegistration] = useState("");
  const [make, setMake] = useState("");
  const [makeOther, setMakeOther] = useState("");
  const [model, setModel] = useState("");
  const [vin, setVin] = useState("");
  const [year, setYear] = useState("");
  const [vehicleType, setVehicleType] = useState<(typeof VEHICLE_TYPES)[number]>("tractor");
  const [curbWeightKg, setCurbWeightKg] = useState("");
  const [maxPayloadKg, setMaxPayloadKg] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [inspectionExpiry, setInspectionExpiry] = useState("");
  const [insuranceExpiry, setInsuranceExpiry] = useState("");
  const [insurer, setInsurer] = useState("");
  const [insurerOther, setInsurerOther] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [dbVehicles, setDbVehicles] = useState<DbVehicle[]>([]);

  const loadVehicles = useCallback(async () => {
    try {
      const supabase = getBrowserSupabase();
      const membership = await getActiveMembership(supabase);
      if (!membership) {
        setDbVehicles([]);
        return;
      }
      const vs = await listVehicles(supabase, membership.companyId);
      setDbVehicles(vs as DbVehicle[]);
    } catch {
      setDbVehicles([]);
    }
  }, []);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  function resetForm() {
    setRegistration("");
    setMake("");
    setMakeOther("");
    setModel("");
    setVin("");
    setYear("");
    setCurbWeightKg("");
    setMaxPayloadKg("");
    setHeightCm("");
    setInspectionExpiry("");
    setInsuranceExpiry("");
    setInsurer("");
    setInsurerOther("");
  }

  async function add() {
    setErrors({});
    setStatus(null);

    const resolvedMake = make === OTHER ? makeOther.trim() : make;
    const resolvedInsurer = insurer === OTHER ? insurerOther.trim() : insurer;

    const candidate = {
      registration,
      make: resolvedMake || undefined,
      model,
      vin: vin.trim() ? vin.trim().toUpperCase() : undefined,
      year: Number(year),
      vehicleType,
      curbWeightKg: curbWeightKg ? Number(curbWeightKg) : undefined,
      maxPayloadKg: maxPayloadKg ? Number(maxPayloadKg) : undefined,
      heightCm: heightCm ? Number(heightCm) : undefined,
      inspectionExpiry: inspectionExpiry || undefined,
      insuranceExpiry: insuranceExpiry || undefined,
      insurer: resolvedInsurer || undefined,
    };

    const parsed = vehicleSchema.safeParse(candidate);
    if (!parsed.success) {
      const map: Record<string, string> = {};
      for (const issue of parsed.error.issues) map[issue.path.join(".")] = issue.message;
      setErrors(map);
      return;
    }

    setList((prev) => [parsed.data, ...prev]);
    resetForm();

    try {
      const supabase = getBrowserSupabase();
      const membership = await getActiveMembership(supabase);
      if (membership) {
        await insertVehicle(supabase, parsed.data, membership.companyId);
        setStatus("✅ Dodano i zapisano w bazie.");
        await loadVehicles();
      } else {
        setStatus("📥 Dodano lokalnie (utwórz firmę w panelu, by zapisać w bazie).");
      }
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "📥 Dodano lokalnie (błąd zapisu w bazie).");
    }
  }

  return (
    <div style={{ maxWidth: 760 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>{t("nav.vehicles")}</h1>
      <p style={{ color: palette.smoke, marginTop: 4 }}>
        Marka z listy, VIN, waga własna (z dowodu), terminy przeglądu i OC z ubezpieczycielem.
      </p>

      <div style={styles.form}>
        <div style={styles.grid}>
          <label style={styles.field}>
            <span style={styles.label}>Rejestracja *</span>
            <input
              style={styles.input}
              value={registration}
              onChange={(e) => setRegistration(e.target.value)}
              placeholder="WL5145U"
            />
            {errors.registration && <span style={styles.err}>{errors.registration}</span>}
          </label>
          <label style={styles.field}>
            <span style={styles.label}>Marka</span>
            <select style={styles.input} value={make} onChange={(e) => setMake(e.target.value)}>
              <option value="">— wybierz —</option>
              {VEHICLE_MAKE_GROUPS.map((g) => (
                <optgroup key={g.group} label={g.group}>
                  {g.makes.map((m) => (
                    <option key={`${g.group}-${m}`} value={m}>
                      {m}
                    </option>
                  ))}
                </optgroup>
              ))}
              <option value={OTHER}>Inna…</option>
            </select>
            {make === OTHER && (
              <input
                style={{ ...styles.input, marginTop: 6 }}
                value={makeOther}
                onChange={(e) => setMakeOther(e.target.value)}
                placeholder="Wpisz markę"
              />
            )}
          </label>
        </div>

        <div style={styles.grid}>
          <label style={styles.field}>
            <span style={styles.label}>Model *</span>
            <input
              style={styles.input}
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="FH / Master / Actros"
            />
            {errors.model && <span style={styles.err}>{errors.model}</span>}
          </label>
          <label style={styles.field}>
            <span style={styles.label}>VIN</span>
            <input
              style={styles.input}
              value={vin}
              onChange={(e) => setVin(e.target.value)}
              placeholder="17 znaków (z dowodu)"
              maxLength={17}
            />
            {errors.vin && <span style={styles.err}>{errors.vin}</span>}
          </label>
        </div>

        <div style={styles.grid}>
          <label style={styles.field}>
            <span style={styles.label}>Rocznik *</span>
            <input
              style={styles.input}
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="2021"
            />
            {errors.year && <span style={styles.err}>{errors.year}</span>}
          </label>
          <label style={styles.field}>
            <span style={styles.label}>Typ</span>
            <select
              style={styles.input}
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value as (typeof VEHICLE_TYPES)[number])}
            >
              {VEHICLE_TYPES.map((vt) => (
                <option key={vt} value={vt}>
                  {vt}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div style={styles.grid}>
          <label style={styles.field}>
            <span style={styles.label}>Waga własna / na pusto (kg)</span>
            <input
              style={styles.input}
              type="number"
              value={curbWeightKg}
              onChange={(e) => setCurbWeightKg(e.target.value)}
              placeholder="np. 7500 (z dowodu)"
            />
            {errors.curbWeightKg && <span style={styles.err}>{errors.curbWeightKg}</span>}
          </label>
          <label style={styles.field}>
            <span style={styles.label}>Maks. ładunek (kg)</span>
            <input
              style={styles.input}
              type="number"
              value={maxPayloadKg}
              onChange={(e) => setMaxPayloadKg(e.target.value)}
              placeholder="24000"
            />
            {errors.maxPayloadKg && <span style={styles.err}>{errors.maxPayloadKg}</span>}
          </label>
        </div>

        <div style={styles.grid}>
          <label style={styles.field}>
            <span style={styles.label}>Przegląd ważny do</span>
            <input
              style={styles.input}
              type="date"
              value={inspectionExpiry}
              onChange={(e) => setInspectionExpiry(e.target.value)}
            />
            {errors.inspectionExpiry && <span style={styles.err}>{errors.inspectionExpiry}</span>}
          </label>
          <label style={styles.field}>
            <span style={styles.label}>Wysokość (cm)</span>
            <input
              style={styles.input}
              type="number"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              placeholder="400"
            />
            {errors.heightCm && <span style={styles.err}>{errors.heightCm}</span>}
          </label>
        </div>

        <div style={styles.grid}>
          <label style={styles.field}>
            <span style={styles.label}>OC ważne do</span>
            <input
              style={styles.input}
              type="date"
              value={insuranceExpiry}
              onChange={(e) => setInsuranceExpiry(e.target.value)}
            />
            {errors.insuranceExpiry && <span style={styles.err}>{errors.insuranceExpiry}</span>}
          </label>
          <label style={styles.field}>
            <span style={styles.label}>Ubezpieczyciel</span>
            <select
              style={styles.input}
              value={insurer}
              onChange={(e) => setInsurer(e.target.value)}
            >
              <option value="">— wybierz —</option>
              {INSURERS.map((ins) => (
                <option key={ins} value={ins}>
                  {ins}
                </option>
              ))}
              <option value={OTHER}>Inny…</option>
            </select>
            {insurer === OTHER && (
              <input
                style={{ ...styles.input, marginTop: 6 }}
                value={insurerOther}
                onChange={(e) => setInsurerOther(e.target.value)}
                placeholder="Wpisz ubezpieczyciela"
              />
            )}
          </label>
        </div>

        <button type="button" style={styles.primary} onClick={add}>
          {t("common.save")}
        </button>
        {status && <p style={{ color: palette.smoke, fontSize: 14 }}>{status}</p>}
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32 }}>Flota</h2>

      {dbVehicles.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          {dbVehicles.map((v) => (
            <div key={v.id} style={styles.row}>
              <strong style={{ minWidth: 110 }}>{v.registration}</strong>
              <span style={styles.cell}>{[v.make, v.model].filter(Boolean).join(" ")}</span>
              <span style={styles.cell}>{v.vehicle_type}</span>
              <span style={{ flex: 1 }} />
              <span style={styles.meta}>🔧 {v.inspection_expiry ?? "—"}</span>
              <span style={styles.meta}>🛡️ {v.insurance_expiry ?? "—"}</span>
              {v.insurer && <span style={styles.meta}>{v.insurer}</span>}
            </div>
          ))}
        </div>
      ) : list.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          {list.map((v) => (
            <div key={`${v.registration}-${v.year}`} style={styles.row}>
              <strong style={{ minWidth: 110 }}>{v.registration}</strong>
              <span style={styles.cell}>{[v.make, v.model].filter(Boolean).join(" ")}</span>
              <span style={styles.cell}>{v.year}</span>
              <span style={{ ...styles.cell, color: palette.warning }}>lokalnie</span>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ color: palette.smoke }}>Brak pojazdów — dodaj powyżej.</p>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: { display: "flex", flexDirection: "column", gap: 14, marginTop: 20, maxWidth: 560 },
  grid: { display: "flex", gap: 12 },
  field: { display: "flex", flexDirection: "column", gap: 4, flex: 1 },
  label: { fontSize: 12, color: palette.smoke },
  err: { color: palette.red, fontSize: 12 },
  input: {
    background: palette.black,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
    padding: "10px 12px",
    color: palette.offWhite,
    width: "100%",
  },
  primary: {
    marginTop: 8,
    background: palette.red,
    color: palette.white,
    border: "none",
    borderRadius: 8,
    padding: "12px",
    fontWeight: 700,
    cursor: "pointer",
    alignSelf: "flex-start",
    minWidth: 160,
  },
  row: {
    display: "flex",
    gap: 14,
    alignItems: "center",
    padding: "10px 16px",
    borderRadius: 10,
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
  },
  cell: { color: palette.smoke, fontSize: 14, minWidth: 90 },
  meta: { color: palette.smoke, fontSize: 12 },
};
