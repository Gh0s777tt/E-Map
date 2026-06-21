"use client";

import { palette } from "@e-logistic/ui";
import { useCallback, useEffect, useState } from "react";
import { ListStatus } from "@/components/ListStatus";
import { Badge, BarChart, PageHeader } from "@/components/ui";

type Row = { cc: string; name: string; dieselEur: number; dieselLocal: number; currency: string };

export default function FuelPricesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [updated, setUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/fuel-eu");
      const data = (await res.json()) as { countries?: Row[]; updated?: string; error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? "Nie udało się pobrać cen.");
      setRows(data.countries ?? []);
      setUpdated(data.updated ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const chart = rows.slice(0, 12).map((r) => ({ label: r.cc, value: r.dieselEur }));

  return (
    <div style={{ maxWidth: 760 }}>
      <PageHeader
        title="Ceny diesla — Europa"
        subtitle="Średnia krajowa cena oleju napędowego, przeliczona na €/L. Porównaj, gdzie zatankować taniej w trasie."
      />

      <ListStatus
        loading={loading}
        error={error}
        empty={rows.length === 0}
        emptyText="Brak danych o cenach."
        onRetry={load}
      />

      {rows.length > 0 && (
        <>
          <div style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px" }}>
              ⛽ 12 najtańszych krajów (€/L)
            </h3>
            <BarChart data={chart} unit=" €" color="#22c55e" />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 24 }}>
            {rows.map((r, i) => (
              <div key={r.cc} style={styles.row}>
                <span style={styles.rank}>{i + 1}</span>
                <span style={{ fontWeight: 700 }}>{r.name}</span>
                {i === 0 && <Badge color="#22c55e">najtaniej</Badge>}
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
            Dane:{" "}
            <a
              href="https://openvan.camp"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: palette.smoke }}
            >
              OpenVan.camp
            </a>{" "}
            · CC BY 4.0 · ceny orientacyjne (średnie krajowe)
            {updated ? ` · akt. ${new Date(updated).toLocaleDateString("pl-PL")}` : ""}
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
