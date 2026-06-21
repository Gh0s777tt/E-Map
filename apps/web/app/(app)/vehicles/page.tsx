"use client";

import {
  deleteVehicle,
  insertVehicle,
  listFuelCardsByVehicle,
  listVehicles,
  updateVehicle,
} from "@e-logistic/api";
import {
  FUEL_CARD_PROVIDER_LABELS,
  type FuelCardProvider,
  INSURERS,
  VEHICLE_MAKE_GROUPS,
  VEHICLE_TYPES,
  vehicleSchema,
} from "@e-logistic/core";
import { createTranslator } from "@e-logistic/i18n";
import { palette } from "@e-logistic/ui";
import { useCallback, useEffect, useState } from "react";
import { useConfirm } from "@/components/ConfirmProvider";
import { ListStatus } from "@/components/ListStatus";
import { PageHeader } from "@/components/ui";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";

type DbVehicle = {
  id: string;
  registration: string;
  make: string | null;
  model: string;
  vehicle_type: string;
  vin: string | null;
  curb_weight_kg: number | null;
  max_payload_kg: number | null;
  fuel_tank_l: number | null;
  adblue_tank_l: number | null;
  height_cm: number | null;
  inspection_expiry: string | null;
  insurance_expiry: string | null;
  insurer: string | null;
  license_number: string | null;
  leasing_end: string | null;
  year: number | null;
};
type CardRow = {
  id: string;
  provider: string;
  card_number_masked: string;
  discount_percent: number;
};

const t = createTranslator("pl");
const OTHER = "__other__";
const ALL_MAKES = VEHICLE_MAKE_GROUPS.flatMap((g) => g.makes);
const providerLabel = (p: string) =>
  FUEL_CARD_PROVIDER_LABELS[p as FuelCardProvider] ?? p.toUpperCase();

