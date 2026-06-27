"use client";

import {
  type Contractor,
  deleteContractor,
  listContractors,
  updateContractor,
  upsertContractor,
} from "@e-logistic/api";
import { cssPalette as palette } from "@e-logistic/ui";
import { useCallback, useEffect, useState } from "react";
import { useConfirm } from "@/components/ConfirmProvider";
import { type Column, DataTable } from "@/components/DataTable";
import * as f from "@/components/formStyles";
import { ListStatus } from "@/components/ListStatus";
import { useT } from "@/components/LocaleProvider";
import { Button, PageHeader } from "@/components/ui";
import { csvDateStamp, downloadCsv } from "@/lib/csv";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";

export default function ContractorsPage() {
  const t = useT();
  const confirm = useConfirm();
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [address, setAddress] = useState("");
  const [country, setCountry] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadErr(null);
    try {
      const sb = getBrowserSupabase();
      const m = await getCachedMembership(sb);
      if (!m) {
        setContractors([]);
        return;
      }
      setCanManage(m.role === "owner" || m.role === "dispatcher");
      setContractors(await listContractors(sb, m.companyId));
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Nie udało się pobrać kontrahentów.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function resetForm() {
    setEditingId(null);
    setName("");
    setTaxId("");
    setAddress("");
    setCountry("");
    setMsg(null);
  }

  function startEdit(c: Contractor) {
    setEditingId(c.id);
    setName(c.name);
    setTaxId(c.tax_id ?? "");
    setAddress(c.address ?? "");
    setCountry(c.country ?? "");
    setMsg(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save() {
    setMsg(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setMsg("Podaj nazwę kontrahenta.");
      return;
    }
    try {
      const sb = getBrowserSupabase();
      const m = await getCachedMembership(sb);
      if (!m) {
        setMsg("Brak firmy.");
        return;
      }
      const input = {
        name: trimmed,
        taxId: taxId.trim() || null,
        address: address.trim() || null,
        country: country.trim() || null,
      };
      if (editingId) {
        await updateContractor(sb, editingId, input);
        setMsg("✅ Kontrahent zaktualizowany.");
      } else {
        await upsertContractor(sb, m.companyId, input);
        setMsg("✅ Kontrahent dodany.");
      }
      resetForm();
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Błąd zapisu.");
    }
  }

  async function remove(c: Contractor) {
    if (!(await confirm(`Usunąć kontrahenta „${c.name}"?`))) return;
    try {
      await deleteContractor(getBrowserSupabase(), c.id);
      if (editingId === c.id) resetForm();
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Błąd usuwania.");
    }
  }

  function exportCsv() {
    const headers = ["Nazwa", "NIP", "Adres", "Kraj"];
    const rows = contractors.map((c) => [c.name, c.tax_id ?? "", c.address ?? "", c.country ?? ""]);
    downloadCsv(`kontrahenci_${csvDateStamp()}.csv`, headers, rows);
  }

  const cols: Column<Contractor>[] = [
    { key: "name", header: "Nazwa", sort: (c) => c.name, cell: (c) => <strong>{c.name}</strong> },
    { key: "tax_id", header: "NIP / VAT", sort: (c) => c.tax_id, cell: (c) => c.tax_id ?? "—" },
    { key: "address", header: "Adres", cell: (c) => c.address ?? "—" },
    { key: "country", header: "Kraj", sort: (c) => c.country, cell: (c) => c.country ?? "—" },
    ...(canManage
      ? [
          {
            key: "actions",
            header: "",
            align: "right" as const,
            cell: (c: Contractor) => (
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <Button variant="ghost" onClick={() => startEdit(c)}>
                  ✏️
                </Button>
                <Button variant="danger" onClick={() => remove(c)}>
                  🗑️
                </Button>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div style={{ maxWidth: 820 }}>
      <PageHeader
        title={t("nav.contractors")}
        subtitle="Rejestr nabywców i nadawców. Używany do autouzupełniania na fakturach i zleceniach — uzupełnia się też automatycznie przy zapisie zlecenia."
      />

      {canManage && (
        <div style={styles.form}>
          {editingId && (
            <div style={{ fontSize: 13, color: palette.red, fontWeight: 700 }}>
              ✏️ Edytujesz kontrahenta.
            </div>
          )}
          <label style={styles.field}>
            <span style={styles.label}>Nazwa *</span>
            <input
              style={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="np. Trans-Bud Sp. z o.o."
            />
          </label>
          <div style={styles.grid}>
            <label style={styles.field}>
              <span style={styles.label}>NIP / VAT ID</span>
              <input
                style={styles.input}
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="np. PL1234567890"
              />
            </label>
            <label style={styles.field}>
              <span style={styles.label}>Kraj</span>
              <input
                style={styles.input}
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="np. PL"
              />
            </label>
          </div>
          <label style={styles.field}>
            <span style={styles.label}>Adres</span>
            <input
              style={styles.input}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="ul. Przykładowa 1, 00-000 Miasto"
            />
          </label>

          <div style={{ display: "flex", gap: 10 }}>
            <Button onClick={save}>{editingId ? "Zapisz zmiany" : t("common.save")}</Button>
            {editingId && (
              <Button variant="ghost" onClick={resetForm}>
                Anuluj
              </Button>
            )}
          </div>
          {msg && <p style={{ color: palette.smoke, fontSize: 14 }}>{msg}</p>}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Rejestr</h2>
        <span style={{ flex: 1 }} />
        {contractors.length > 0 && (
          <Button variant="ghost" onClick={exportCsv}>
            ⬇️ CSV
          </Button>
        )}
      </div>

      <ListStatus
        loading={loading}
        error={loadErr}
        empty={contractors.length === 0}
        emptyText="Brak kontrahentów — dodaj powyżej lub wystaw zlecenie/fakturę."
        onRetry={load}
      />
      {!loading && !loadErr && contractors.length > 0 && (
        <DataTable
          rows={contractors}
          rowKey={(c) => c.id}
          searchText={(c) => [c.name, c.tax_id, c.address, c.country].filter(Boolean).join(" ")}
          initialSort={{ key: "name", dir: "asc" }}
          columns={cols}
        />
      )}
    </div>
  );
}

// Style z wspólnych presetów (@/components/formStyles) — koniec powielania.
const styles: Record<string, React.CSSProperties> = {
  form: f.formWrap,
  grid: f.grid,
  field: f.field,
  label: f.label,
  input: f.input,
};
