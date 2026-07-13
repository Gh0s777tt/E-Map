"use client";

import {
  deleteDriver,
  getActiveMembership,
  getDriverDocuments,
  insertDriver,
  listDrivers,
  setDriverDocuments,
  updateDriver,
} from "@e-logistic/api";
import {
  DRIVER_QUALIFICATIONS,
  type DriverInput,
  driverSchema,
  expiryStatus,
  firstZodError,
  LICENSE_CATEGORIES,
  zodFieldErrors,
} from "@e-logistic/core";
import { cssPalette as palette } from "@e-logistic/ui";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useConfirm } from "@/components/ConfirmProvider";
import { DataImport, type ImportColumn } from "@/components/DataImport";
import { useToast } from "@/components/Toast";
import { Badge, Button } from "@/components/ui";
import { csvDateStamp, downloadCsv } from "@/lib/csv";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { downloadXlsx } from "@/lib/xlsx";

type Driver = Awaited<ReturnType<typeof listDrivers>>[number];
type Docs = { idCard: string | null; passport: string | null; license: string | null };

const toggle = (arr: string[], v: string) =>
  arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

const EXPIRY_DOCS = [
  { key: "license_expiry", label: "Prawo jazdy" },
  { key: "code95_expiry", label: "Kod 95" },
  { key: "medical_expiry", label: "Badania lek." },
  { key: "psychotech_expiry", label: "Psychotechn." },
  { key: "adr_expiry", label: "ADR" },
] as const;

/** Kolumny importu kierowców (bez numerów dokumentów — te dodaje się ręcznie, audytowane). */
const IMPORT_COLUMNS: ImportColumn[] = [
  { key: "lastName", label: "Nazwisko", aliases: ["last name", "surname"], required: true },
  { key: "firstName", label: "Imię", aliases: ["imie", "first name"], required: true },
  { key: "birthDate", label: "Data urodzenia", aliases: ["data ur", "dob", "birth"] },
  { key: "licenseCategories", label: "Kategorie", aliases: ["kat", "categories"] },
  { key: "qualifications", label: "Uprawnienia", aliases: ["kwalifikacje", "qualifications"] },
  { key: "licenseExpiry", label: "Prawo jazdy", aliases: ["license"] },
  { key: "code95Expiry", label: "Kod 95", aliases: ["code95", "code 95"] },
  {
    key: "medicalExpiry",
    label: "Badania lek.",
    aliases: ["badania lekarskie", "badania", "medical"],
  },
  { key: "psychotechExpiry", label: "Psychotechn.", aliases: ["psychotechnika", "psychotech"] },
  { key: "adrExpiry", label: "ADR", aliases: [] },
  { key: "notes", label: "Uwagi", aliases: ["komentarz", "notes", "notatki"] },
];

const splitCats = (s: string) =>
  s
    .split(/[,;|\s]+/)
    .map((x) => x.trim())
    .filter(Boolean);
const splitQuals = (s: string) =>
  s
    .split(/[,;|]+/)
    .map((x) => x.trim())
    .filter(Boolean);

function validateDriverRow(
  rec: Record<string, string>,
): { ok: true; value: DriverInput } | { ok: false; error: string } {
  const candidate = {
    firstName: (rec.firstName ?? "").trim(),
    lastName: (rec.lastName ?? "").trim(),
    birthDate: (rec.birthDate ?? "").trim() || undefined,
    licenseCategories: splitCats(rec.licenseCategories ?? ""),
    qualifications: splitQuals(rec.qualifications ?? ""),
    notes: (rec.notes ?? "").trim() || undefined,
    licenseExpiry: (rec.licenseExpiry ?? "").trim() || undefined,
    code95Expiry: (rec.code95Expiry ?? "").trim() || undefined,
    medicalExpiry: (rec.medicalExpiry ?? "").trim() || undefined,
    psychotechExpiry: (rec.psychotechExpiry ?? "").trim() || undefined,
    adrExpiry: (rec.adrExpiry ?? "").trim() || undefined,
  };
  const parsed = driverSchema.safeParse(candidate);
  if (!parsed.success) return { ok: false, error: firstZodError(parsed.error) };
  return { ok: true, value: parsed.data };
}

