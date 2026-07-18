"use client";

import {
  type Contractor,
  type ContractorInput,
  deleteContractor,
  listContractors,
  updateContractor,
  upsertContractor,
} from "@e-logistic/api";
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
import { downloadXlsx } from "@/lib/xlsx";

/** Kolumny importu kontrahentów: dopasowanie nagłówków pliku (elastyczne warianty). */
const IMPORT_COLUMNS: ImportColumn[] = [
  { key: "name", label: "Nazwa", aliases: ["name"], required: true },
  {
    key: "taxId",
    label: "NIP",
    aliases: ["nip / vat", "nip/vat", "vat", "vat id", "tax_id", "taxid"],
  },
  { key: "address", label: "Adres", aliases: ["address"] },
  { key: "country", label: "Kraj", aliases: ["country"] },
];

function validateContractorRow(
  rec: Record<string, string>,
): { ok: true; value: ContractorInput } | { ok: false; error: string } {
  const name = (rec.name ?? "").trim();
  if (!name) return { ok: false, error: "brak nazwy" };
  return {
    ok: true,
    value: {
      name,
      taxId: rec.taxId || null,
      address: rec.address || null,
      country: rec.country || null,
    },
  };
}

export default function ContractorsPage() {
  const t = useT();
  const confirm = useConfirm();
  const toast = useToast();
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [address, setAddress] = useState("");
  const [country, setCountry] = useState("");

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
      setLoadErr(e instanceof Error ? e.message : t("contractors.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  function resetForm() {
    setEditingId(null);
    setName("");
    setTaxId("");
    setAddress("");
    setCountry("");
  }

  function startEdit(c: Contractor) {
    setEditingId(c.id);
    setName(c.name);
    setTaxId(c.tax_id ?? "");
    setAddress(c.address ?? "");
    setCountry(c.country ?? "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast(t("contractors.nameRequired"), "error");
      return;
    }
    try {
      const sb = getBrowserSupabase();
      const m = await getCachedMembership(sb);
      if (!m) {
        toast(t("vehicles.noCompanyImport"), "error");
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
        toast(t("contractors.updated"), "success");
      } else {
        await upsertContractor(sb, m.companyId, input);
        toast(t("contractors.added"), "success");
      }
      resetForm();
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : t("contractors.saveError"), "error");
    }
  }

  async function remove(c: Contractor) {
    if (
      !(await confirm(
        `${t("contractors.deleteConfirmPrefix")}${c.name}${t("contractors.deleteConfirmSuffix")}`,
      ))
    )
      return;
    try {
      await deleteContractor(getBrowserSupabase(), c.id);
      if (editingId === c.id) resetForm();
      toast(t("contractors.deleted"), "success");
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : t("contractors.deleteError"), "error");
    }
  }

  function exportCsv() {
    const headers = ["Nazwa", "NIP", "Adres", "Kraj"];
    const rows = contractors.map((c) => [c.name, c.tax_id ?? "", c.address ?? "", c.country ?? ""]);
    downloadCsv(`kontrahenci_${csvDateStamp()}.csv`, headers, rows);
  }

  async function exportXlsx() {
    const headers = ["Nazwa", "NIP", "Adres", "Kraj"];
    const rows = contractors.map((c) => [c.name, c.tax_id ?? "", c.address ?? "", c.country ?? ""]);
    await downloadXlsx(`kontrahenci_${csvDateStamp()}.xlsx`, headers, rows);
  }

  const importContractors = useCallback(
    async (values: ContractorInput[]) => {
      const sb = getBrowserSupabase();
      const m = await getCachedMembership(sb);
      if (!m) {
        return {
          inserted: 0,
          failed: values.length,
          errors: [t("vehicles.noCompanyImport")],
        };
      }
      // Audyt Ś14: jeden batch upsert zamiast N sekwencyjnych round-tripów.
      // Dedup po nazwie (klucz konfliktu company_id,name) — ostatni wiersz wygrywa,
      // jak przy sekwencyjnym upsert, i unika błędu „ON CONFLICT … a second time".
      const byName = new Map<string, ContractorInput>();
      for (const v of values) {
        const name = v.name.trim();
        if (name) byName.set(name, { ...v, name });
      }
      const rows = [...byName.values()].map((v) => ({
        company_id: m.companyId,
        name: v.name,
        tax_id: v.taxId?.trim() || null,
        address: v.address?.trim() || null,
        country: v.country?.trim() || null,
      }));
      if (rows.length === 0) return { inserted: 0, failed: 0, errors: [] };
      const { error } = await sb
        .from("contractors")
        .upsert(rows, { onConflict: "company_id,name" });
      if (error) {
        return { inserted: 0, failed: rows.length, errors: [error.message] };
      }
      return { inserted: rows.length, failed: 0, errors: [] };
    },
    [t],
  );

  const cols: Column<Contractor>[] = [
    {
      key: "name",
      header: t("contractors.colName"),
      sort: (c) => c.name,
      cell: (c) => <strong>{c.name}</strong>,
    },
    {
      key: "tax_id",
      header: t("contractors.colTaxId"),
      sort: (c) => c.tax_id,
      cell: (c) => c.tax_id ?? "—",
    },
    { key: "address", header: t("contractors.fieldAddress"), cell: (c) => c.address ?? "—" },
    {
      key: "country",
      header: t("form.field.country"),
      sort: (c) => c.country,
      cell: (c) => c.country ?? "—",
    },
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
      <PageHeader title={t("nav.contractors")} subtitle={t("contractors.subtitle")} />

      {canManage && (
        <div style={styles.form}>
          {editingId && (
            <div style={{ fontSize: 13, color: palette.red, fontWeight: 700 }}>
              {t("contractors.editingBanner")}
            </div>
          )}
          <label style={styles.field}>
            <span style={styles.label}>{t("contractors.fieldName")}</span>
            <input
              style={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="np. Trans-Bud Sp. z o.o."
            />
          </label>
          <div style={styles.grid}>
            <label style={styles.field}>
              <span style={styles.label}>{t("contractors.fieldTaxId")}</span>
              <input
                style={styles.input}
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="np. PL1234567890"
              />
            </label>
            <label style={styles.field}>
              <span style={styles.label}>{t("form.field.country")}</span>
              <input
                style={styles.input}
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="np. PL"
              />
            </label>
          </div>
          <label style={styles.field}>
            <span style={styles.label}>{t("contractors.fieldAddress")}</span>
            <input
              style={styles.input}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t("contractors.addressPlaceholder")}
            />
          </label>

          <div style={{ display: "flex", gap: 10 }}>
            <Button onClick={save}>
              {editingId ? t("vehicles.saveChanges") : t("common.save")}
            </Button>
            {editingId && (
              <Button variant="ghost" onClick={resetForm}>
                {t("common.cancel")}
              </Button>
            )}
          </div>
        </div>
      )}

      {canManage && (
        <div style={{ marginTop: 16 }}>
          <DataImport
            columns={IMPORT_COLUMNS}
            validate={validateContractorRow}
            onImport={importContractors}
            templateBase="kontrahenci"
            onDone={load}
          />
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{t("contractors.registry")}</h2>
        <span style={{ flex: 1 }} />
        {contractors.length > 0 && (
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
        empty={contractors.length === 0}
        emptyText={t("contractors.empty")}
        onRetry={load}
      />
      {!loading && !loadErr && contractors.length > 0 && (
        <DataTable
          urlKey="c"
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
