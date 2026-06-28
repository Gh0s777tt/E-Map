"use client";

import {
  addInvoiceItem,
  type Contractor,
  createBlankInvoice,
  deleteInvoiceItem,
  duplicateInvoice,
  type Invoice,
  type InvoiceItem,
  listContractors,
  listInvoiceItems,
  listInvoices,
  setInvoicePaid,
  setInvoiceStatus,
  upsertContractor,
} from "@e-logistic/api";
import {
  formatMoney,
  invoicePaymentStatus,
  monthlyVatRegister,
  type PaymentStatus,
  round2,
  vatSummary,
} from "@e-logistic/core";
import { cssPalette as palette } from "@e-logistic/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useConfirm } from "@/components/ConfirmProvider";
import { ListStatus } from "@/components/ListStatus";
import { useT } from "@/components/LocaleProvider";
import { useToast } from "@/components/Toast";
import { Badge, Button, PageHeader } from "@/components/ui";
import { csvDateStamp, downloadCsv } from "@/lib/csv";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";

export default function InvoicesPage() {
  const t = useT();
  const confirm = useConfirm();
  const toast = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [buyerName, setBuyerName] = useState("");
  const [buyerTaxId, setBuyerTaxId] = useState("");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [payFilter, setPayFilter] = useState<"all" | PaymentStatus | "cancelled">("all");
  const [vatMonth, setVatMonth] = useState(() => new Date().toISOString().slice(0, 7));

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
      const [inv, contr] = await Promise.all([
        listInvoices(sb, m.companyId),
        listContractors(sb, m.companyId).catch(() => []),
      ]);
      setInvoices(inv);
      setContractors(contr);
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Nie udało się pobrać faktur.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function cancel(inv: Invoice) {
    if (!(await confirm(`Anulować fakturę ${inv.number}? (numer zostanie zachowany)`))) return;
    try {
      await setInvoiceStatus(getBrowserSupabase(), inv.id, "cancelled");
      await load();
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Błąd anulowania.");
    }
  }

  async function togglePaid(inv: Invoice) {
    try {
      await setInvoicePaid(getBrowserSupabase(), inv.id, !inv.paid_at);
      await load();
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Błąd zmiany płatności.");
    }
  }

  async function duplicate(id: string) {
    if (!(await confirm("Utworzyć duplikat faktury (nowy numer, te same pozycje)?"))) return;
    try {
      const r = await duplicateInvoice(getBrowserSupabase(), id);
      toast(`Utworzono duplikat: ${r.number}`, "success");
      await load();
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Błąd duplikowania.");
    }
  }

  // Wybór nabywcy z rejestru → auto-uzupełnienie NIP i adresu.
  function pickBuyer(name: string) {
    setBuyerName(name);
    const c = contractors.find((x) => x.name === name);
    if (c) {
      setBuyerTaxId(c.tax_id ?? "");
      setBuyerAddress(c.address ?? "");
    }
  }

  function exportCsv() {
    const headers = [
      t("invoices.csv.number"),
      t("common.date"),
      t("invoices.csv.buyer"),
      t("invoices.csv.taxId"),
      t("invoices.csv.net"),
      t("invoices.csv.vat"),
      t("invoices.csv.gross"),
      t("orders.csv.currency"),
    ];
    const rows = invoices.map((i) => [
      i.number,
      i.issue_date,
      i.buyer_name ?? "",
      i.buyer_tax_id ?? "",
      i.net,
      i.vat_amount,
      i.gross,
      i.currency,
    ]);
    downloadCsv(`faktury_${csvDateStamp()}.csv`, headers, rows);
  }

  /** Eksport księgowy: rejestr VAT sprzedaży za wybrany miesiąc (pozycje + podsumowanie wg stawek). */
  function exportVatRegister() {
    const reg = monthlyVatRegister(invoices, vatMonth);
    const headers = [
      t("invoices.csv.number"),
      t("common.date"),
      t("invoices.csv.buyer"),
      t("invoices.csv.taxId"),
      "Stawka VAT (%)",
      t("invoices.csv.net"),
      t("invoices.csv.vat"),
      t("invoices.csv.gross"),
      t("orders.csv.currency"),
    ];
    const rows: (string | number)[][] = invoices
      .filter((i) => i.status !== "cancelled" && (i.issue_date ?? "").startsWith(vatMonth))
      .map((i) => [
        i.number,
        i.issue_date,
        i.buyer_name ?? "",
        i.buyer_tax_id ?? "",
        i.vat_rate,
        i.net,
        i.vat_amount,
        i.gross,
        i.currency,
      ]);
    rows.push([]);
    rows.push(["Podsumowanie wg stawek VAT"]);
    for (const r of reg.rows) {
      rows.push([`Stawka ${r.vatRate}%`, "", "", "", r.vatRate, r.net, r.vat, r.gross, ""]);
    }
    rows.push(["RAZEM", "", "", "", "", reg.totalNet, reg.totalVat, reg.totalGross, ""]);
    downloadCsv(`rejestr_vat_${vatMonth}.csv`, headers, rows);
  }

  async function createNew() {
    if (!buyerName.trim()) {
      toast("Podaj nabywcę.", "error");
      return;
    }
    try {
      const sb = getBrowserSupabase();
      const m = await getCachedMembership(sb);
      if (!m) {
        toast("Brak firmy.", "error");
        return;
      }
      const r = await createBlankInvoice(sb, m.companyId, {
        buyerName: buyerName.trim(),
        buyerTaxId: buyerTaxId.trim() || undefined,
        buyerAddress: buyerAddress.trim() || undefined,
        currency: currency.trim() || "EUR",
      });
      // Rejestr kontrahentów rośnie organicznie z wystawianych faktur.
      await upsertContractor(sb, m.companyId, {
        name: buyerName,
        taxId: buyerTaxId,
        address: buyerAddress,
      }).catch(() => {});
      setShowNew(false);
      setBuyerName("");
      setBuyerTaxId("");
      setBuyerAddress("");
      setCurrency("EUR");
      const list = await listInvoices(sb, m.companyId);
      setInvoices(list);
      const created = list.find((i) => i.id === r.id);
      if (created) setSelected(created); // otwórz dokument, by dodać pozycje
    } catch (e) {
      toast(e instanceof Error ? e.message : "Błąd tworzenia faktury.", "error");
    }
  }

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const withPay = useMemo(
    () =>
      invoices.map((inv) => ({
        inv,
        pay: invoicePaymentStatus({
          paidAt: inv.paid_at,
          dueDate: inv.due_date,
          status: inv.status,
          todayISO: today,
        }),
      })),
    [invoices, today],
  );
  const filtered = useMemo(
    () =>
      withPay.filter(({ inv, pay }) => {
        if (payFilter === "all") return true;
        if (payFilter === "cancelled") return inv.status === "cancelled";
        return inv.status !== "cancelled" && pay === payFilter;
      }),
    [withPay, payFilter],
  );
  // Pasek należności — sumy w EUR (mieszane waluty pomijane), bez anulowanych.
  const summary = useMemo(() => {
    const eur = withPay.filter(({ inv }) => inv.currency === "EUR" && inv.status !== "cancelled");
    const sum = (arr: typeof eur) => round2(arr.reduce((a, { inv }) => a + inv.gross, 0));
    return {
      invoicedEur: sum(eur),
      paidEur: sum(eur.filter(({ pay }) => pay === "paid")),
      overdueEur: sum(eur.filter(({ pay }) => pay === "overdue")),
    };
  }, [withPay]);

  if (selected) {
    return (
      <InvoiceDoc
        inv={selected}
        canManage={canManage}
        onBack={() => setSelected(null)}
        onChanged={load}
      />
    );
  }

  return (
    <div style={{ maxWidth: 820 }}>
      <PageHeader
        title="Faktury"
        subtitle="Faktury ze zleceń lub wystawione ręcznie. Kliknij, aby otworzyć dokument (pozycje, druk/PDF, duplikat)."
      />

      <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {canManage && (
          <Button variant="ghost" onClick={() => setShowNew((s) => !s)}>
            {showNew ? "Anuluj" : "➕ Nowa faktura (ręczna)"}
          </Button>
        )}
        {invoices.length > 0 && (
          <Button variant="ghost" onClick={exportCsv}>
            ⬇️ CSV
          </Button>
        )}
        {canManage && invoices.length > 0 && (
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="month"
              value={vatMonth}
              onChange={(e) => setVatMonth(e.target.value)}
              style={styles.monthInput}
              title="Miesiąc rejestru VAT"
            />
            <Button variant="ghost" onClick={exportVatRegister}>
              🧮 Rejestr VAT (księgowość)
            </Button>
          </div>
        )}
      </div>
      {canManage && showNew && (
        <div style={styles.newForm}>
          <input
            style={styles.nfInput}
            placeholder="Nabywca (nazwa)"
            value={buyerName}
            list="contractors-dl"
            onChange={(e) => pickBuyer(e.target.value)}
          />
          <datalist id="contractors-dl">
            {contractors.map((c) => (
              <option key={c.id} value={c.name} />
            ))}
          </datalist>
          <input
            style={styles.nfInput}
            placeholder="NIP nabywcy"
            value={buyerTaxId}
            onChange={(e) => setBuyerTaxId(e.target.value)}
          />
          <input
            style={styles.nfInput}
            placeholder="Adres nabywcy"
            value={buyerAddress}
            onChange={(e) => setBuyerAddress(e.target.value)}
          />
          <input
            style={{ ...styles.nfInput, maxWidth: 90 }}
            placeholder="Waluta"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          />
          <Button onClick={createNew}>Utwórz i dodaj pozycje</Button>
        </div>
      )}

      {invoices.length > 0 && (
        <div style={styles.bandRow}>
          <span>
            💶 Zafakturowane (EUR): <strong>{summary.invoicedEur}</strong>
          </span>
          <span>
            ✅ Opłacone: <strong style={{ color: "#22c55e" }}>{summary.paidEur}</strong>
          </span>
          <span>
            ⏰ Przeterminowane: <strong style={{ color: palette.red }}>{summary.overdueEur}</strong>
          </span>
        </div>
      )}
      {invoices.length > 0 && (
        <div style={styles.chips}>
          {(["all", "unpaid", "overdue", "paid", "cancelled"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setPayFilter(f)}
              style={payFilter === f ? styles.chipActive : styles.chip}
            >
              {f === "all"
                ? "Wszystkie"
                : f === "unpaid"
                  ? "Nieopłacone"
                  : f === "overdue"
                    ? "Przeterminowane"
                    : f === "paid"
                      ? "Opłacone"
                      : "Anulowane"}
            </button>
          ))}
          <span style={{ flex: 1 }} />
          <span style={{ color: palette.smoke, fontSize: 13, whiteSpace: "nowrap" }}>
            {filtered.length} z {invoices.length}
          </span>
        </div>
      )}

      <ListStatus
        loading={loading}
        error={loadErr}
        empty={invoices.length === 0}
        emptyText="Brak faktur. Wystaw fakturę z dostarczonego zlecenia (zakładka Zlecenia)."
        onRetry={load}
      />
      {!loading && !loadErr && invoices.length > 0 && filtered.length === 0 && (
        <p style={{ color: palette.smoke, fontSize: 13, marginTop: 12 }}>
          Brak faktur w tym filtrze.
        </p>
      )}
      {!loading && !loadErr && filtered.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
          {filtered.map(({ inv, pay }) => {
            const cancelled = inv.status === "cancelled";
            return (
              <div key={inv.id} style={{ ...styles.row, opacity: cancelled ? 0.55 : 1 }}>
                <button type="button" style={styles.rowMain} onClick={() => setSelected(inv)}>
                  <strong style={{ minWidth: 130 }}>{inv.number}</strong>
                  <span style={styles.dim}>{inv.issue_date}</span>
                  {cancelled ? (
                    <Badge color={palette.red}>Anulowana</Badge>
                  ) : pay === "paid" ? (
                    <Badge color="#22c55e">Opłacona</Badge>
                  ) : pay === "overdue" ? (
                    <Badge color={palette.red}>Przeterminowana</Badge>
                  ) : (
                    <Badge color={palette.smoke}>Nieopłacona</Badge>
                  )}
                  <span style={{ flex: 1 }} />
                  <span style={styles.dim}>{inv.buyer_name ?? "—"}</span>
                  <strong style={{ color: palette.red, minWidth: 110, textAlign: "right" }}>
                    {inv.gross} {inv.currency}
                  </strong>
                </button>
                {canManage && !cancelled && (
                  <Button variant="ghost" onClick={() => togglePaid(inv)}>
                    {inv.paid_at ? "↩︎ Cofnij" : "💰 Opłacona"}
                  </Button>
                )}
                {canManage && (
                  <>
                    <Button variant="ghost" onClick={() => duplicate(inv.id)}>
                      ⧉
                    </Button>
                    {!cancelled && (
                      <Button variant="danger" onClick={() => cancel(inv)}>
                        ✖ Anuluj
                      </Button>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InvoiceDoc({
  inv,
  canManage,
  onBack,
  onChanged,
}: {
  inv: Invoice;
  canManage: boolean;
  onBack: () => void;
  onChanged: () => void;
}) {
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [desc, setDesc] = useState("");
  const [qty, setQty] = useState("1");
  const [unit, setUnit] = useState("");
  const [vat, setVat] = useState(String(inv.vat_rate ?? 23));
  const [fakBusy, setFakBusy] = useState(false);
  const toast = useToast();
  const [fakMsg, setFakMsg] = useState<string | null>(null);

  async function exportToFakturownia() {
    setFakBusy(true);
    setFakMsg(null);
    try {
      const res = await fetch("/api/fakturownia/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId: inv.id }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        number?: string;
        pdfUrl?: string;
        error?: string;
      };
      if (!res.ok) {
        setFakMsg(`⚠️ ${data.error ?? "Eksport nieudany."}`);
        return;
      }
      setFakMsg(`✅ Wyeksportowano do Fakturowni${data.number ? ` (nr ${data.number})` : ""}.`);
      if (data.pdfUrl) window.open(data.pdfUrl, "_blank", "noopener");
    } catch {
      setFakMsg("⚠️ Błąd połączenia z Fakturownią.");
    } finally {
      setFakBusy(false);
    }
  }

  const reload = useCallback(async () => {
    try {
      setItems(await listInvoiceItems(getBrowserSupabase(), inv.id));
    } catch {
      setItems([]);
    }
  }, [inv.id]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Sumy z pozycji (gdy istnieją) lub z nagłówka faktury (faktury starsze bez pozycji).
  const totals = items.length
    ? {
        net: round2(items.reduce((a, i) => a + i.net, 0)),
        vat: round2(items.reduce((a, i) => a + i.vat_amount, 0)),
        gross: round2(items.reduce((a, i) => a + i.gross, 0)),
      }
    : { net: inv.net, vat: inv.vat_amount, gross: inv.gross };

  // Podsumowanie VAT wg stawek (z pozycji lub z nagłówka faktury bez pozycji).
  const vatRows = vatSummary(
    items.length
      ? items.map((i) => ({
          vatRate: i.vat_rate,
          net: i.net,
          vatAmount: i.vat_amount,
          gross: i.gross,
        }))
      : [{ vatRate: inv.vat_rate, net: inv.net, vatAmount: inv.vat_amount, gross: inv.gross }],
  );

  async function addLine() {
    const q = Number(qty);
    const u = Number(unit);
    if (!desc.trim() || !Number.isFinite(q) || !Number.isFinite(u)) {
      toast("Uzupełnij opis, ilość i cenę.", "error");
      return;
    }
    try {
      await addInvoiceItem(getBrowserSupabase(), inv.id, {
        description: desc.trim(),
        quantity: q,
        unitPrice: u,
        vatRate: Number(vat) || 0,
        position: items.length + 1,
      });
      setDesc("");
      setQty("1");
      setUnit("");
      await reload();
      onChanged();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Błąd dodawania pozycji.", "error");
    }
  }

  async function removeLine(id: string) {
    try {
      await deleteInvoiceItem(getBrowserSupabase(), id);
      await reload();
      onChanged();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Błąd usuwania pozycji.", "error");
    }
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <div
        style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}
        className="no-print"
      >
        <Button variant="ghost" onClick={onBack}>
          ← Faktury
        </Button>
        {fakMsg && <span style={{ fontSize: 13, color: palette.smoke }}>{fakMsg}</span>}
        <span style={{ flex: 1 }} />
        {canManage && inv.status !== "cancelled" && (
          <Button variant="ghost" onClick={exportToFakturownia} disabled={fakBusy}>
            {fakBusy ? "Eksport…" : "📤 Fakturownia"}
          </Button>
        )}
        <Button onClick={() => window.print()}>🖨️ Drukuj / PDF</Button>
      </div>

      <div style={styles.doc}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>
              Faktura {inv.number}
              {inv.status === "cancelled" && (
                <span
                  style={{
                    marginLeft: 10,
                    fontSize: 14,
                    color: "#b00",
                    border: "2px solid #b00",
                    borderRadius: 6,
                    padding: "1px 8px",
                  }}
                >
                  ANULOWANA
                </span>
              )}
            </div>
            <div style={styles.muted}>Data wystawienia: {inv.issue_date}</div>
            {inv.due_date && <div style={styles.muted}>Termin płatności: {inv.due_date}</div>}
          </div>
          <div style={{ textAlign: "right", fontWeight: 800, color: palette.red }}>E-Logistic</div>
        </div>

        <div style={styles.parties}>
          <div style={styles.party}>
            <div style={styles.partyLabel}>Sprzedawca</div>
            <div style={{ fontWeight: 700 }}>{inv.seller_name ?? "—"}</div>
            {inv.seller_tax_id && <div style={styles.muted}>NIP: {inv.seller_tax_id}</div>}
            {inv.seller_address && <div style={styles.muted}>{inv.seller_address}</div>}
            {inv.seller_bank && <div style={styles.muted}>Bank: {inv.seller_bank}</div>}
            {inv.seller_account && <div style={styles.muted}>Nr konta: {inv.seller_account}</div>}
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
              <th style={styles.thR}>Ilość</th>
              <th style={styles.thR}>Cena</th>
              <th style={styles.thR}>Netto</th>
              <th style={styles.thR}>VAT</th>
              <th style={styles.thR}>Brutto</th>
              {canManage && <th className="no-print" style={styles.thR} />}
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? (
              items.map((it) => (
                <tr key={it.id}>
                  <td style={styles.td}>{it.description}</td>
                  <td style={styles.tdR}>{it.quantity}</td>
                  <td style={styles.tdR}>{formatMoney(it.unit_price)}</td>
                  <td style={styles.tdR}>{formatMoney(it.net)}</td>
                  <td style={styles.tdR}>
                    {formatMoney(it.vat_amount)} ({it.vat_rate}%)
                  </td>
                  <td style={styles.tdR}>{formatMoney(it.gross)}</td>
                  {canManage && (
                    <td className="no-print" style={styles.tdR}>
                      <button type="button" style={styles.del} onClick={() => removeLine(it.id)}>
                        ✕
                      </button>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td style={styles.td}>{inv.description ?? "Usługa transportowa"}</td>
                <td style={styles.tdR}>1</td>
                <td style={styles.tdR}>{formatMoney(inv.net)}</td>
                <td style={styles.tdR}>{formatMoney(inv.net)}</td>
                <td style={styles.tdR}>
                  {formatMoney(inv.vat_amount)} ({inv.vat_rate}%)
                </td>
                <td style={styles.tdR}>{formatMoney(inv.gross)}</td>
                {canManage && <td className="no-print" style={styles.tdR} />}
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td style={{ ...styles.td, fontWeight: 800 }}>Razem</td>
              <td style={styles.tdR} />
              <td style={styles.tdR} />
              <td style={{ ...styles.tdR, fontWeight: 700 }}>{formatMoney(totals.net)}</td>
              <td style={{ ...styles.tdR, fontWeight: 700 }}>{formatMoney(totals.vat)}</td>
              <td style={{ ...styles.tdR, fontWeight: 800, color: palette.red }}>
                {formatMoney(totals.gross, inv.currency)}
              </td>
              {canManage && <td className="no-print" style={styles.tdR} />}
            </tr>
          </tfoot>
        </table>

        <div style={styles.vatBox}>
          <div style={styles.partyLabel}>Podsumowanie VAT</div>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Stawka</th>
                <th style={styles.thR}>Netto</th>
                <th style={styles.thR}>VAT</th>
                <th style={styles.thR}>Brutto</th>
              </tr>
            </thead>
            <tbody>
              {vatRows.map((v) => (
                <tr key={v.rate}>
                  <td style={styles.td}>{v.rate}%</td>
                  <td style={styles.tdR}>{formatMoney(v.net)}</td>
                  <td style={styles.tdR}>{formatMoney(v.vat)}</td>
                  <td style={styles.tdR}>{formatMoney(v.gross)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {canManage && (
          <div className="no-print" style={styles.addRow}>
            <input
              style={{ ...styles.input, flex: 2, minWidth: 160 }}
              placeholder="Opis pozycji"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
            <input
              style={{ ...styles.input, width: 64 }}
              type="number"
              step="0.01"
              placeholder="Ilość"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
            <input
              style={{ ...styles.input, width: 90 }}
              type="number"
              step="0.01"
              placeholder="Cena"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            />
            <input
              style={{ ...styles.input, width: 64 }}
              type="number"
              step="1"
              placeholder="VAT %"
              value={vat}
              onChange={(e) => setVat(e.target.value)}
            />
            <Button onClick={addLine}>＋ Pozycja</Button>
          </div>
        )}

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
  bandRow: {
    display: "flex",
    gap: 20,
    flexWrap: "wrap",
    marginTop: 16,
    padding: "12px 16px",
    borderRadius: 12,
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    fontSize: 14,
  },
  chips: { display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginTop: 12 },
  chip: {
    background: "transparent",
    color: palette.smoke,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 999,
    padding: "5px 12px",
    fontSize: 13,
    cursor: "pointer",
  },
  chipActive: {
    background: palette.red,
    color: palette.white,
    border: `1px solid ${palette.red}`,
    borderRadius: 999,
    padding: "5px 12px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
  newForm: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    alignItems: "center",
    marginTop: 12,
    padding: "12px 16px",
    borderRadius: 12,
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
  },
  nfInput: {
    flex: 1,
    minWidth: 140,
    background: palette.black,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
    padding: "9px 12px",
    color: palette.offWhite,
  },
  monthInput: {
    background: palette.black,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
    padding: "8px 10px",
    color: palette.offWhite,
  },
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
  vatBox: { alignSelf: "flex-end", width: "min(360px, 100%)" },
  partyLabel: { fontSize: 11, textTransform: "uppercase", color: "#888", marginBottom: 4 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: { textAlign: "left", borderBottom: "2px solid #111", padding: "8px 6px" },
  thR: { textAlign: "right", borderBottom: "2px solid #111", padding: "8px 6px" },
  td: { padding: "8px 6px", borderBottom: "1px solid #ddd" },
  tdR: { padding: "8px 6px", borderBottom: "1px solid #ddd", textAlign: "right" },
  addRow: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" },
  input: {
    background: "#fff",
    border: "1px solid #bbb",
    borderRadius: 8,
    padding: "8px 10px",
    color: "#111",
  },
  del: {
    background: "transparent",
    border: "none",
    color: palette.red,
    cursor: "pointer",
    fontWeight: 700,
  },
};
