"use client";

import { deleteInvoice, type Invoice, listInvoices } from "@e-logistic/api";
import { palette } from "@e-logistic/ui";
import { useCallback, useEffect, useState } from "react";
import { useConfirm } from "@/components/ConfirmProvider";
import { ListStatus } from "@/components/ListStatus";
import { Button, PageHeader } from "@/components/ui";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";

export default function InvoicesPage() {
  const confirm = useConfirm();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<Invoice | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadErr(null);
    try {
      const sb = getBrowserSupabase();
      const m = await getCachedMembership(sb);
      if (!m) {
        setInvoices([]);
        return;
      }
      setCanManage(m.role === "owner" || m.role === "dispatcher");
      setInvoices(await listInvoices(sb, m.companyId));
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Nie udało się pobrać faktur.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(id: string) {
    if (!(await confirm("Usunąć fakturę? (uwaga: powstanie luka w numeracji)"))) return;
    try {
      await deleteInvoice(getBrowserSupabase(), id);
      if (selected?.id === id) setSelected(null);
      await load();
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Błąd usuwania.");
    }
  }

  if (selected) {
    return <InvoiceDoc inv={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div style={{ maxWidth: 820 }}>
      <PageHeader
        title="Faktury"
        subtitle="Faktury wystawione ze zleceń. Kliknij, aby otworzyć dokument do druku/PDF."
      />
      <ListStatus
        loading={loading}
        error={loadErr}
        empty={invoices.length === 0}
        emptyText="Brak faktur. Wystaw fakturę z dostarczonego zlecenia (zakładka Zlecenia)."
        onRetry={load}
      />
      {!loading && !loadErr && invoices.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
          {invoices.map((inv) => (
            <div key={inv.id} style={styles.row}>
              <button type="button" style={styles.rowMain} onClick={() => setSelected(inv)}>
                <strong style={{ minWidth: 130 }}>{inv.number}</strong>
                <span style={styles.dim}>{inv.issue_date}</span>
                <span style={{ flex: 1 }} />
                <span style={styles.dim}>{inv.buyer_name ?? "—"}</span>
                <strong style={{ color: palette.red, minWidth: 110, textAlign: "right" }}>
                  {inv.gross} {inv.currency}
                </strong>
              </button>
              {canManage && (
                <Button variant="danger" onClick={() => remove(inv.id)}>
                  🗑️
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InvoiceDoc({ inv, onBack }: { inv: Invoice; onBack: () => void }) {
  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }} className="no-print">
        <Button variant="ghost" onClick={onBack}>
          ← Faktury
        </Button>
        <span style={{ flex: 1 }} />
        <Button onClick={() => window.print()}>🖨️ Drukuj / PDF</Button>
      </div>

      <div style={styles.doc}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>Faktura {inv.number}</div>
            <div style={styles.muted}>Data wystawienia: {inv.issue_date}</div>
          </div>
          <div style={{ textAlign: "right", fontWeight: 800, color: palette.red }}>E-Logistic</div>
        </div>

        <div style={styles.parties}>
          <div style={styles.party}>
            <div style={styles.partyLabel}>Sprzedawca</div>
            <div style={{ fontWeight: 700 }}>{inv.seller_name ?? "—"}</div>
            {inv.seller_tax_id && <div style={styles.muted}>NIP: {inv.seller_tax_id}</div>}
            {inv.seller_address && <div style={styles.muted}>{inv.seller_address}</div>}
          </div>
          <div style={styles.party}>
            <div style={styles.partyLabel}>Nabywca</div>
            <div style={{ fontWeight: 700 }}>{inv.buyer_name ?? "—"}</div>
            {inv.buyer_tax_id && <div style={styles.muted}>NIP: {inv.buyer_tax_id}</div>}
            {inv.buyer_address && <div style={styles.muted}>{inv.buyer_address}</div>}
          </div>
        </div>

        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Opis</th>
              <th style={styles.thR}>Netto</th>
              <th style={styles.thR}>VAT</th>
              <th style={styles.thR}>Brutto</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.td}>{inv.description ?? "Usługa transportowa"}</td>
              <td style={styles.tdR}>
                {inv.net} {inv.currency}
              </td>
              <td style={styles.tdR}>
                {inv.vat_amount} {inv.currency} ({inv.vat_rate}%)
              </td>
              <td style={styles.tdR}>
                {inv.gross} {inv.currency}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td style={{ ...styles.td, fontWeight: 800 }}>Razem do zapłaty</td>
              <td style={styles.tdR} />
              <td style={styles.tdR} />
              <td style={{ ...styles.tdR, fontWeight: 800, color: palette.red }}>
                {inv.gross} {inv.currency}
              </td>
            </tr>
          </tfoot>
        </table>

        <p style={styles.muted}>
          Dokument uproszczony wygenerowany w E-Logistic. Zgodność z przepisami (stawki VAT,
          odwrotne obciążenie, dane nabywcy) potwierdza wystawca.
        </p>
      </div>

      <style>{`@media print { .no-print { display: none !important; } .app-sidebar { display: none !important; } }`}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  row: {
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
  rowMain: {
    flex: 1,
    display: "flex",
    gap: 12,
    alignItems: "center",
    padding: "12px 16px",
    borderRadius: 10,
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    color: palette.offWhite,
    cursor: "pointer",
    textAlign: "left",
  },
  dim: { color: palette.smoke, fontSize: 13 },
  doc: {
    marginTop: 16,
    background: palette.white,
    color: "#111",
    borderRadius: 12,
    padding: 28,
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  muted: { color: "#555", fontSize: 13 },
  parties: { display: "flex", gap: 24, flexWrap: "wrap" },
  party: { flex: 1, minWidth: 220 },
  partyLabel: { fontSize: 11, textTransform: "uppercase", color: "#888", marginBottom: 4 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: { textAlign: "left", borderBottom: "2px solid #111", padding: "8px 6px" },
  thR: { textAlign: "right", borderBottom: "2px solid #111", padding: "8px 6px" },
  td: { padding: "8px 6px", borderBottom: "1px solid #ddd" },
  tdR: { padding: "8px 6px", borderBottom: "1px solid #ddd", textAlign: "right" },
};