export default function VehiclesPage() {
  const confirm = useConfirm();
  const [dbVehicles, setDbVehicles] = useState<DbVehicle[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [vehicleCards, setVehicleCards] = useState<Record<string, CardRow[]>>({});

  const [registration, setRegistration] = useState("");
  const [make, setMake] = useState("");
  const [makeOther, setMakeOther] = useState("");
  const [model, setModel] = useState("");
  const [vin, setVin] = useState("");
  const [year, setYear] = useState("");
  const [vehicleType, setVehicleType] = useState<(typeof VEHICLE_TYPES)[number]>("tractor");
  const [curbWeightKg, setCurbWeightKg] = useState("");
  const [maxPayloadKg, setMaxPayloadKg] = useState("");
  const [fuelTankL, setFuelTankL] = useState("");
  const [adblueTankL, setAdblueTankL] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [inspectionExpiry, setInspectionExpiry] = useState("");
  const [insuranceExpiry, setInsuranceExpiry] = useState("");
  const [insurer, setInsurer] = useState("");
  const [insurerOther, setInsurerOther] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string | null>(null);

  const loadVehicles = useCallback(async () => {
    setLoading(true);
    setLoadErr(null);
    try {
      const supabase = getBrowserSupabase();
      const membership = await getCachedMembership(supabase);
      if (!membership) {
        setDbVehicles([]);
        return;
      }
      setCanManage(membership.role === "owner" || membership.role === "dispatcher");
      const vs = await listVehicles(supabase, membership.companyId);
      setDbVehicles(vs as DbVehicle[]);
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Nie udało się pobrać floty.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  function resetForm() {
    setEditingId(null);
    setRegistration("");
    setMake("");
    setMakeOther("");
    setModel("");
    setVin("");
    setYear("");
    setVehicleType("tractor");
    setCurbWeightKg("");
    setMaxPayloadKg("");
    setFuelTankL("");
    setAdblueTankL("");
    setHeightCm("");
    setInspectionExpiry("");
    setInsuranceExpiry("");
    setInsurer("");
    setInsurerOther("");
    setLicenseNumber("");
    setErrors({});
  }

  function pickListValue(
    val: string | null,
    list: string[],
    setSel: (s: string) => void,
    setOther: (s: string) => void,
  ) {
    if (!val) {
      setSel("");
      setOther("");
    } else if (list.includes(val)) {
      setSel(val);
      setOther("");
    } else {
      setSel(OTHER);
      setOther(val);
    }
  }

  function startEdit(v: DbVehicle) {
    setEditingId(v.id);
    setRegistration(v.registration);
    pickListValue(v.make, ALL_MAKES, setMake, setMakeOther);
    setModel(v.model);
    setVin(v.vin ?? "");
    setYear(v.year ? String(v.year) : "");
    setVehicleType(
      (VEHICLE_TYPES as readonly string[]).includes(v.vehicle_type)
        ? (v.vehicle_type as (typeof VEHICLE_TYPES)[number])
        : "other",
    );
    setCurbWeightKg(v.curb_weight_kg ? String(v.curb_weight_kg) : "");
    setMaxPayloadKg(v.max_payload_kg ? String(v.max_payload_kg) : "");
    setFuelTankL(v.fuel_tank_l ? String(v.fuel_tank_l) : "");
    setAdblueTankL(v.adblue_tank_l ? String(v.adblue_tank_l) : "");
    setHeightCm(v.height_cm ? String(v.height_cm) : "");
    setInspectionExpiry(v.inspection_expiry ?? "");
    setInsuranceExpiry(v.insurance_expiry ?? "");
    pickListValue(v.insurer, INSURERS as unknown as string[], setInsurer, setInsurerOther);
    setLicenseNumber(v.license_number ?? "");
    setErrors({});
    setStatus(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!vehicleCards[id]) {
      try {
        const cs = await listFuelCardsByVehicle(getBrowserSupabase(), id);
        setVehicleCards((m) => ({ ...m, [id]: cs as CardRow[] }));
      } catch {
        setVehicleCards((m) => ({ ...m, [id]: [] }));
      }
    }
  }

  async function save() {
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
      fuelTankL: fuelTankL ? Number(fuelTankL) : undefined,
      adblueTankL: adblueTankL ? Number(adblueTankL) : undefined,
      heightCm: heightCm ? Number(heightCm) : undefined,
      inspectionExpiry: inspectionExpiry || undefined,
      insuranceExpiry: insuranceExpiry || undefined,
      insurer: resolvedInsurer || undefined,
      licenseNumber: licenseNumber.trim() || undefined,
    };

    const parsed = vehicleSchema.safeParse(candidate);
    if (!parsed.success) {
      const map: Record<string, string> = {};
      for (const issue of parsed.error.issues) map[issue.path.join(".")] = issue.message;
      setErrors(map);
      return;
    }

    try {
      const supabase = getBrowserSupabase();
      const membership = await getCachedMembership(supabase);
      if (!membership) {
        setStatus("📥 Brak firmy — utwórz firmę w panelu, by zapisać w bazie.");
        return;
      }
      if (editingId) {
        await updateVehicle(supabase, editingId, parsed.data, membership.companyId);
        setStatus("✅ Zmiany zapisane.");
      } else {
        await insertVehicle(supabase, parsed.data, membership.companyId);
        setStatus("✅ Dodano pojazd.");
      }
      resetForm();
      await loadVehicles();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Błąd zapisu pojazdu.");
    }
  }

  async function removeVehicle(v: DbVehicle) {
    if (
      !(await confirm(
        `Usunąć pojazd ${v.registration}? Usunie też powiązane wpisy paliwa/AdBlue/trasy. Tej operacji nie można cofnąć.`,
      ))
    )
      return;
    try {
      await deleteVehicle(getBrowserSupabase(), v.id);
      if (editingId === v.id) resetForm();
      setStatus("🗑️ Pojazd usunięty.");
      await loadVehicles();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Błąd usuwania pojazdu.");
    }
  }

  return (
    <div style={{ maxWidth: 820 }}>
      <PageHeader
        title={t("nav.vehicles")}
        subtitle="Dodawaj, edytuj i usuwaj pojazdy. Kliknij auto na liście, by zobaczyć szczegóły i przypisane karty."
      />

      {canManage && (
        <div style={styles.form}>
          {editingId && (
            <div style={{ fontSize: 13, color: palette.red, fontWeight: 700 }}>
              ✏️ Edytujesz pojazd.
            </div>
          )}
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
            </label>
          </div>

          <div style={styles.grid}>
            <label style={styles.field}>
              <span style={styles.label}>Zbiornik paliwa (L)</span>
              <input
                style={styles.input}
                type="number"
                value={fuelTankL}
                onChange={(e) => setFuelTankL(e.target.value)}
                placeholder="np. 600"
              />
            </label>
            <label style={styles.field}>
              <span style={styles.label}>Zbiornik AdBlue (L)</span>
              <input
                style={styles.input}
                type="number"
                value={adblueTankL}
                onChange={(e) => setAdblueTankL(e.target.value)}
                placeholder="np. 60"
              />
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

          <label style={styles.field}>
            <span style={styles.label}>Numer licencji (przypisanej do auta)</span>
            <input
              style={styles.input}
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              placeholder="np. GITD / licencja wspólnotowa"
            />
          </label>

          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" style={styles.primary} onClick={save}>
              {editingId ? "Zapisz zmiany" : t("common.save")}
            </button>
            {editingId && (
              <button type="button" style={styles.ghost} onClick={resetForm}>
                Anuluj
              </button>
            )}
          </div>
          {status && <p style={{ color: palette.smoke, fontSize: 14 }}>{status}</p>}
        </div>
      )}

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32 }}>Flota</h2>

      <ListStatus
        loading={loading}
        error={loadErr}
        empty={dbVehicles.length === 0}
        emptyText="Brak pojazdów — dodaj powyżej."
        onRetry={loadVehicles}
      />
      {!loading && !loadErr && dbVehicles.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          {dbVehicles.map((v) => {
            const open = expandedId === v.id;
            const cards = vehicleCards[v.id] ?? [];
            return (
              <div key={v.id} style={styles.card}>
                <div style={styles.row}>
                  <button
                    type="button"
                    style={styles.expandBtn}
                    onClick={() => toggleExpand(v.id)}
                    aria-label="Szczegóły"
                  >
                    {open ? "▾" : "▸"}
                  </button>
                  <strong style={{ minWidth: 110 }}>{v.registration}</strong>
                  <span style={styles.cell}>{[v.make, v.model].filter(Boolean).join(" ")}</span>
                  <span style={styles.cell}>{v.vehicle_type}</span>
                  <span style={{ flex: 1 }} />
                  <span style={styles.meta}>🔧 {v.inspection_expiry ?? "—"}</span>
                  <span style={styles.meta}>🛡️ {v.insurance_expiry ?? "—"}</span>
                  {canManage && (
                    <>
                      <button type="button" style={styles.ghost} onClick={() => startEdit(v)}>
                        ✏️
                      </button>
                      <button type="button" style={styles.danger} onClick={() => removeVehicle(v)}>
                        🗑️
                      </button>
                    </>
                  )}
                </div>

                {open && (
                  <div style={styles.details}>
                    <div style={styles.detailGrid}>
                      <Detail k="VIN" v={v.vin} />
                      <Detail k="Rocznik" v={v.year ? String(v.year) : null} />
                      <Detail
                        k="Waga na pusto"
                        v={v.curb_weight_kg ? `${v.curb_weight_kg} kg` : null}
                      />
                      <Detail
                        k="Maks. ładunek"
                        v={v.max_payload_kg ? `${v.max_payload_kg} kg` : null}
                      />
                      <Detail k="Zbiornik paliwa" v={v.fuel_tank_l ? `${v.fuel_tank_l} L` : null} />
                      <Detail
                        k="Zbiornik AdBlue"
                        v={v.adblue_tank_l ? `${v.adblue_tank_l} L` : null}
                      />
                      <Detail k="Wysokość" v={v.height_cm ? `${v.height_cm} cm` : null} />
                      <Detail k="Ubezpieczyciel" v={v.insurer} />
                      <Detail k="Licencja" v={v.license_number} />
                      <Detail k="Leasing do" v={v.leasing_end} />
                    </div>

                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontSize: 13, color: palette.smoke, marginBottom: 6 }}>
                        Karty przypisane do pojazdu:
                      </div>
                      {cards.length === 0 ? (
                        <div style={{ fontSize: 13, color: palette.smoke }}>
                          Brak — przypisz w zakładce „Karty".
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {cards.map((c) => (
                            <span key={c.id} style={styles.cardTag}>
                              💳 {providerLabel(c.provider)} {c.card_number_masked} ·{" "}
                              {c.discount_percent}%
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Detail({ k, v }: { k: string; v: string | null }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <span style={{ fontSize: 11, color: palette.smoke }}>{k}</span>
      <span style={{ fontSize: 14 }}>{v ?? "—"}</span>
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
    minWidth: 160,
  },
  card: {
    borderRadius: 10,
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    overflow: "hidden",
  },
  row: { display: "flex", gap: 12, alignItems: "center", padding: "10px 14px" },
  expandBtn: {
    background: "transparent",
    color: palette.smoke,
    border: "none",
    cursor: "pointer",
    fontSize: 14,
    width: 18,
  },
  cell: { color: palette.smoke, fontSize: 14, minWidth: 90 },
  meta: { color: palette.smoke, fontSize: 12 },
  ghost: {
    background: "transparent",
    color: palette.offWhite,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
    padding: "6px 10px",
    cursor: "pointer",
  },
  danger: {
    background: "transparent",
    color: palette.red,
    border: `1px solid ${palette.red}`,
    borderRadius: 8,
    padding: "6px 10px",
    cursor: "pointer",
  },
  details: {
    padding: "12px 16px 16px",
    borderTop: `1px solid ${palette.graphite}`,
    background: palette.black,
  },
  detailGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 },
  cardTag: {
    color: palette.offWhite,
    fontSize: 13,
    background: palette.coal,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
    padding: "4px 10px",
  },
};
