"use client";

import { getActiveMembership, insertVehicle } from "@e-logistic/api";
import { VEHICLE_TYPES, type VehicleInput, vehicleSchema } from "@e-logistic/core";
import { createTranslator } from "@e-logistic/i18n";
import { palette } from "@e-logistic/ui";
import { useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";

const t = createTranslator("pl");

export default function VehiclesPage() {
  const [list, setList] = useState<VehicleInput[]>([]);
  const [registration, setRegistration] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [vehicleType, setVehicleType] = useState<(typeof VEHICLE_TYPES)[number]>("tractor");
  const [heightCm, setHeightCm] = useState("");
  const [maxPayloadKg, setMaxPayloadKg] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string | null>(null);

  async function add() {
    setErrors({});
    setStatus(null);

    const candidate = {
      registration,
      model,
      year: Number(year),
      vehicleType,
      heightCm: heightCm ? Number(heightCm) : undefined,
      maxPayloadKg: maxPayloadKg ? Number(maxPayloadKg) : undefined,
    };

    const parsed = vehicleSchema.safeParse(candidate);
    if (!parsed.success) {
      const map: Record<string, string> = {};
      for (const issue of parsed.error.issues) map[issue.path.join(".")] = issue.message;
      setErrors(map);
      return;
    }

    setList((prev) => [parsed.data, ...prev]);
    setRegistration("");
    setModel("");
    setYear("");
    setHeightCm("");
    setMaxPayloadKg("");

    // Best-effort zapis do bazy (gdy skonfigurowane Supabase + sesja + firma).
    try {
      const supabase = getBrowserSupabase();
      const membership = await getActiveMembership(supabase);
      if (membership) {
        await insertVehicle(supabase, parsed.data, membership.companyId);
        setStatus("✅ Dodano i zapisano w bazie.");
      } else {
        setStatus("📥 Dodano lokalnie (utwórz firmę w panelu, by zapisać w bazie).");
      }
    } catch {
      setStatus("📥 Dodano lokalnie (skonfiguruj Supabase, by zapisać w bazie).");
    }
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>{t("nav.vehicles")}</h1>
      <p style={{ color: palette.smoke, marginTop: 4 }}>
        Dodawanie z walidacją <code>vehicleSchema</code> (współdzielony rdzeń).
      </p>

      <div style={styles.form}>
        <div style={{ display: "flex", gap: 12 }}>
          <label style={styles.field}>
            <span style={styles.label}>Rejestracja</span>
            <input
              style={styles.input}
              value={registration}
              onChange={(e) => setRegistration(e.target.value)}
              placeholder="WL5145U"
            />
            {errors.registration && <span style={styles.err}>{errors.registration}</span>}
          </label>
          <label style={styles.field}>
            <span style={styles.label}>Model</span>
            <input
              style={styles.input}
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Volvo FH"
            />
            {errors.model && <span style={styles.err}>{errors.model}</span>}
          </label>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <label style={styles.field}>
            <span style={styles.label}>Rocznik</span>
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

        <div style={{ display: "flex", gap: 12 }}>
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

        <button type="button" style={styles.primary} onClick={add}>
          {t("common.save")}
        </button>
        {status && <p style={{ color: palette.smoke, fontSize: 14 }}>{status}</p>}
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32 }}>Dodane w tej sesji</h2>
      {list.length === 0 ? (
        <p style={{ color: palette.smoke }}>Brak — dodaj pojazd powyżej.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          {list.map((v) => (
            <div key={`${v.registration}-${v.year}`} style={styles.row}>
              <strong style={{ minWidth: 110 }}>{v.registration}</strong>
              <span style={styles.cell}>{v.model}</span>
              <span style={styles.cell}>{v.year}</span>
              <span style={styles.cell}>{v.vehicleType}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: { display: "flex", flexDirection: "column", gap: 14, marginTop: 20, maxWidth: 520 },
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
    gap: 16,
    alignItems: "center",
    padding: "10px 16px",
    borderRadius: 10,
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
  },
  cell: { color: palette.smoke, fontSize: 14, minWidth: 90 },
};
