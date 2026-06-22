/**
 * Alerty progowe floty — czyste reguły nad policzonymi już agregatami
 * (rentowność klientów, anomalie spalania, koszt paliwa m/m). Bez I/O.
 * UI woła to na danych, które i tak ma załadowane (np. ekran statystyk).
 */
import { round2 } from "./money";

export type AlertSeverity = "critical" | "warn";
export type AlertKind = "negativeMargin" | "lowMargin" | "fuelAnomaly" | "fuelSpike";

export interface FleetAlert {
  key: string;
  severity: AlertSeverity;
  kind: AlertKind;
  /** Czego dotyczy (nazwa klienta / rejestracja / miesiąc) — do złożenia komunikatu w UI. */
  label: string;
  /** Wartość liczbowa: marża %, liczba anomalii, % wzrostu kosztu. */
  value: number;
}

export interface FleetAlertInput {
  clients?: { client: string; marginPct: number | null; revenueEur: number }[];
  anomalyVehicles?: { registration: string; anomalies: number }[];
  /** Koszt paliwa per miesiąc, posortowany rosnąco (ostatni = bieżący). */
  fuelCostByMonth?: { month: string; cost: number }[];
  /** Próg „niskiej" marży (%, domyślnie 5). Poniżej 0 = krytyczna (ujemna). */
  lowMarginThresholdPct?: number;
  /** Próg skoku kosztu paliwa m/m (%, domyślnie 30). */
  fuelSpikePct?: number;
}

const sevRank = (s: AlertSeverity): number => (s === "critical" ? 0 : 1);

/**
 * Lista alertów posortowana: najpierw krytyczne (ujemna marża), potem ostrzeżenia
 * wg wielkości (więcej anomalii / większy skok wyżej). Progi konfigurowalne.
 */
export function fleetAlerts(input: FleetAlertInput): FleetAlert[] {
  const lowT = input.lowMarginThresholdPct ?? 5;
  const spikeT = input.fuelSpikePct ?? 30;
  const out: FleetAlert[] = [];

  for (const c of input.clients ?? []) {
    if (c.revenueEur <= 0 || c.marginPct == null) continue;
    if (c.marginPct < 0) {
      out.push({
        key: `neg-${c.client}`,
        severity: "critical",
        kind: "negativeMargin",
        label: c.client,
        value: c.marginPct,
      });
    } else if (c.marginPct < lowT) {
      out.push({
        key: `low-${c.client}`,
        severity: "warn",
        kind: "lowMargin",
        label: c.client,
        value: c.marginPct,
      });
    }
  }

  for (const v of input.anomalyVehicles ?? []) {
    if (v.anomalies > 0) {
      out.push({
        key: `anom-${v.registration}`,
        severity: "warn",
        kind: "fuelAnomaly",
        label: v.registration,
        value: v.anomalies,
      });
    }
  }

  const months = (input.fuelCostByMonth ?? []).filter((m) => m.cost > 0);
  if (months.length >= 2) {
    const prev = months[months.length - 2];
    const last = months[months.length - 1];
    if (prev && last) {
      const pct = round2(((last.cost - prev.cost) / prev.cost) * 100);
      if (pct >= spikeT) {
        out.push({
          key: `spike-${last.month}`,
          severity: "warn",
          kind: "fuelSpike",
          label: last.month,
          value: pct,
        });
      }
    }
  }

  return out.sort((a, b) => sevRank(a.severity) - sevRank(b.severity) || b.value - a.value);
}
