"use client";

import {
  type DriverPayoutRecord,
  listDriverPayoutsAll,
  listPerDiemTripsAll,
  type PerDiemTrip,
} from "@e-logistic/api";
import {
  computePerDiem,
  PAYOUT_KIND_LABELS,
  type PayoutBalance,
  settleDriverPayouts,
  sumPerDiem,
} from "@e-logistic/core";
import { palette } from "@e-logistic/ui";
import { useEffect, useState } from "react";
import { useT } from "@/components/LocaleProvider";
import { Button } from "@/components/ui";
import { getBrowserSupabase } from "@/lib/supabase/client";

/** Łączy klucze walut z dwóch źródeł (diety + saldo rozliczeń). */
function mergeCurrencies(diet: { currency: string }[], pay: PayoutBalance[]): string[] {
  return [...new Set([...diet.map((d) => d.currency), ...pay.map((p) => p.currency)])].sort();
}

/**
 * Drukowalne „Rozliczenie kierowcy" — diety (per diem) + pozycje rozliczeń
 * (należność/zaliczki/potrącenia/wypłaty) + saldo do wypłaty per waluta.
 * Dane ładowane po nazwisku; druk/PDF przez przeglądarkę.
 */
export function PayoutDoc({
  driverName,
  companyId,
  company,
  onBack,
}: {
  driverName: string;
  companyId: string;
  company: string;
  onBack: () => void;
}) {
  const t = useT();
  const [payouts, setPayouts] = useState<DriverPayoutRecord[]>([]);
  const [diets, setDiets] = useState<PerDiemTrip[]>([]);
  /**
   * Któryś ze zbiorów nie dojechał w komplecie — saldo niżej jest INNĄ liczbą.
   *
   * To dokument, który idzie do kierowcy i do księgowości, a jego wynik jest RÓŻNICĄ
   * pozycji o przeciwnych znakach: brak wypłaconej zaliczki sprzed roku nie skraca
   * tabeli, tylko podnosi „do wypłaty" o jej kwotę. Nie da się tego zauważyć po samym
   * dokumencie, bo brakujący wiersz nie zostawia w nim śladu.
   */
  const [niepelne, setNiepelne] = useState(false);

  useEffect(() => {
    (async () => {
      const sb = getBrowserSupabase();
      // Błąd odczytu schodzi do `complete: false`, a nie do pustej listy udającej
      // brak pozycji: dokument wystawiony po nieudanym pobraniu pokazywałby saldo
      // policzone z zera i wyglądałby dokładnie jak rozliczenie kierowcy, który nic
      // nie ma do odebrania. Oba przypadki — ucięcie i awaria — znaczą tu to samo:
      // liczby na dole nie są kompletne.
      const pusty = { rows: [], complete: false, pages: 0 };
      const [p, d] = await Promise.all([
        listDriverPayoutsAll(sb, companyId, { driverName }).catch(() => pusty),
        listPerDiemTripsAll(sb, companyId, { driverName }).catch(() => pusty),
      ]);
      setPayouts(p.rows);
      setDiets(d.rows);
      setNiepelne(!p.complete || !d.complete);
    })();
  }, [companyId, driverName]);

  const balances = settleDriverPayouts(
    payouts.map((r) => ({ kind: r.kind, amount: r.amount, currency: r.currency })),
  );
  // Zmienna pętli to `trip`, a nie `t` — `t` to funkcja tłumacząca (ta sama zasada
  // co w `AttentionPanel`). Przesłonięcie działałoby, ale czytelnik następnej zmiany
  // w tym bloku nie miałby jak zgadnąć, którego `t` dotyczy.
  const dietTotals = sumPerDiem(
    diets.map((trip) =>
      computePerDiem({
        destination: trip.destination ?? "",
        mode: trip.mode,
        hours: trip.hours,
        dailyRate: trip.daily_rate,
        currency: trip.currency,
      }),
    ),
  );
  const currencies = mergeCurrencies(dietTotals, balances);
  const today = new Date().toLocaleDateString("pl-PL");

  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }} className="no-print">
        <Button variant="ghost" onClick={onBack}>
          ← Wstecz
        </Button>
        <span style={{ flex: 1 }} />
        <Button onClick={() => window.print()}>🖨️ Drukuj / PDF</Button>
      </div>

      <div style={pd.doc}>
        {/* WEWNĄTRZ dokumentu i bez `no-print`: wydruk jest tym, co dostaje kierowca
            i księgowość, więc zastrzeżenie musi pojechać razem z kwotami, których
            dotyczy. Ostrzeżenie widoczne tylko na ekranie dałoby PDF nie do odróżnienia
            od rozliczenia policzonego z kompletu. Nad nagłówkiem, bo unieważnia
            wszystko poniżej — łącznie z ramką „do wypłaty". */}
        {niepelne && <div style={pd.warn}>⚠️ {t("payoutDoc.incomplete")}</div>}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>ROZLICZENIE KIEROWCY</div>
            <div style={pd.muted}>Diety · zaliczki · potrącenia · wypłaty</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 800, color: palette.red }}>{company || "E-Logistic"}</div>
            <div style={pd.muted}>Data wystawienia: {today}</div>
          </div>
        </div>

        <div style={pd.box}>
          <div style={pd.boxHead}>Kierowca</div>
          <strong style={{ fontSize: 16 }}>{driverName || "—"}</strong>
        </div>

        {dietTotals.length > 0 && (
          <div>
            <div style={pd.section}>Diety (per diem)</div>
            <table style={pd.table}>
              <thead>
                <tr>
                  <th style={pd.th}>Waluta</th>
                  <th style={pd.thR}>Podróże</th>
                  <th style={pd.thR}>Doby</th>
                  <th style={pd.thR}>Kwota</th>
                </tr>
              </thead>
              <tbody>
                {dietTotals.map((d) => (
                  <tr key={d.currency}>
                    <td style={pd.td}>{d.currency}</td>
                    <td style={pd.tdR}>{d.count}</td>
                    <td style={pd.tdR}>{d.days}</td>
                    <td style={pd.tdR}>
                      {d.amount} {d.currency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div>
          <div style={pd.section}>Rozliczenie</div>
          {payouts.length === 0 ? (
            <div style={pd.muted}>Brak pozycji rozliczeń.</div>
          ) : (
            <table style={pd.table}>
              <thead>
                <tr>
                  <th style={pd.th}>Data</th>
                  <th style={pd.th}>Typ</th>
                  <th style={pd.thR}>Kwota</th>
                </tr>
              </thead>
              <tbody>
                {[...payouts]
                  .sort((a, b) => a.entry_date.localeCompare(b.entry_date))
                  .map((r) => (
                    <tr key={r.id}>
                      <td style={pd.td}>{r.entry_date}</td>
                      <td style={pd.td}>{PAYOUT_KIND_LABELS[r.kind]}</td>
                      <td style={pd.tdR}>
                        {r.amount} {r.currency}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
          {balances.map((b) => (
            <div key={b.currency} style={pd.muted}>
              {b.currency}: należność {b.due} − zaliczki {b.advance} − potrącenia {b.deduction} −
              wypłaty {b.payout} = <strong>saldo {b.balance}</strong>
            </div>
          ))}
        </div>

        <div style={pd.totalBox}>
          <div style={pd.boxHead}>Do wypłaty (diety + saldo rozliczeń)</div>
          {currencies.length === 0 ? (
            <strong>—</strong>
          ) : (
            currencies.map((cur) => {
              const diet = dietTotals.find((d) => d.currency === cur)?.amount ?? 0;
              const bal = balances.find((b) => b.currency === cur)?.balance ?? 0;
              const total = Math.round((diet + bal) * 100) / 100;
              return (
                <div key={cur} style={pd.totalRow}>
                  <span>{cur}</span>
                  <strong style={{ color: palette.red }}>
                    {total} {cur}
                  </strong>
                </div>
              );
            })
          )}
        </div>

        <div style={pd.signs}>
          {["Podpis kierowcy", "Podpis wystawiającego"].map((s) => (
            <div key={s} style={pd.sign}>
              <div style={pd.signLine} />
              <div style={pd.muted}>{s}</div>
            </div>
          ))}
        </div>

        <p style={pd.muted}>
          Dokument pomocniczy wygenerowany w E-Logistic. „Do wypłaty" sumuje należne diety i saldo
          rozliczeń per waluta (bez przeliczeń kursowych).
        </p>
      </div>

      <style>{`@media print { .no-print { display: none !important; } .app-sidebar { display: none !important; } }`}</style>
    </div>
  );
}

const pd: Record<string, React.CSSProperties> = {
  doc: {
    marginTop: 16,
    background: palette.white,
    color: "#111",
    borderRadius: 12,
    padding: 28,
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  /**
   * Ostrzeżenie na BIAŁYM tle dokumentu, nie w palecie panelu: ta ramka jest częścią
   * kartki, która wyjdzie na drukarkę, a czerwień na czerni wyszłaby z niej szarą plamą.
   */
  warn: {
    border: "2px solid #a35a00",
    background: "#fff4e0",
    color: "#5a3200",
    borderRadius: 6,
    padding: "10px 12px",
    fontSize: 12,
    lineHeight: 1.55,
  },
  muted: { color: "#555", fontSize: 12 },
  section: {
    fontSize: 13,
    fontWeight: 800,
    textTransform: "uppercase",
    color: "#444",
    marginBottom: 6,
  },
  box: { border: "1px solid #bbb", borderRadius: 6, padding: "8px 10px" },
  boxHead: { fontSize: 11, textTransform: "uppercase", color: "#888", marginBottom: 4 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 6 },
  th: {
    textAlign: "left",
    color: "#888",
    fontSize: 11,
    padding: "6px 8px",
    borderBottom: "1px solid #ccc",
  },
  thR: {
    textAlign: "right",
    color: "#888",
    fontSize: 11,
    padding: "6px 8px",
    borderBottom: "1px solid #ccc",
  },
  td: { padding: "6px 8px", borderBottom: "1px solid #eee" },
  tdR: { padding: "6px 8px", borderBottom: "1px solid #eee", textAlign: "right" },
  totalBox: { border: `2px solid ${palette.red}`, borderRadius: 8, padding: "10px 12px" },
  totalRow: { display: "flex", justifyContent: "space-between", fontSize: 16, marginTop: 2 },
  signs: { display: "flex", gap: 16, marginTop: 16 },
  sign: { flex: 1, textAlign: "center" },
  signLine: { borderBottom: "1px solid #999", height: 44 },
};
