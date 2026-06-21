"use client";

import {
  deleteDriver,
  getActiveMembership,
  insertDriver,
  listDrivers,
  updateDriver,
} from "@e-logistic/api";
import { DRIVER_QUALIFICATIONS, driverSchema, LICENSE_CATEGORIES } from "@e-logistic/core";
import { palette } from "@e-logistic/ui";
import { useCallback, useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";

type Driver = {
  id: string;
  first_name: string;
  last_name: string;
  birth_date: string | null;
  license_number: string | null;
  id_card_number: string | null;
  passport_number: string | null;
  license_categories: string[];
  qualifications: string[];
  notes: string | null;
};

const toggle = (arr: string[], v: string) =>
  arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

export function DriverRoster() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [allowed, setAllowed] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [idCardNumber, setIdCardNumber] = useState("");
  const [passportNumber, setPassportNumber] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [quals, setQuals] = useState<string[]>([]);
  const [customQual, setCustomQual] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const sb = getBrowserSupabase();
      const m = await getActiveMembership(sb);
      const ok = m?.role === "owner" || m?.role === "dispatcher";
      setAllowed(Boolean(ok));
      if (m && ok) setDrivers((await listDrivers(sb, m.companyId)) as Driver[]);
    } catch {
      setAllowed(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function resetForm() {
    setEditingId(null);
    setFirstName("");
    setLastName("");
    setBirthDate("");
    setLicenseNumber("");
    setIdCardNumber("");
    setPassportNumber("");
    setCategories([]);
    setQuals([]);
    setCustomQual("");
    setNotes("");
    setErrors({});
  }

  function startEdit(d: Driver) {
    setEditingId(d.id);
    setFirstName(d.first_name);
    setLastName(d.last_name);
    setBirthDate(d.birth_date ?? "");
    setLicenseNumber(d.license_number ?? "");
    setIdCardNumber(d.id_card_number ?? "");
    setPassportNumber(d.passport_number ?? "");
    setCategories(d.license_categories ?? []);
    setQuals(d.qualifications ?? []);
    setNotes(d.notes ?? "");
    setStatus(null);
    setErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save() {
    setErrors({});
    setStatus(null);
    const parsed = driverSchema.safeParse({
      firstName,
      lastName,
      birthDate: birthDate || undefined,
      licenseNumber: licenseNumber.trim() || undefined,
      idCardNumber: idCardNumber.trim() || undefined,
      passportNumber: passportNumber.trim() || undefined,
      licenseCategories: categories,
      qualifications: quals,
      notes: notes.trim() || undefined,
    });
    if (!parsed.success) {
      const map: Record<string, string> = {};
      for (const issue of parsed.error.issues) map[issue.path.join(".")] = issue.message;
      setErrors(map);
      return;
    }
    try {
      const sb = getBrowserSupabase();
      const m = await getActiveMembership(sb);
      if (!m) {
        setStatus("Brak firmy.");
        return;
      }
      if (editingId) {
        await updateDriver(sb, editingId, parsed.data, m.companyId);
        setStatus("✅ Zmiany zapisane.");
      } else {
        await insertDriver(sb, parsed.data, m.companyId);
        setStatus("✅ Kierowca dodany.");
      }
      resetForm();
      await load();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Błąd zapisu.");
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Usunąć tego kierowcę z kartoteki?")) return;
    try {
      await deleteDriver(getBrowserSupabase(), id);
      if (editingId === id) resetForm();
      await load();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Błąd usuwania.");
    }
  }

  if (!allowed) return null;

  return (
    <div style={{ marginTop: 40 }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Kartoteka kierowców</h2>
      <p style={{ color: palette.smoke, marginTop: 4, fontSize: 14 }}>
        Dane osobowe, dokumenty i uprawnienia. Dostęp tylko dla właściciela i spedytora.
      </p>

      <div style={styles.form}>
        {editingId && (
          <div style={{ fontSize: 13, color: palette.red, fontWeight: 700 }}>
            ✏️ Edytujesz kierowcę.
          </div>
        )}
        <div style={styles.grid}>
          <label style={styles.field}>
            <span style={styles.label}>Imię *</span>
            <input
              style={styles.input}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            {errors.firstName && <span style={styles.err}>{errors.firstName}</span>}
          </label>
          <label style={styles.field}>
            <span style={styles.label}>Nazwisko *</span>
            <input
              style={styles.input}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
            {errors.lastName && <span style={styles.err}>{errors.lastName}</span>}
          </label>
        </div>

        <div style={styles.grid}>
          <label style={styles.field}>
            <span style={styles.label}>Data urodzenia</span>
            <input
              style={styles.input}
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </label>
          <label style={styles.field}>
            <span style={styles.label}>Nr prawa jazdy</span>
            <input
              style={styles.input}
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
            />
          </label>
        </div>

        <div style={styles.grid}>
          <label style={styles.field}>
            <span style={styles.label}>Nr dowodu osobistego</span>
            <input
              style={styles.input}
              value={idCardNumber}
              onChange={(e) => setIdCardNumber(e.target.value)}
            />
          </label>
          <label style={styles.field}>
            <span style={styles.label}>Nr paszportu</span>
            <input
              style={styles.input}
              value={passportNumber}
              onChange={(e) => setPassportNumber(e.target.value)}
            />
          </label>
        </div>

        <div>
          <span style={styles.label}>Kategorie prawa jazdy</span>
          <div style={styles.chips}>
            {LICENSE_CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategories((a) => toggle(a, c))}
                style={{ ...styles.chip, ...(categories.includes(c) ? styles.chipOn : {}) }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span style={styles.label}>Dodatkowe uprawnienia</span>
          <div style={styles.chips}>
            {DRIVER_QUALIFICATIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setQuals((a) => toggle(a, q))}
                style={{ ...styles.chip, ...(quals.includes(q) ? styles.chipOn : {}) }}
              >
                {q}
              </button>
            ))}
            {quals
              .filter((q) => !(DRIVER_QUALIFICATIONS as readonly string[]).includes(q))
              .map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuals((a) => toggle(a, q))}
                  style={{ ...styles.chip, ...styles.chipOn }}
                >
                  {q} ✕
                </button>
              ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <input
              style={{ ...styles.input, maxWidth: 260 }}
              value={customQual}
              onChange={(e) => setCustomQual(e.target.value)}
              placeholder="Dodaj własne uprawnienie"
            />
            <button
              type="button"
              style={styles.ghost}
              onClick={() => {
                const v = customQual.trim();
                if (v && !quals.includes(v)) setQuals((a) => [...a, v]);
                setCustomQual("");
              }}
            >
              Dodaj
            </button>
          </div>
        </div>

        <label style={styles.field}>
          <span style={styles.label}>Notatki</span>
          <textarea
            style={{ ...styles.input, minHeight: 60 }}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" style={styles.primary} onClick={save}>
            {editingId ? "Zapisz zmiany" : "Dodaj kierowcę"}
          </button>
          {editingId && (
            <button type="button" style={styles.ghost} onClick={resetForm}>
              Anuluj
            </button>
          )}
        </div>
        {status && <p style={{ color: palette.smoke, fontSize: 14 }}>{status}</p>}
      </div>

      {drivers.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 20 }}>
          {drivers.map((d) => (
            <div key={d.id} style={styles.row}>
              <strong style={{ minWidth: 180 }}>
                {d.last_name} {d.first_name}
              </strong>
              <span style={styles.cell}>
                {d.license_categories.length > 0 ? d.license_categories.join(", ") : "—"}
              </span>
              <span style={{ flex: 1 }} />
              {d.qualifications.slice(0, 3).map((q) => (
                <span key={q} style={styles.tag}>
                  {q}
                </span>
              ))}
              <button type="button" style={styles.ghost} onClick={() => startEdit(d)}>
                ✏️
              </button>
              <button type="button" style={styles.danger} onClick={() => remove(d.id)}>
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: { display: "flex", flexDirection: "column", gap: 14, marginTop: 16, maxWidth: 560 },
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
  chips: { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 },
  chip: {
    background: palette.black,
    color: palette.offWhite,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 999,
    padding: "5px 12px",
    cursor: "pointer",
    fontSize: 13,
  },
  chipOn: { background: palette.red, color: palette.white, borderColor: palette.red },
  primary: {
    background: palette.red,
    color: palette.white,
    border: "none",
    borderRadius: 8,
    padding: "11px",
    fontWeight: 700,
    cursor: "pointer",
    minWidth: 160,
  },
  ghost: {
    background: "transparent",
    color: palette.offWhite,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
    padding: "8px 12px",
    cursor: "pointer",
  },
  danger: {
    background: "transparent",
    color: palette.red,
    border: `1px solid ${palette.red}`,
    borderRadius: 8,
    padding: "8px 10px",
    cursor: "pointer",
  },
  row: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    padding: "10px 16px",
    borderRadius: 10,
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
  },
  cell: { color: palette.smoke, fontSize: 14 },
  tag: {
    color: palette.offWhite,
    fontSize: 11,
    background: palette.coal,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 6,
    padding: "2px 8px",
  },
};
