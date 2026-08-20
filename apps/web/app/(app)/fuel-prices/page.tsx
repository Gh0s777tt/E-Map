"use client";

import { cssPalette as palette } from "@e-logistic/ui";
import { useQuery } from "@tanstack/react-query";
import { ListStatus } from "@/components/ListStatus";
import { useT } from "@/components/LocaleProvider";
import { Badge, BarChart, PageHeader } from "@/components/ui";
import { queryErrorMessage } from "@/lib/queryError";
import { queryKeys } from "@/lib/queryKeys";

type Row = { cc: string; name: string; dieselEur: number; dieselLocal: number; currency: string };

export default function FuelPricesPage() {
  const t = useT();

  // #310 (fala 2): notowania z `/api/fuel-eu` przez TanStack Query. Kierowca porównuje
  // kraje przed każdym wyjazdem, a ceny aktualizowane są raz na dobę — powtarzanie
  // tego strzału przy każdym wejściu było czystą stratą.
  const pricesQuery = useQuery({
    queryKey: queryKeys.euFuelPrices(),
    queryFn: async (): Promise<{ rows: Row[]; updated: string | null }> => {
      const res = await fetch("/api/fuel-eu");
      const data = (await res.json()) as { countries?: Row[]; updated?: string; error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? t("fuelPrices.loadError"));
      return { rows: data.countries ?? [], updated: data.updated ?? null };
    },
  });
  const rows = pricesQuery.data?.rows ?? [];
  const updated = pricesQuery.data?.updated ?? null;
  const loading = pricesQuery.isPending;
  const error = queryErrorMessage(pricesQuery.error, t("fuelPrices.error"));
  const retry = () => void pricesQuery.refetch();

  const chart = rows.slice(0, 12).map((r) => ({ label: r.cc, value: r.dieselEur }));

  return (
    <div style={{ maxWidth: 760 }}>
      <PageHeader title={t("fuelPrices.title")} subtitle={t("fuelPrices.subtitle")} />

      <ListStatus
        loading={loading}
        error={error}
        empty={rows.length === 0}
        emptyText={t("fuelPrices.empty")}
        onRetry={retry}
      />

      {rows.length > 0 && (
        <>
          <div style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px" }}>
              {t("fuelPrices.chartTitle")}
            </h3>
            <BarChart data={chart} unit=" €" color="#22c55e" />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 24 }}>
            {rows.map((r, i) => (
              <div key={r.cc} style={styles.row}>
                <span style={styles.rank}>{i + 1}</span>
                <span style={{ fontWeight: 700 }}>{r.name}</span>
                {i === 0 && <Badge color="#22c55e">{t("fuelPrices.cheapest")}</Badge>}
                <span style={{ flex: 1 }} />
                {r.currency !== "EUR" && (
                  <span style={styles.dim}>
                    {r.dieselLocal} {r.currency}/L
                  </span>
                )}
                <span
                  style={{ color: palette.red, fontWeight: 800, minWidth: 92, textAlign: "right" }}
                >
                  {r.dieselEur.toFixed(3)} €/L
                </span>
              </div>
            ))}
          </div>

          <p style={{ color: palette.smoke, fontSize: 12, marginTop: 20 }}>
            {t("fuelPrices.sourceLabel")}{" "}
            <a
              href="https://openvan.camp"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: palette.smoke }}
            >
              OpenVan.camp
            </a>{" "}
            {t("fuelPrices.license")}
            {updated
              ? ` · ${t("fuelPrices.updatedPrefix")} ${new Date(updated).toLocaleDateString("pl-PL")}`
              : ""}
          </p>
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  row: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    padding: "10px 14px",
    borderRadius: 10,
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    fontSize: 14,
  },
  rank: {
    minWidth: 26,
    color: palette.smoke,
    fontSize: 13,
    textAlign: "right",
  },
  dim: { color: palette.smoke, fontSize: 13 },
};
