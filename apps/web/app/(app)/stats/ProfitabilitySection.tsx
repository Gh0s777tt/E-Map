"use client";

import { type ClientProfit, type clientProfitability, clientProfitTrend } from "@e-logistic/core";
import { cssPalette as palette } from "@e-logistic/ui";
import { useMemo, useState } from "react";
import { useT } from "@/components/LocaleProvider";
import { Button } from "@/components/ui";
import { csvDateStamp, downloadCsv } from "@/lib/csv";
import { FleetStat, styles } from "./shared";

export function ProfitabilitySection({
  data,
  trend,
}: {
  data: ReturnType<typeof clientProfitability>;
  trend: {
    months: string[];
    orders: Parameters<typeof clientProfitTrend>[1];
    costs: Parameters<typeof clientProfitTrend>[2];
  };
}) {
  const t = useT();
  const [trendClient, setTrendClient] = useState("");
  const activeClient = trendClient || data.clients[0]?.client || "";
  const series = useMemo(
    () => clientProfitTrend(activeClient, trend.orders, trend.costs, trend.months),
    [activeClient, trend],
  );

  function exportCsv() {
    const headers = [
      t("profit.col.client"),
      t("profit.col.orders"),
      t("profit.col.revenue"),
      t("profit.col.cost"),
      t("profit.col.profit"),
      t("profit.col.margin"),
    ];
    const rows = data.clients.map((c) => [
      c.client,
      c.orders,
      c.revenueEur,
      c.costEur,
      c.profitEur,
      c.marginPct != null ? c.marginPct : "",
    ]);
    downloadCsv(`rentownosc_${csvDateStamp()}.csv`, headers, rows);
  }

  return (
    <div style={styles.profitWrap}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={styles.anHead}>
          💸 {t("profit.title")}{" "}
          <span style={{ color: palette.smoke, fontWeight: 400, fontSize: 12 }}>
            {t("profit.approx")}
          </span>
        </div>
        <span style={{ flex: 1 }} />
        <Button variant="ghost" onClick={exportCsv}>
          ⬇️ CSV
        </Button>
      </div>
      <div style={styles.profitTotals}>
        <FleetStat
          label={t("profit.total.revenue")}
          value={`${data.totalRevenueEur} €`}
          accent="#22c55e"
        />
        <FleetStat label={t("profit.total.cost")} value={`${data.totalAttributedCostEur} €`} />
        <FleetStat
          label={t("profit.total.profit")}
          value={`${data.totalProfitEur} €`}
          accent={data.totalProfitEur >= 0 ? "#22c55e" : palette.red}
        />
      </div>
      <div style={{ marginTop: 12 }}>
        <div style={{ ...styles.profitRow, color: palette.smoke, fontSize: 12 }}>
          <span style={{ flex: 1 }}>{t("profit.col.client")}</span>
          <span style={styles.profitCol}>{t("profit.col.ordersShort")}</span>
          <span style={styles.profitCol}>{t("profit.col.revenue")}</span>
          <span style={styles.profitCol}>{t("profit.col.cost")}</span>
          <span style={styles.profitCol}>{t("profit.col.profit")}</span>
          <span style={styles.profitCol}>{t("profit.col.margin")}</span>
        </div>
        {data.clients.map((c: ClientProfit) => (
          <div key={c.client} style={styles.profitRow}>
            <span
              style={{
                flex: 1,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {c.client}
            </span>
            <span style={styles.profitCol}>{c.orders}</span>
            <span style={styles.profitCol}>{c.revenueEur} €</span>
            <span style={styles.profitCol}>{c.costEur} €</span>
            <span
              style={{
                ...styles.profitCol,
                color: c.profitEur >= 0 ? "#22c55e" : palette.red,
                fontWeight: 700,
              }}
            >
              {c.profitEur} €
            </span>
            <span
              style={{
                ...styles.profitCol,
                color: c.marginPct != null && c.marginPct >= 0 ? "#22c55e" : palette.red,
              }}
            >
              {c.marginPct != null ? `${c.marginPct}%` : "—"}
            </span>
          </div>
        ))}
      </div>
      <p style={styles.profitNote}>
        {t("profit.note")}
        {data.unattributedCostEur > 0 &&
          ` ${t("profit.unattributed")} ${data.unattributedCostEur} €.`}
        {data.noVehicleRevenueEur > 0 && ` ${t("profit.noVehicle")} ${data.noVehicleRevenueEur} €.`}
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 13 }}>📈 {t("profit.trend.title")}</div>
        <span style={{ flex: 1 }} />
        <select
          value={activeClient}
          onChange={(e) => setTrendClient(e.target.value)}
          style={styles.trendSelect}
        >
          {data.clients.map((c) => (
            <option key={c.client} value={c.client}>
              {c.client}
            </option>
          ))}
        </select>
      </div>
      <div style={{ marginTop: 8 }}>
        <div style={{ ...styles.profitRow, color: palette.smoke, fontSize: 12 }}>
          <span style={{ flex: 1 }}>{t("profit.col.month")}</span>
          <span style={styles.profitCol}>{t("profit.col.revenue")}</span>
          <span style={styles.profitCol}>{t("profit.col.cost")}</span>
          <span style={styles.profitCol}>{t("profit.col.profit")}</span>
          <span style={styles.profitCol}>{t("profit.col.margin")}</span>
        </div>
        {series.map((p) => (
          <div key={p.month} style={styles.profitRow}>
            <span style={{ flex: 1 }}>{`${p.month.slice(5)}.${p.month.slice(2, 4)}`}</span>
            <span style={styles.profitCol}>{p.revenueEur} €</span>
            <span style={styles.profitCol}>{p.costEur} €</span>
            <span
              style={{
                ...styles.profitCol,
                color: p.profitEur >= 0 ? "#22c55e" : palette.red,
                fontWeight: 700,
              }}
            >
              {p.profitEur} €
            </span>
            <span
              style={{
                ...styles.profitCol,
                color: p.marginPct != null && p.marginPct >= 0 ? "#22c55e" : palette.red,
              }}
            >
              {p.marginPct != null ? `${p.marginPct}%` : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
