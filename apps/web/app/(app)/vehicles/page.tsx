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
  firstZodError,
  INSURERS,
  TRAILER_TYPES,
  VEHICLE_MAKE_GROUPS,
  VEHICLE_TYPES,
  type VehicleInput,
  vehicleSchema,
  zodFieldErrors,
} from "@e-logistic/core";
import { cssPalette as palette } from "@e-logistic/ui";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useConfirm } from "@/components/ConfirmProvider";
import { DataImport, type ImportColumn } from "@/components/DataImport";
import * as f from "@/components/formStyles";
import { ListStatus } from "@/components/ListStatus";
import { useT } from "@/components/LocaleProvider";
import { useToast } from "@/components/Toast";
import { Button, PageHeader } from "@/components/ui";
import { csvDateStamp, downloadCsv } from "@/lib/csv";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { downloadXlsx } from "@/lib/xlsx";

// Intersekcja z naczepą (#250): kolumny dochodzą migracją 0055 — opcjonalne, więc `listVehicles`
// (Row bez naczepy przed gen:types) nadal przypisuje się do DbVehicle[].
type DbVehicle = Awaited<ReturnType<typeof listVehicles>>[number] & {
  trailer_registration?: string | null;
  trailer_type?: string | null;
};
type CardRow = {
  id: string;
  provider: string;
  card_number_masked: string;
  discount_percent: number;
};

const OTHER = "__other__";
const ALL_MAKES = VEHICLE_MAKE_GROUPS.flatMap((g) => g.makes);
const providerLabel = (p: string) =>
  FUEL_CARD_PROVIDER_LABELS[p as FuelCardProvider] ?? p.toUpperCase();

/** Kolumny importu pojazdów (elastyczne nagłówki). */
const IMPORT_COLUMNS: ImportColumn[] = [
  {
    key: "registration",
    label: "Rejestracja",
    aliases: ["nr rej", "registration", "plate"],
    required: true,
  },
  { key: "make", label: "Marka", aliases: ["make", "brand"] },
  { key: "model", label: "Model", aliases: ["model"], required: true },
  { key: "vehicleType", label: "Typ", aliases: ["type", "rodzaj"], required: true },
  { key: "vin", label: "VIN", aliases: ["vin"] },
  { key: "year", label: "Rok", aliases: ["year"], required: true },
  {
    key: "inspectionExpiry",
    label: "Przegląd",
    aliases: ["przeglad", "inspection", "badanie techniczne"],
  },
  { key: "insuranceExpiry", label: "OC", aliases: ["ubezpieczenie", "insurance"] },
  { key: "leasingEnd", label: "Leasing", aliases: ["leasing"] },
  { key: "insurer", label: "Ubezpieczyciel", aliases: ["insurer", "towarzystwo"] },
  { key: "maxPayloadKg", label: "Ładowność kg", aliases: ["ladownosc", "payload", "max payload"] },
  { key: "heightCm", label: "Wysokość cm", aliases: ["wysokosc", "height"] },
  { key: "widthCm", label: "Szerokość cm", aliases: ["szerokosc", "width"] },
  { key: "lengthCm", label: "Długość cm", aliases: ["dlugosc", "length"] },
  { key: "forwarder", label: "Spedycja", aliases: ["forwarder"] },
  {
    key: "trailerRegistration",
    label: "Naczepa rej.",
    aliases: ["naczepa", "trailer", "przyczepa", "rej naczepy"],
  },
  { key: "trailerType", label: "Typ naczepy", aliases: ["typ naczepy", "trailer type"] },
  { key: "comment", label: "Uwagi", aliases: ["komentarz", "comment", "notes"] },
];