export function DriverRoster() {
  const confirm = useConfirm();
  const toast = useToast();
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
  const [licenseExpiry, setLicenseExpiry] = useState("");
  const [code95Expiry, setCode95Expiry] = useState("");
  const [medicalExpiry, setMedicalExpiry] = useState("");
  const [psychotechExpiry, setPsychotechExpiry] = useState("");
  const [adrExpiry, setAdrExpiry] = useState("");
  const [passportExpiry, setPassportExpiry] = useState("");
  const [idCardExpiry, setIdCardExpiry] = useState("");
  // #319: szczegóły uprawnień (nr dokumentu + ważność) per nazwa uprawnienia.
  const [qualDetails, setQualDetails] = useState<
    Record<string, { docNumber: string; expiry: string }>
  >({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, Docs>>({});

  const load = useCallback(async () => {
    try {
      const sb = getBrowserSupabase();
      const m = await getActiveMembership(sb);
      const ok = m?.role === "owner" || m?.role === "dispatcher";
      setAllowed(Boolean(ok));
      if (m && ok) setDrivers(await listDrivers(sb, m.companyId));
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
    setLicenseExpiry("");
    setCode95Expiry("");
    setMedicalExpiry("");
    setPsychotechExpiry("");
    setAdrExpiry("");
    setPassportExpiry("");
    setIdCardExpiry("");
    setQualDetails({});
    setErrors({});
  }

  function exportCsv() {
    const headers = [
      "Nazwisko",
      "Imię",
      "Kategorie",
      "Uprawnienia",
      "Prawo jazdy",
      "Kod 95",
      "Badania lek.",
      "Psychotechn.",
      "ADR",
    ];
    const rows = drivers.map((d) => [
      d.last_name,
      d.first_name,
      d.license_categories.join(" "),
      d.qualifications.join("; "),
      d.license_expiry ?? "",
      d.code95_expiry ?? "",
      d.medical_expiry ?? "",
      d.psychotech_expiry ?? "",
      d.adr_expiry ?? "",
    ]);
    downloadCsv(`kierowcy_${csvDateStamp()}.csv`, headers, rows);
  }

  async function exportXlsx() {
    const headers = [
      "Nazwisko",
      "Imię",
      "Kategorie",
      "Uprawnienia",
      "Prawo jazdy",
      "Kod 95",
      "Badania lek.",
      "Psychotechn.",
      "ADR",
    ];
    const rows = drivers.map((d) => [
      d.last_name,
      d.first_name,
      d.license_categories.join(" "),
      d.qualifications.join("; "),
      d.license_expiry ?? "",
      d.code95_expiry ?? "",
      d.medical_expiry ?? "",
      d.psychotech_expiry ?? "",
      d.adr_expiry ?? "",
    ]);
    await downloadXlsx(`kierowcy_${csvDateStamp()}.xlsx`, headers, rows);
  }

  const importDrivers = useCallback(async (values: DriverInput[]) => {
    const sb = getBrowserSupabase();
    const m = await getActiveMembership(sb);
    if (!m || !(m.role === "owner" || m.role === "dispatcher")) {
      return { inserted: 0, failed: values.length, errors: ["Brak uprawnień lub firmy."] };
    }
    // Dedup po imię|nazwisko|data ur. (driver_save z p_id=null zawsze wstawia nowy wiersz).
    const key = (f: string, l: string, b: string | null | undefined) =>
      `${f.trim().toLowerCase()}|${l.trim().toLowerCase()}|${(b ?? "").trim()}`;
    const existing = new Set(
      (await listDrivers(sb, m.companyId)).map((d) => key(d.first_name, d.last_name, d.birth_date)),
    );
    let inserted = 0;
    let failed = 0;
    const errors: string[] = [];
    for (const v of values) {
      const k = key(v.firstName, v.lastName, v.birthDate);
      if (existing.has(k)) {
        failed++;
        if (errors.length < 8)
          errors.push(`${v.lastName} ${v.firstName}: już istnieje (pominięto)`);
        continue;
      }
      try {
        await insertDriver(sb, v, m.companyId);
        existing.add(k);
        inserted++;
      } catch (e) {
        failed++;
        if (errors.length < 8) {
          errors.push(`${v.lastName} ${v.firstName}: ${e instanceof Error ? e.message : "błąd"}`);
        }
      }
    }
    return { inserted, failed, errors };
  }, []);

  function startEdit(d: Driver) {
    setEditingId(d.id);
    setFirstName(d.first_name);
    setLastName(d.last_name);
    setBirthDate(d.birth_date ?? "");
    // Numery dokumentów są zaszyfrowane — nie pokazujemy ich w formularzu.
    // Wpisz ponownie, by je zmienić; puste pola = bez zmian.
    setLicenseNumber("");
    setIdCardNumber("");
    setPassportNumber("");
    setCategories(d.license_categories ?? []);
    setQuals(d.qualifications ?? []);
    setNotes(d.notes ?? "");
    setLicenseExpiry(d.license_expiry ?? "");
    setCode95Expiry(d.code95_expiry ?? "");
    setMedicalExpiry(d.medical_expiry ?? "");
    setPsychotechExpiry(d.psychotech_expiry ?? "");
    setAdrExpiry(d.adr_expiry ?? "");
    setPassportExpiry(d.passport_expiry ?? "");
    setIdCardExpiry(d.id_card_expiry ?? "");
    setQualDetails(
      Object.fromEntries(
        (d.qualification_details ?? []).map((q) => [
          q.name,
          { docNumber: q.doc_number ?? "", expiry: q.expiry ?? "" },
        ]),
      ),
    );
    setErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save() {
    setErrors({});
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
      licenseExpiry: licenseExpiry || undefined,
      code95Expiry: code95Expiry || undefined,
      medicalExpiry: medicalExpiry || undefined,
      psychotechExpiry: psychotechExpiry || undefined,
      adrExpiry: adrExpiry || undefined,
      passportExpiry: passportExpiry || undefined,
      idCardExpiry: idCardExpiry || undefined,
      qualificationDetails: quals.map((q) => ({
        name: q,
        docNumber: qualDetails[q]?.docNumber?.trim() || undefined,
        expiry: qualDetails[q]?.expiry || undefined,
      })),
    });
    if (!parsed.success) {
      const map = zodFieldErrors(parsed.error);
      setErrors(map);
      return;
    }
    try {
      const sb = getBrowserSupabase();
      const m = await getActiveMembership(sb);
      if (!m) {
        toast("Brak firmy.", "error");
        return;
      }
      let driverId = editingId;
      if (editingId) {
        await updateDriver(sb, editingId, parsed.data, m.companyId);
      } else {
        driverId = await insertDriver(sb, parsed.data, m.companyId);
      }
      const idCard = idCardNumber.trim();
      const passport = passportNumber.trim();
      const license = licenseNumber.trim();
      if (driverId && (idCard || passport || license)) {
        await setDriverDocuments(sb, driverId, {
          idCard: idCard || undefined,
          passport: passport || undefined,
          license: license || undefined,
        });
      }
      toast(editingId ? "Zmiany zapisane." : "Kierowca dodany.", "success");
      resetForm();
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Błąd zapisu.", "error");
    }
  }

  async function remove(id: string) {
    if (!(await confirm("Usunąć tego kierowcę z kartoteki?"))) return;
    try {
      await deleteDriver(getBrowserSupabase(), id);
      if (editingId === id) resetForm();
      toast("Kierowca usunięty.", "success");
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Błąd usuwania.", "error");
    }
  }

  async function revealDocs(id: string) {
    try {
      const d = await getDriverDocuments(getBrowserSupabase(), id);
      setRevealed((m) => ({ ...m, [id]: d }));
    } catch (e) {
      toast(e instanceof Error ? e.message : "Błąd odczytu dokumentów.", "error");
    }
  }

  if (!allowed) return null;

  const today = new Date().toISOString().slice(0, 10);

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
          <span style={styles.label}>Terminy dokumentów (przypomnienia)</span>
          <div style={{ ...styles.grid, marginTop: 6 }}>
            <label style={styles.field}>
              <span style={styles.label}>Prawo jazdy do</span>
              <input
                style={styles.input}
                type="date"
                value={licenseExpiry}
                onChange={(e) => setLicenseExpiry(e.target.value)}
              />
            </label>
            <label style={styles.field}>
              <span style={styles.label}>Kod 95 do</span>
              <input
                style={styles.input}
                type="date"
                value={code95Expiry}
                onChange={(e) => setCode95Expiry(e.target.value)}
              />
            </label>
          </div>
          <div style={{ ...styles.grid, marginTop: 8 }}>
            <label style={styles.field}>
              <span style={styles.label}>Badania lekarskie do</span>
              <input
                style={styles.input}
                type="date"
                value={medicalExpiry}
                onChange={(e) => setMedicalExpiry(e.target.value)}
              />
            </label>
            <label style={styles.field}>
              <span style={styles.label}>Psychotechniczne do</span>
              <input
                style={styles.input}
                type="date"
                value={psychotechExpiry}
                onChange={(e) => setPsychotechExpiry(e.target.value)}
              />
            </label>
            <label style={styles.field}>
              <span style={styles.label}>ADR do</span>
              <input
                style={styles.input}
                type="date"
                value={adrExpiry}
                onChange={(e) => setAdrExpiry(e.target.value)}
              />
            </label>
            <label style={styles.field}>
              <span style={styles.label}>Paszport ważny do</span>
              <input
                style={styles.input}
                type="date"
                value={passportExpiry}
                onChange={(e) => setPassportExpiry(e.target.value)}
              />
            </label>
            <label style={styles.field}>
              <span style={styles.label}>Dowód osobisty ważny do</span>
              <input
                style={styles.input}
                type="date"
                value={idCardExpiry}
                onChange={(e) => setIdCardExpiry(e.target.value)}
              />
            </label>
          </div>
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
            <Button
              variant="ghost"
              onClick={() => {
                const v = customQual.trim();
                if (v && !quals.includes(v)) setQuals((a) => [...a, v]);
                setCustomQual("");
              }}
            >
              Dodaj
            </Button>
          </div>
        </div>

        {quals.length > 0 && (
          <div>
            <span style={styles.label}>Szczegóły uprawnień (nr dokumentu i ważność)</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
              {quals.map((q) => (
                <div key={q} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ minWidth: 130, fontSize: 13 }}>{q}</span>
                  <input
                    style={{ ...styles.input, maxWidth: 200 }}
                    value={qualDetails[q]?.docNumber ?? ""}
                    onChange={(e) =>
                      setQualDetails((d) => ({
                        ...d,
                        [q]: { docNumber: e.target.value, expiry: d[q]?.expiry ?? "" },
                      }))
                    }
                    placeholder="Nr dokumentu"
                  />
                  <input
                    style={{ ...styles.input, maxWidth: 170 }}
                    type="date"
                    value={qualDetails[q]?.expiry ?? ""}
                    onChange={(e) =>
                      setQualDetails((d) => ({
                        ...d,
                        [q]: { docNumber: d[q]?.docNumber ?? "", expiry: e.target.value },
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <label style={styles.field}>
          <span style={styles.label}>Notatki</span>
          <textarea
            style={{ ...styles.input, minHeight: 60 }}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        <div style={{ display: "flex", gap: 10 }}>
          <Button onClick={save}>{editingId ? "Zapisz zmiany" : "Dodaj kierowcę"}</Button>
          {editingId && (
            <Button variant="ghost" onClick={resetForm}>
              Anuluj
            </Button>
          )}
        </div>
      </div>

      {allowed && (
        <div style={{ marginTop: 20 }}>
          <DataImport
            columns={IMPORT_COLUMNS}
            validate={validateDriverRow}
            onImport={importDrivers}
            templateBase="kierowcy"
            onDone={load}
          />
          <p style={{ fontSize: 12, color: palette.smoke, marginTop: 6 }}>
            Wymagane: Nazwisko, Imię. Kategorie oddziel spacją/przecinkiem (np. „C C+E"),
            uprawnienia średnikiem/przecinkiem. Numery dokumentów (dowód/paszport) dodaj ręcznie —
            są szyfrowane i audytowane, nie importujemy ich masowo.
          </p>
        </div>
      )}

      {drivers.length === 0 ? (
        <p style={{ color: palette.smoke, marginTop: 20 }}>Brak kierowców w kartotece.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 20 }}>
          <div style={{ display: "flex" }}>
            <span style={{ flex: 1 }} />
            <Button variant="ghost" onClick={exportCsv}>
              ⬇️ CSV
            </Button>
            <Button variant="ghost" onClick={exportXlsx}>
              ⬇️ XLSX
            </Button>
          </div>
          {drivers.map((d) => {
            const doc = revealed[d.id];
            return (
              <div key={d.id} style={styles.card}>
                <div style={styles.row}>
                  <strong style={{ minWidth: 180 }}>
                    {d.last_name} {d.first_name}
                  </strong>
                  <span style={styles.cell}>
                    {d.license_categories.length > 0 ? d.license_categories.join(", ") : "—"}
                  </span>
                  {EXPIRY_DOCS.map((doc) => {
                    const date = d[doc.key];
                    if (!date) return null;
                    const st = expiryStatus(date, today);
                    if (st.level === "ok") return null;
                    return (
                      <Badge key={doc.key} color={st.level === "expired" ? palette.red : "#f59e0b"}>
                        {doc.label}: {st.daysLeft < 0 ? "po terminie" : `${st.daysLeft} dni`}
                      </Badge>
                    );
                  })}
                  <span style={{ flex: 1 }} />
                  {d.qualifications.slice(0, 3).map((q) => (
                    <span key={q} style={styles.tag}>
                      {q}
                    </span>
                  ))}
                  <Link href={`/drivers/${d.id}`} className="app-navlink" style={styles.cardLink}>
                    📇 Karta
                  </Link>
                  <Button variant="ghost" onClick={() => revealDocs(d.id)}>
                    🔓 Dokumenty
                  </Button>
                  <Button variant="ghost" onClick={() => startEdit(d)}>
                    ✏️
                  </Button>
                  <Button variant="danger" onClick={() => remove(d.id)}>
                    🗑️
                  </Button>
                </div>
                {doc && (
                  <div style={styles.docs}>
                    🔒 Dowód: <strong>{doc.idCard ?? "—"}</strong> · Paszport:{" "}
                    <strong>{doc.passport ?? "—"}</strong> · Prawo jazdy:{" "}
                    <strong>{doc.license ?? "—"}</strong>
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
  card: {
    borderRadius: 10,
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    overflow: "hidden",
  },
  row: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    padding: "10px 16px",
  },
  docs: {
    padding: "8px 16px",
    borderTop: `1px solid ${palette.graphite}`,
    background: palette.black,
    color: palette.smoke,
    fontSize: 13,
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
  cardLink: {
    fontSize: 13,
    padding: "9px 12px",
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
  },
};
