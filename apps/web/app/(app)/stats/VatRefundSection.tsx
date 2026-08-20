"use client";

/**
 * [#379] Zwrot VAT za paliwo — per kraj tankowania.
 *
 * Wszystkie klocki istniały od [#373] i miały testy, tylko nikt ich nie wołał:
 * tabela `vat_rates` z 28 krajami, `pickVatRate`, `splitFromGross`,
 * `refundableFuelVat`. Brakowało agregacji i tego ekranu, więc przewoźnik nie
 * miał gdzie zobaczyć kwoty, o którą może wystąpić — a przy kilkuset tysiącach
 * litrów rocznie idzie to w dziesiątki tysięcy euro.
 *
 * Sekcja rozróżnia trzy stany i robi to widocznie, bo zlanie ich w jedną liczbę
 * jest tu najgroźniejszym błędem: „nie znamy stawki" pokazane jako zero zaniża
 * wniosek i nikt się o tym nie dowie.
 */
import { countryName, type FxRate, type VatRate, vatRefundByCountry } from "@e-logistic/core";
import { cssPalette as palette } from "@e-logistic/ui";
import { useMemo } from "react";
import { useT } from "@/components/LocaleProvider";
import type { FuelRaw } from "./shared";

export function VatRefundSection({
  fuel,
  vatRates,
  rates,
}: {
  fuel: FuelRaw[];
  vatRates: readonly VatRate[];
  rates: readonly FxRate[];
}) {
  const t = useT();

  const summary = useMemo(
    () =>
      vatRefundByCountry(
        fuel.map((r) => ({
          country: r.station_country,
          gross: r.price_total,
          currency: r.currency,
          occurredAt: r.occurred_at,
          liters: r.liters,
        })),
        vatRates,
        rates,
      ),
    [fuel, vatRates, rates],
  );

  const withAmount = summary.rows.some((r) => r.grossEur > 0);

  return (
    <div style={styles.box}>
      <div style={styles.head}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>🧾 {t("vat.title")}</h2>
        <span style={{ flex: 1 }} />
        {withAmount && (
          <span style={styles.total}>
            {t("vat.total")}: <strong>{summary.totalRefundableEur} €</strong>
          </span>
        )}
      </div>
      <p style={styles.sub}>{t("vat.subtitle")}</p>

      {!withAmount ? (
        /* [#382] Pusty ekran ma dwie różne przyczyny i nie wolno ich mylić.
           „Brak tankowań z kwotą" było wypisywane także wtedy, gdy tankowania
           z kwotą BYŁY, tylko żadnej nie dało się przeliczyć na euro (brak
           notowania waluty na dany dzień). Przewoźnik czytał wtedy komunikat
           wprost nieprawdziwy i nie miał jak dojść, że wystarczy uzupełnić
           kursy — silnik liczy te pozycje w `missingRate`, widok je gubił. */
        summary.missingRate > 0 ? (
          <p style={{ color: palette.warning, fontSize: 14 }}>
            ⚠️ {summary.missingRate} {t("vat.missingRateOnly")}
          </p>
        ) : (
          <p style={{ color: palette.smoke, fontSize: 14 }}>{t("vat.empty")}</p>
        )
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>{t("vat.country")}</th>
                  <th style={styles.thNum}>{t("vat.refuels")}</th>
                  <th style={styles.thNum}>{t("vat.liters")}</th>
                  <th style={styles.thNum}>{t("vat.gross")}</th>
                  <th style={styles.thNum}>{t("vat.rate")}</th>
                  <th style={styles.thNum}>{t("vat.refundable")}</th>
                </tr>
              </thead>
              <tbody>
                {summary.rows.map((r) => (
                  <tr key={r.country}>
                    <td style={styles.td}>
                      <strong>{r.country}</strong>{" "}
                      <span style={{ color: palette.smoke }}>{countryName(r.country)}</span>
                    </td>
                    <td style={styles.tdNum}>{r.count}</td>
                    <td style={styles.tdNum}>{r.liters ? `${r.liters} L` : "—"}</td>
                    <td style={styles.tdNum}>{r.grossEur} €</td>
                    <td style={styles.tdNum}>{r.ratePct != null ? `${r.ratePct}%` : "—"}</td>
                    <td style={styles.tdNum}>
                      {/* Trzy stany, trzy różne wyglądy. Gdyby „nie wiemy" i „kraj
                          nie zwraca" wyglądały tak samo, użytkownik nie miałby jak
                          odróżnić braku danych od informacji. */}
                      {r.refundableEur === null ? (
                        <span style={{ color: palette.warning }}>{t("vat.unknownRate")}</span>
                      ) : r.refundable === false ? (
                        <span style={{ color: palette.smoke }}>{t("vat.noRefund")}</span>
                      ) : (
                        <strong style={{ color: "#22c55e" }}>{r.refundableEur} €</strong>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {summary.unknownCountries.length > 0 && (
            <p style={styles.note}>
              ⚠️ {t("vat.unknownNote")} ({summary.unknownCountries.join(", ")})
            </p>
          )}
          {summary.missingRate > 0 && (
            <p style={styles.note}>
              ⚠️ {summary.missingRate} {t("vat.missingRate")}
            </p>
          )}
          <p style={styles.note}>{t("vat.adblueNote")}</p>
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  box: {
    marginTop: 28,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 12,
    padding: 16,
    background: palette.nearBlack,
  },
  head: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  total: { fontSize: 14, color: palette.offWhite },
  sub: { color: palette.smoke, fontSize: 13, margin: "6px 0 14px", lineHeight: 1.5 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: {
    textAlign: "left",
    padding: "8px 10px",
    color: palette.smoke,
    fontSize: 12,
    fontWeight: 600,
    borderBottom: `1px solid ${palette.graphite}`,
  },
  thNum: {
    textAlign: "right",
    padding: "8px 10px",
    color: palette.smoke,
    fontSize: 12,
    fontWeight: 600,
    borderBottom: `1px solid ${palette.graphite}`,
  },
  td: { padding: "9px 10px", borderBottom: `1px solid ${palette.graphite}` },
  tdNum: {
    padding: "9px 10px",
    textAlign: "right",
    borderBottom: `1px solid ${palette.graphite}`,
  },
  note: { color: palette.smoke, fontSize: 12, lineHeight: 1.6, marginTop: 10 },
};
