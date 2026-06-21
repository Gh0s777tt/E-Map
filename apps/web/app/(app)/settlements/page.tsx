"use client";

import { listFuelLogs, listTripEvents } from "@e-logistic/api";
import { buildSettlement, round2, type Settlement, toCsv } from "@e-logistic/core";
import { palette } from "@e-logistic/ui";
import { useCallback, useEffect, useState } from "react";
import { Button, PageHeader } from "@/components/ui";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { useFleet } from "@/lib/useFleet";

type FuelRow = {
  odometer_km: number;
  liters: number;
  is_full: boolean | null;
  price_total: number | null;
  created_at: string;
  station_country: string | null;
  station_city: string | null;
  station_loc: string | null;
};
type TripRow = {
  action: string;
  amount: number | null;
  odometer_km: number | null;
  country: string | null;
  location: string | null;
  created_at: string;
  comment: string | null;
};

const TRIP_LABEL: Record<string, string> = {
  load: "Załadunek",
  unload: "Rozładunek",
  start: "Rozpoczęcie",
  end: "Zakończenie",
  service: "Serwis",
  other: "Inne",
};

function firstOfMonth(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function today(): string {
  return new Date().toISOString().slice(0, 10);
}
function inRange(iso: string, from: string, to: string): boolean {
  const d = iso.slice(0, 10);
  return d >= from && d <= to;
}
function download(filename: string, text: string) {
  const blob = new Blob([`﻿${text}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SettlementsPage() {
  const { vehicles, source } = useFleet();
  const [vehicleId, setVehicleId] = useState("");
  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo] = useState(today);
  const [ratePerKm, setRatePerKm] = useState("");
  const [tollCost, setTollCost] = useState("");
  const [fuel, setFuel] = useState<FuelRow[]>([]);
  const [adblue, setAdblue] = useState<FuelRow[]>([]);
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const [busy, setBusy] = useState(false);

  const setupMsg =
    source === "no-company"
      ? "Najpierw utwórz firmę na Pulpicie."
      : source === "no-vehicles"
        ? "Dodaj pojazd, aby rozliczyć trasy."
        : null;

  useEffect(() => {
    if (!vehicleId && vehicles[0]) setVehicleId(vehicles[0].id);
  }, [vehicles, vehicleId]);

  const regOf = useCallback(
    (id: string) => vehicles.find((v) => v.id === id)?.registration ?? id.slice(0, 8),
    [vehicles],
  );

  async function load() {
    if (!vehicleId) return;
    setBusy(true);
    try {
      const sb = getBrowserSupabase();
      // Zakres dat filtrowany po stronie bazy (mniej danych w transferze) — `to` do końca dnia.
      const toEnd = `${to}T23:59:59.999Z`;
      const range = { from, to: toEnd };
      const [f, a, t] = await Promise.all([
        listFuelLogs(sb, { vehicleId, ...range }),
        listFuelLogs(sb, { vehicleId, table: "adblue_logs", ...range }),
        listTripEvents(sb, { vehicleId, ...range }),
      ]);
      const fFilt = (f as FuelRow[]).filter((r) => inRange(r.created_at, from, to));
      const aFilt = (a as FuelRow[]).filter((r) => inRange(r.created_at, from, to));
      const tFilt = (t as TripRow[]).filter((r) => inRange(r.created_at, from, to));
      setFuel(fFilt);
      setAdblue(aFilt);
      setTrips(tFilt);
      setSettlement(
        buildSettlement({
          fuel: fFilt.map((r) => ({
            odometerKm: r.odometer_km,
            liters: r.liters,
            isFull: r.is_full ?? true,
            priceTotal: r.price_total ?? undefined,
          })),
          adblue: aFilt.map((r) => ({ liters: r.liters, priceTotal: r.price_total ?? undefined })),
          trips: tFilt.map((r) => ({ action: r.action, amount: r.amount })),
          ratePerKm: Number(ratePerKm) || 0,
          tollCost: Number(tollCost) || 0,
        }),
      );
    } finally {
      setBusy(false);
    }
  }

  function exportCsv() {
    if (!settlement) return;
    const headers = ["Typ", "Data", "Licznik (km)", "Litry", "Kwota", "Szczegóły"];
    const rows: (string | number | null)[][] = [];
    for (const r of fuel) {
      rows.push([
        r.is_full === false ? "Paliwo (częściowe)" : "Paliwo",
        r.created_at.slice(0, 10),
        r.odometer_km,
        r.liters,
        r.price_total,
        [r.station_country, r.station_city, r.station_loc].filter(Boolean).join(" "),
      ]);
    }
    for (const r of adblue) {
      rows.push(["AdBlue", r.created_at.slice(0, 10), r.odometer_km, r.liters, r.price_total, ""]);
    }
    for (const r of trips) {
      rows.push([
        TRIP_LABEL[r.action] ?? r.action,
        r.created_at.slice(0, 10),
        r.odometer_km,
        null,
        r.amount,
        [r.country, r.location, r.comment].filter(Boolean).join(" "),
      ]);
    }
    const summary: (string | number | null)[][] = [
      [],
      ["PODSUMOWANIE", `${regOf(vehicleId)} · ${from} → ${to}`],
      ["Dystans (km)", settlement.distanceKm],
      ["Paliwo (L)", settlement.fuelLiters],
      ["Koszt paliwa", settlement.fuelCost],
      ["Średnie spalanie (L/100km)", settlement.avgConsumptionLPer100km],
      ["AdBlue (L)", settlement.adblueLiters],
      ["Koszt AdBlue", settlement.adblueCost],
      ["Serwis", settlement.serviceCost],
      ["Inne", settlement.otherCost],
      ["Myto", settlement.tollCost],
      ["KOSZT RAZEM", settlement.totalCost],
      ["Przychód", settlement.revenue],
      ["ZYSK", settlement.profit],
      ["Marża (%)", settlement.marginPercent],
    ];
    const csv = toCsv(headers, [...rows, ...summary]);
    download(`rozliczenie_${regOf(vehicleId)}_${from}_${to}.csv`, csv);
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <PageHeader
        title="Rozliczenia tras"
        subtitle="Podsumowanie kosztów (paliwo, AdBlue, serwis, myto) i zysku dla pojazdu w wybranym okresie. Eksport do CSV (Excel) i wydruk/PDF."
      />

      {setupMsg && <p style={{ color: palette.red, marginTop: 12 }}>⚠️ {setupMsg}</p>}

      <div style={styles.controls} className="no-print">
        <label style={styles.field}>
          <span style={styles.label}>Pojazd</span>
          <select
            style={styles.input}
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
          >
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.registration}
              </option>
            ))}
          </select>
        </label>
        <label style={styles.field}>
          <span style={styles.label}>Od</span>
          <input
            style={styles.input}
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label style={styles.field}>
          <span style={styles.label}>Do</span>
          <input
            style={styles.input}
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <label style={styles.field}>
          <span style={styles.label}>Stawka €/km</span>
          <input
            style={styles.input}
            type="number"
            step="0.01"
            value={ratePerKm}
            onChange={(e) => setRatePerKm(e.target.value)}
            placeholder="np. 1.20"
          />
        </label>
        <label style={styles.field}>
          <span style={styles.label}>Myto (€)</span>
          <input
            style={styles.input}
            type="number"
            step="0.01"
            value={tollCost}
            onChange={(e) => setTollCost(e.target.value)}
            placeholder="opcjonalnie"
          />
        </label>
        <Button onClick={load} disabled={busy || !vehicleId}>
          {busy ? "Liczę…" : "Przelicz"}
        </Button>
      </div>

      {settlement && (
        <>
          <div style={styles.cards}>
            <Card label="Dystans" value={`${settlement.distanceKm} km`} />
            <Card
              label="Spalanie"
              value={
                settlement.avgConsumptionLPer100km != null
                  ? `${settlement.avgConsumptionLPer100km} L/100km`
                  : "—"
              }
            />
            <Card label="Koszt razem" value={`${settlement.totalCost} €`} />
            <Card
              label="Zysk"
              value={`${settlement.profit} €`}
              accent={settlement.profit >= 0 ? "#22c55e" : palette.red}
            />
            <Card
              label="Marża"
              value={settlement.marginPercent != null ? `${settlement.marginPercent}%` : "—"}
            />
          </div>

          <table style={styles.table}>
            <tbody>
              <Tr k="Paliwo" v={`${settlement.fuelLiters} L · ${settlement.fuelCost} €`} />
              <Tr k="AdBlue" v={`${settlement.adblueLiters} L · ${settlement.adblueCost} €`} />
              <Tr k="Serwis" v={`${settlement.serviceCost} €`} />
              <Tr k="Inne" v={`${settlement.otherCost} €`} />
              <Tr k="Myto" v={`${settlement.tollCost} €`} />
              <Tr k="Przychód (stawka × km)" v={`${settlement.revenue} €`} />
            </tbody>
          </table>

          <div style={{ display: "flex", gap: 8, marginTop: 16 }} className="no-print">
            <Button variant="ghost" onClick={exportCsv}>
              ⬇️ Eksport CSV
            </Button>
            <Button variant="ghost" onClick={() => window.print()}>
              🖨️ Drukuj / PDF
            </Button>
          </div>

          <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 28 }}>
            Pozycje ({fuel.length + adblue.length + trips.length})
          </h2>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Typ</th>
                <th style={styles.th}>Data</th>
                <th style={styles.th}>Licznik</th>
                <th style={styles.th}>Litry</th>
                <th style={styles.th}>Kwota</th>
              </tr>
            </thead>
            <tbody>
              {fuel.map((r) => (
                <tr key={`f-${r.created_at}-${r.odometer_km}-${r.liters}`}>
                  <td style={styles.td}>{r.is_full === false ? "Paliwo (cz.)" : "Paliwo"}</td>
                  <td style={styles.td}>{r.created_at.slice(0, 10)}</td>
                  <td style={styles.td}>{r.odometer_km}</td>
                  <td style={styles.td}>{r.liters}</td>
                  <td style={styles.td}>
                    {r.price_total != null ? `${round2(r.price_total)} €` : "—"}
                  </td>
                </tr>
              ))}
              {adblue.map((r) => (
                <tr key={`a-${r.created_at}-${r.odometer_km}-${r.liters}`}>
                  <td style={styles.td}>AdBlue</td>
                  <td style={styles.td}>{r.created_at.slice(0, 10)}</td>
                  <td style={styles.td}>{r.odometer_km}</td>
                  <td style={styles.td}>{r.liters}</td>
                  <td style={styles.td}>
                    {r.price_total != null ? `${round2(r.price_total)} €` : "—"}
                  </td>
                </tr>
              ))}
              {trips.map((r) => (
                <tr key={`t-${r.created_at}-${r.action}-${r.odometer_km}`}>
                  <td style={styles.td}>{TRIP_LABEL[r.action] ?? r.action}</td>
                  <td style={styles.td}>{r.created_at.slice(0, 10)}</td>
                  <td style={styles.td}>{r.odometer_km ?? "—"}</td>
                  <td style={styles.td}>—</td>
                  <td style={styles.td}>{r.amount != null ? `${round2(r.amount)} €` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <style>{`@media print { .no-print { display: none !important; } }`}</style>
    </div>
  );
}

function Card({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={styles.card}>
      <div style={{ fontSize: 12, color: palette.smoke }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: accent ?? palette.offWhite }}>
        {value}
      </div>
    </div>
  );
}
function Tr({ k, v }: { k: string; v: string }) {
  return (
    <tr>
      <td style={{ ...styles.td, color: palette.smoke }}>{k}</td>
      <td style={{ ...styles.td, fontWeight: 700 }}>{v}</td>
    </tr>
  );
}

const styles: Record<string, React.CSSProperties> = {
  controls: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginTop: 16 },
  field: { display: "flex", flexDirection: "column", gap: 4 },
  label: { fontSize: 12, color: palette.smoke },
  input: {
    background: palette.black,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
    padding: "9px 10px",
    color: palette.offWhite,
  },
  primary: {
    background: palette.red,
    color: palette.white,
    border: "none",
    borderRadius: 8,
    padding: "10px 18px",
    fontWeight: 700,
    cursor: "pointer",
  },
  ghost: {
    background: "transparent",
    color: palette.offWhite,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
    padding: "10px 16px",
    cursor: "pointer",
  },
  cards: { display: "flex", gap: 12, flexWrap: "wrap", marginTop: 24 },
  card: {
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 12,
    padding: "14px 18px",
    minWidth: 130,
  },
  table: { width: "100%", borderCollapse: "collapse", marginTop: 16, fontSize: 14 },
  th: {
    textAlign: "left",
    color: palette.smoke,
    fontSize: 12,
    padding: "8px 10px",
    borderBottom: `1px solid ${palette.graphite}`,
  },
  td: { padding: "8px 10px", borderBottom: `1px solid ${palette.graphite}` },
};