const VEHICLE_TYPE_ALIASES: Record<string, (typeof VEHICLE_TYPES)[number]> = {
  truck: "truck",
  ciężarówka: "truck",
  ciezarowka: "truck",
  tractor: "tractor",
  ciągnik: "tractor",
  ciagnik: "tractor",
  siodłowy: "tractor",
  siodlowy: "tractor",
  van: "van",
  dostawczy: "van",
  bus: "van",
  furgon: "van",
  trailer: "trailer",
  naczepa: "trailer",
  przyczepa: "trailer",
  other: "other",
  inny: "other",
  inne: "other",
};

function toNum(s: string | undefined): number | undefined {
  const t = (s ?? "").trim().replace(/\s/g, "").replace(",", ".");
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

function validateVehicleRow(
  rec: Record<string, string>,
): { ok: true; value: VehicleInput } | { ok: false; error: string } {
  const typeRaw = (rec.vehicleType ?? "").trim().toLowerCase();
  const candidate = {
    registration: (rec.registration ?? "").trim(),
    make: (rec.make ?? "").trim() || undefined,
    model: (rec.model ?? "").trim(),
    vehicleType: VEHICLE_TYPE_ALIASES[typeRaw] ?? typeRaw,
    vin: (rec.vin ?? "").trim() || undefined,
    year: toNum(rec.year),
    inspectionExpiry: (rec.inspectionExpiry ?? "").trim() || undefined,
    insuranceExpiry: (rec.insuranceExpiry ?? "").trim() || undefined,
    leasingEnd: (rec.leasingEnd ?? "").trim() || undefined,
    insurer: (rec.insurer ?? "").trim() || undefined,
    maxPayloadKg: toNum(rec.maxPayloadKg),
    heightCm: toNum(rec.heightCm),
    widthCm: toNum(rec.widthCm),
    lengthCm: toNum(rec.lengthCm),
    forwarder: (rec.forwarder ?? "").trim() || undefined,
    trailerRegistration: (rec.trailerRegistration ?? "").trim() || undefined,
    trailerType: (rec.trailerType ?? "").trim() || undefined,
    comment: (rec.comment ?? "").trim() || undefined,
  };
  const parsed = vehicleSchema.safeParse(candidate);
  if (!parsed.success) return { ok: false, error: firstZodError(parsed.error) };
  return { ok: true, value: parsed.data };
}

export default function VehiclesPage() {
  const confirm = useConfirm();
  const toast = useToast();
  const t = useT();
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
  const [licenseExpiry, setLicenseExpiry] = useState("");
  const [insurer, setInsurer] = useState("");
  const [insurerOther, setInsurerOther] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  // #250: naczepa (jeśli auto ją posiada).
  const [trailerRegistration, setTrailerRegistration] = useState("");
  const [trailerType, setTrailerType] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

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
      setDbVehicles(vs);
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
    setLicenseExpiry("");
    setInsurer("");
    setInsurerOther("");
    setLicenseNumber("");
    setTrailerRegistration("");
    setTrailerType("");
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
    setLicenseExpiry(v.license_expiry ?? "");
    pickListValue(v.insurer, INSURERS as unknown as string[], setInsurer, setInsurerOther);
    setLicenseNumber(v.license_number ?? "");
    setTrailerRegistration(v.trailer_registration ?? "");
    setTrailerType(v.trailer_type ?? "");
    setErrors({});
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
      licenseExpiry: licenseExpiry || undefined,
      insurer: resolvedInsurer || undefined,
      licenseNumber: licenseNumber.trim() || undefined,
      trailerRegistration: trailerRegistration.trim() || undefined,
      trailerType: trailerType.trim() || undefined,
    };

    const parsed = vehicleSchema.safeParse(candidate);
    if (!parsed.success) {
      const map = zodFieldErrors(parsed.error);
      setErrors(map);
      return;
    }

    try {
      const supabase = getBrowserSupabase();
      const membership = await getCachedMembership(supabase);
      if (!membership) {
        toast("Brak firmy — utwórz firmę w panelu, by zapisać w bazie.", "error");
        return;
      }
      if (editingId) {
        await updateVehicle(supabase, editingId, parsed.data, membership.companyId);
        toast("Zmiany zapisane.", "success");
      } else {
        await insertVehicle(supabase, parsed.data, membership.companyId);
        toast("Dodano pojazd.", "success");
      }
      resetForm();
      await loadVehicles();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Błąd zapisu pojazdu.", "error");
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
      toast("Pojazd usunięty.", "success");
      await loadVehicles();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Błąd usuwania pojazdu.", "error");
    }
  }

  function exportCsv() {
    const headers = [
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
      "Naczepa",
      "Typ naczepy",
    ];
    const rows = dbVehicles.map((v) => [
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
      v.trailer_registration ?? "",
      v.trailer_type ?? "",
    ]);
    downloadCsv(`pojazdy_${csvDateStamp()}.csv`, headers, rows);
  }

  async function exportXlsx() {
    const headers = [
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
      "Naczepa",
      "Typ naczepy",
    ];
    const rows = dbVehicles.map((v) => [
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
      v.trailer_registration ?? "",
      v.trailer_type ?? "",
    ]);
    await downloadXlsx(`pojazdy_${csvDateStamp()}.xlsx`, headers, rows);
  }

  const importVehicles = useCallback(async (values: VehicleInput[]) => {
    const supabase = getBrowserSupabase();
    const membership = await getCachedMembership(supabase);
    if (!membership) {
      return {
        inserted: 0,
        failed: values.length,
        errors: ["Brak firmy — utwórz ją na Pulpicie."],
      };
    }
    // Dedup po rejestracji (insertVehicle nie jest upsertem) — ponowny import nie duplikuje.
    const existing = new Set(
      (await listVehicles(supabase, membership.companyId)).map((v) => v.registration.toUpperCase()),
    );
    let inserted = 0;
    let failed = 0;
    const errors: string[] = [];
    for (const v of values) {
      const key = v.registration.toUpperCase();
      if (existing.has(key)) {
        failed++;
        if (errors.length < 8) errors.push(`${v.registration}: pojazd już istnieje (pominięto)`);
        continue;
      }
      try {
        await insertVehicle(supabase, v, membership.companyId);
        existing.add(key);
        inserted++;
      } catch (e) {
        failed++;
        if (errors.length < 8) {
          errors.push(`${v.registration}: ${e instanceof Error ? e.message : "błąd"}`);
        }
      }
    }
    return { inserted, failed, errors };
  }, []);

  return (
    <div style={{ maxWidth: 820 }}>
      <PageHeader
        title={t("nav.vehicles")}
        subtitle="Dodawaj, edytuj i usuwaj pojazdy. Kliknij auto na liście, by zobaczyć szczegóły i przypisane karty."
      />

      {canManage && (
        <div style={f.formWrap}>
          {editingId && (
            <div style={{ fontSize: 13, color: palette.red, fontWeight: 700 }}>
              ✏️ Edytujesz pojazd.
            </div>
          )}
          <div style={f.grid}>
            <label style={f.field}>
              <span style={f.label}>Rejestracja *</span>
              <input
                style={f.input}
                value={registration}
                onChange={(e) => setRegistration(e.target.value)}
                placeholder="WL5145U"
              />
              {errors.registration && <span style={styles.err}>{errors.registration}</span>}
            </label>
            <label style={f.field}>
              <span style={f.label}>Marka</span>
              <select style={f.input} value={make} onChange={(e) => setMake(e.target.value)}>
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
                  style={{ ...f.input, marginTop: 6 }}
                  value={makeOther}
                  onChange={(e) => setMakeOther(e.target.value)}
                  placeholder="Wpisz markę"
                />
              )}
            </label>
          </div>

          <div style={f.grid}>
            <label style={f.field}>
              <span style={f.label}>Model *</span>
              <input
                style={f.input}
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="FH / Master / Actros"
              />
              {errors.model && <span style={styles.err}>{errors.model}</span>}
            </label>
            <label style={f.field}>
              <span style={f.label}>VIN</span>
              <input
                style={f.input}
                value={vin}
                onChange={(e) => setVin(e.target.value)}
                placeholder="17 znaków (z dowodu)"
                maxLength={17}
              />
              {errors.vin && <span style={styles.err}>{errors.vin}</span>}
            </label>
          </div>

          <div style={f.grid}>
            <label style={f.field}>
              <span style={f.label}>Rocznik *</span>
              <input
                style={f.input}
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="2021"
              />
              {errors.year && <span style={styles.err}>{errors.year}</span>}
            </label>
            <label style={f.field}>
              <span style={f.label}>Typ</span>
              <select
                style={f.input}
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

          <div style={f.grid}>
            <label style={f.field}>
              <span style={f.label}>Waga własna / na pusto (kg)</span>
              <input
                style={f.input}
                type="number"
                value={curbWeightKg}
                onChange={(e) => setCurbWeightKg(e.target.value)}
                placeholder="np. 7500 (z dowodu)"
              />
            </label>
            <label style={f.field}>
              <span style={f.label}>Maks. ładunek (kg)</span>
              <input
                style={f.input}
                type="number"
                value={maxPayloadKg}
                onChange={(e) => setMaxPayloadKg(e.target.value)}
                placeholder="24000"
              />
            </label>
          </div>

          <div style={f.grid}>
            <label style={f.field}>
              <span style={f.label}>Zbiornik paliwa (L)</span>
              <input
                style={f.input}
                type="number"
                value={fuelTankL}
                onChange={(e) => setFuelTankL(e.target.value)}
                placeholder="np. 600"
              />
            </label>
            <label style={f.field}>
              <span style={f.label}>Zbiornik AdBlue (L)</span>
              <input
                style={f.input}
                type="number"
                value={adblueTankL}
                onChange={(e) => setAdblueTankL(e.target.value)}
                placeholder="np. 60"
              />
            </label>
          </div>

          <div style={f.grid}>
            <label style={f.field}>
              <span style={f.label}>Przegląd ważny do</span>
              <input
                style={f.input}
                type="date"
                value={inspectionExpiry}
                onChange={(e) => setInspectionExpiry(e.target.value)}
              />
            </label>
            <label style={f.field}>
              <span style={f.label}>Wysokość (cm)</span>
              <input
                style={f.input}
                type="number"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                placeholder="400"
              />
            </label>
          </div>

          <div style={f.grid}>
            <label style={f.field}>
              <span style={f.label}>OC ważne do</span>
              <input
                style={f.input}
                type="date"
                value={insuranceExpiry}
                onChange={(e) => setInsuranceExpiry(e.target.value)}
              />
            </label>
            <label style={f.field}>
              <span style={f.label}>Licencja transportowa ważna do</span>
              <input
                style={f.input}
                type="date"
                value={licenseExpiry}
                onChange={(e) => setLicenseExpiry(e.target.value)}
              />
            </label>
            <label style={f.field}>
              <span style={f.label}>Ubezpieczyciel</span>
              <select style={f.input} value={insurer} onChange={(e) => setInsurer(e.target.value)}>
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
                  style={{ ...f.input, marginTop: 6 }}
                  value={insurerOther}
                  onChange={(e) => setInsurerOther(e.target.value)}
                  placeholder="Wpisz ubezpieczyciela"
                />
              )}
            </label>
          </div>

          <label style={f.field}>
            <span style={f.label}>Numer licencji (przypisanej do auta)</span>
            <input
              style={f.input}
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              placeholder="np. GITD / licencja wspólnotowa"
            />
          </label>

          {/* #250: naczepa — dla ciągnika/ciężarówki (jeśli auto ją posiada). */}
          {(vehicleType === "tractor" || vehicleType === "truck") && (
            <div style={f.grid}>
              <label style={f.field}>
                <span style={f.label}>Naczepa — rejestracja</span>
                <input
                  style={f.input}
                  value={trailerRegistration}
                  onChange={(e) => setTrailerRegistration(e.target.value)}
                  placeholder="np. WPR1234 (jeśli posiada)"
                />
              </label>
              <label style={f.field}>
                <span style={f.label}>Naczepa — typ</span>
                <input
                  style={f.input}
                  value={trailerType}
                  onChange={(e) => setTrailerType(e.target.value)}
                  placeholder="Plandeka / Chłodnia…"
                  list="trailer-types-dl"
                />
                <datalist id="trailer-types-dl">
                  {TRAILER_TYPES.map((tt) => (
                    <option key={tt} value={tt} />
                  ))}
                </datalist>
              </label>
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <Button onClick={save}>{editingId ? "Zapisz zmiany" : t("common.save")}</Button>
            {editingId && (
              <Button variant="ghost" onClick={resetForm}>
                Anuluj
              </Button>
            )}
          </div>
        </div>
      )}

      {canManage && (
        <div style={{ marginTop: 16 }}>
          <DataImport
            columns={IMPORT_COLUMNS}
            validate={validateVehicleRow}
            onImport={importVehicles}
            templateBase="pojazdy"
            onDone={loadVehicles}
          />
          <p style={{ fontSize: 12, color: palette.smoke, marginTop: 6 }}>
            Kolumna „Typ": truck / tractor / van / trailer / other (lub po polsku: ciężarówka /
            ciągnik / dostawczy / naczepa / inny). Wymagane: Rejestracja, Model, Typ, Rok.
          </p>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Flota</h2>
        <span style={{ flex: 1 }} />
        {dbVehicles.length > 0 && (
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
        empty={dbVehicles.length === 0}
        emptyText="Brak pojazdów — dodaj powyżej."
        emptyIcon="truck"
        onRetry={loadVehicles}
      />
      {!loading && !loadErr && dbVehicles.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          {dbVehicles.map((v) => {
            const open = expandedId === v.id;
            const cards = vehicleCards[v.id] ?? [];
            return (
              <div key={v.id} style={f.card}>
                <div style={f.listRow}>
                  <button
                    type="button"
                    style={styles.expandBtn}
                    onClick={() => toggleExpand(v.id)}
                    aria-label="Szczegóły"
                  >
                    {open ? "▾" : "▸"}
                  </button>
                  <strong style={{ minWidth: 110 }}>{v.registration}</strong>
                  <span style={f.cell}>{[v.make, v.model].filter(Boolean).join(" ")}</span>
                  <span style={f.cell}>{v.vehicle_type}</span>
                  {v.trailer_registration && (
                    <span
                      style={f.meta}
                      title={`Naczepa${v.trailer_type ? ` · ${v.trailer_type}` : ""}`}
                    >
                      🛻 {v.trailer_registration}
                    </span>
                  )}
                  <span style={{ flex: 1 }} />
                  <span style={f.meta}>🔧 {v.inspection_expiry ?? "—"}</span>
                  <span style={f.meta}>🛡️ {v.insurance_expiry ?? "—"}</span>
                  <Link href={`/vehicles/${v.id}`} className="app-navlink" style={styles.cardLink}>
                    📇 Karta
                  </Link>
                  {canManage && (
                    <>
                      <Button variant="ghost" onClick={() => startEdit(v)}>
                        ✏️
                      </Button>
                      <Button variant="danger" onClick={() => removeVehicle(v)}>
                        🗑️
                      </Button>
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
                      <Detail
                        k="Naczepa"
                        v={
                          v.trailer_registration
                            ? `${v.trailer_registration}${v.trailer_type ? ` · ${v.trailer_type}` : ""}`
                            : null
                        }
                      />
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
  err: { color: palette.red, fontSize: 12 },
  expandBtn: {
    background: "transparent",
    color: palette.smoke,
    border: "none",
    cursor: "pointer",
    fontSize: 14,
    width: 18,
  },
  cardLink: {
    fontSize: 13,
    padding: "9px 12px",
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
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
