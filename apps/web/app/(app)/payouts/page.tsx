"use client";

import {
  type DriverPayoutRecord,
  type DriverRow,
  deleteDriverPayout,
  insertDriverPayout,
  listDriverPayouts,
  listDrivers,
} from "@e-logistic/api";
import {
  PAYOUT_KIND_LABELS,
  PAYOUT_KINDS,
  type PayoutKind,
  settleDriverPayouts,
} from "@e-logistic/core";
import { cssPalette as palette } from "@e-logistic/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useConfirm } from "@/components/ConfirmProvider";
import * as f from "@/components/formStyles";
import { ListStatus } from "@/components/ListStatus";
import { useT } from "@/components/LocaleProvider";
import { PayoutDoc } from "@/components/PayoutDoc";
import { Button, PageHeader } from "@/components/ui";
import { csvDateStamp, downloadCsv } from "@/lib/csv";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";

interface Row {
  id: string;
  kind: PayoutKind;
  amount: number;
  currency: string;
  entryDate: string;
}

function emptyRow(): Row {
  return {
    id: crypto.randomUUID(),
    kind: "advance",
    amount: 0,
    currency: "PLN",
    entryDate: new Date().toISOString().slice(0, 10),
  };
}

export default function PayoutsPage() {
  const t = useT();
  const confirm = useConfirm();
  const [driver, setDriver] = useState("");
  // #271: kartoteka do podpowiedzi + FK driver_id przy zapisie.
  const [driversList, setDriversList] = useState<DriverRow[]>([]);
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [saved, setSaved] = useState<DriverPayoutRecord[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [printDriver, setPrintDriver] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const sb = getBrowserSupabase();
      const m = await getCachedMembership(sb);
      if (!m) return;
      const manage = m.role === "owner" || m.role === "dispatcher";
      setCanManage(manage);
      setCompanyId(m.companyId);
      listDrivers(sb, m.companyId)
        .then(setDriversList)
        .catch(() => {});
      if (manage)
        setSaved(await listDriverPayouts(sb, m.companyId, driver ? { driverName: driver } : {}));
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("payouts.loadError"));
    } finally {
      setLoading(false);
    }
  }, [driver, t]);

  useEffect(() => {
    load();
  }, [load]);

  const balances = useMemo(
    () =>
      settleDriverPayouts(
        saved.map((r) => ({ kind: r.kind, amount: r.amount, currency: r.currency })),
      ),
    [saved],
  );

  function patch(id: string, p: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)));
  }

  async function saveDrafts() {
    if (!companyId) return;
    const valid = rows.filter((r) => r.amount > 0);
    if (valid.length === 0) {
      setErr(t("payouts.amountRequired"));
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const sb = getBrowserSupabase();
      for (const r of valid) {
        await insertDriverPayout(
          sb,
          {
            driverName: driver,
            driverId:
              driversList.find(
                (d) =>
                  `${d.first_name} ${d.last_name}`.trim().toLowerCase() ===
                  driver.trim().toLowerCase(),
              )?.id ?? null,
            kind: r.kind,
            amount: r.amount,
            currency: r.currency,
            entryDate: r.entryDate,
          },
          companyId,
        );
      }
      setRows([emptyRow()]);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("payouts.saveError"));
    } finally {
      setBusy(false);
    }
  }

  async function removeSaved(r: DriverPayoutRecord) {
    if (!(await confirm(t("payouts.deleteConfirm")))) return;
    try {
      await deleteDriverPayout(getBrowserSupabase(), r.id);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("payouts.deleteError"));
    }
  }

  function exportCsv() {
    const headers = ["Kierowca", "Data", "Typ", "Kwota", "Waluta"];
    const body: (string | number)[][] = [...saved]
      .sort((a, b) => a.entry_date.localeCompare(b.entry_date))
      .map((r) => [
        r.driver_name ?? "",
        r.entry_date,
        PAYOUT_KIND_LABELS[r.kind],
        r.amount,
        r.currency,
      ]);
    body.push([]);
    body.push(["Saldo do wypłaty wg waluty", "", "", "", ""]);
    for (const b of balances) body.push(["", "", "Saldo", b.balance, b.currency]);
    downloadCsv(`rozliczenia_${driver || "kierowca"}_${csvDateStamp()}.csv`, headers, body);
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 980 }}>
        <PageHeader title={t("payouts.title")} subtitle={t("payouts.subtitleShort")} />
        <ListStatus loading error={null} />
      </div>
    );
  }
  if (!canManage) {
    return (
      <div style={{ maxWidth: 980 }}>
        <PageHeader title={t("payouts.title")} subtitle={t("payouts.subtitleShort")} />
        <p style={{ color: palette.smoke }}>{t("payouts.onlyOwnerDispatcher")}</p>
      </div>
    );
  }

  if (printDriver && companyId) {
    return (
      <PayoutDoc
        driverName={printDriver}
        companyId={companyId}
        company=""
        onBack={() => setPrintDriver(null)}
      />
    );
  }

  return (
    <div style={{ maxWidth: 980 }}>
      <PageHeader title={t("payouts.title")} subtitle={t("payouts.subtitle")} />

      <div style={{ ...f.field, maxWidth: 320, marginBottom: 14 }}>
        <span style={f.label}>{t("payouts.fieldDriver")}</span>
        <input
          style={f.input}
          value={driver}
          list="drivers-dl"
          onChange={(e) => setDriver(e.target.value)}
          placeholder={t("payouts.driverPlaceholder")}
        />
        <datalist id="drivers-dl">
          {driversList.map((d) => (
            <option key={d.id} value={`${d.first_name} ${d.last_name}`.trim()} />
          ))}
        </datalist>
      </div>

      <div style={f.card}>
        <div style={{ ...f.listRow, color: palette.smoke, fontSize: 12, fontWeight: 700 }}>
          <span style={{ width: 140 }}>{t("common.date")}</span>
          <span style={{ width: 150 }}>{t("payouts.colKind")}</span>
          <span style={{ width: 120 }}>{t("payouts.colAmount")}</span>
          <span style={{ width: 90 }}>{t("payouts.colCurrency")}</span>
          <span style={{ flex: 1 }} />
          <span style={{ width: 36 }} />
        </div>
        {rows.map((r) => (
          <div key={r.id} style={f.listRow}>
            <input
              style={{ ...f.input, width: 140 }}
              type="date"
              value={r.entryDate}
              onChange={(e) => patch(r.id, { entryDate: e.target.value })}
            />
            <select
              style={{ ...f.input, width: 150 }}
              value={r.kind}
              onChange={(e) => patch(r.id, { kind: e.target.value as PayoutKind })}
            >
              {PAYOUT_KINDS.map((k) => (
                <option key={k} value={k}>
                  {PAYOUT_KIND_LABELS[k]}
                </option>
              ))}
            </select>
            <input
              style={{ ...f.input, width: 120 }}
              type="number"
              min={0}
              step="0.01"
              value={r.amount || ""}
              onChange={(e) => patch(r.id, { amount: Number(e.target.value) || 0 })}
            />
            <input
              style={{ ...f.input, width: 90 }}
              value={r.currency}
              onChange={(e) => patch(r.id, { currency: e.target.value.toUpperCase() })}
            />
            <span style={{ flex: 1 }} />
            <button
              type="button"
              onClick={() =>
                setRows((rs) => (rs.length > 1 ? rs.filter((x) => x.id !== r.id) : rs))
              }
              style={styles.del}
              aria-label={t("payouts.removeRowAria")}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {err && <p style={{ color: palette.red, fontSize: 13, marginTop: 8 }}>{err}</p>}

      <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
        <Button variant="ghost" onClick={() => setRows((rs) => [...rs, emptyRow()])}>
          {t("payouts.addRow")}
        </Button>
        <span style={{ flex: 1 }} />
        <Button onClick={saveDrafts} disabled={busy || rows.every((r) => r.amount <= 0)}>
          {busy ? t("payouts.saving") : t("payouts.save")}
        </Button>
      </div>

      {balances.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>{t("payouts.balanceHeading")}</div>
          {balances.map((b) => (
            <div key={b.currency} style={{ ...f.listRow, ...styles.totalRow }}>
              <span style={{ flex: 1, color: palette.smoke, fontSize: 13 }}>
                {t("payouts.balDuePrefix")}
                {b.due}
                {t("payouts.balAdvancePrefix")}
                {b.advance}
                {t("payouts.balDeductionPrefix")}
                {b.deduction}
                {t("payouts.balPayoutPrefix")}
                {b.payout}
              </span>
              <span
                style={{
                  fontWeight: 800,
                  fontSize: 16,
                  color: b.balance >= 0 ? "#22c55e" : palette.red,
                }}
              >
                {b.balance} {b.currency}
              </span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", marginTop: 24, marginBottom: 8 }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>{t("payouts.ledgerHeading")}</h2>
        <span style={{ color: palette.smoke, fontSize: 13, marginLeft: 8 }}>
          {saved.length > 0 ? `${saved.length}${t("payouts.itemsCountSuffix")}` : t("payouts.none")}
        </span>
        <span style={{ flex: 1 }} />
        <Button
          variant="ghost"
          onClick={() => setPrintDriver(driver.trim())}
          disabled={!driver.trim()}
        >
          {t("payouts.printPdf")}
        </Button>
        <Button variant="ghost" onClick={exportCsv} disabled={saved.length === 0}>
          {t("payouts.exportCsv")}
        </Button>
      </div>

      {saved.length > 0 ? (
        <div style={f.card}>
          {saved.map((r) => (
            <div key={r.id} style={f.listRow}>
              <span style={{ width: 120, fontWeight: 700 }}>{r.entry_date}</span>
              <span style={{ ...f.cell, width: 130 }}>{PAYOUT_KIND_LABELS[r.kind]}</span>
              <span style={{ ...f.cell, width: 120, color: palette.offWhite }}>
                {r.amount} {r.currency}
              </span>
              <span style={{ flex: 1, color: palette.smoke, fontSize: 12 }}>
                {r.driver_name || "—"}
                {r.note ? ` · ${r.note}` : ""}
              </span>
              <button
                type="button"
                onClick={() => removeSaved(r)}
                style={styles.del}
                aria-label={t("common.delete")}
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ color: palette.smoke }}>{t("payouts.empty")}</p>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  del: {
    width: 28,
    height: 28,
    borderRadius: 6,
    background: "transparent",
    color: palette.smoke,
    border: `1px solid ${palette.graphite}`,
    cursor: "pointer",
  },
  totalRow: {
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
    marginBottom: 6,
  },
};
