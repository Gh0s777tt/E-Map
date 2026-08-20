"use client";

/**
 * [#375] Import tankowań z pliku (CSV / Excel).
 *
 * Powód istnienia: firma dostaje od operatora karty paliwowej miesięczne
 * zestawienie z dwustoma pozycjami. Przepisywanie ich ręcznie przez formularz
 * to kilka godzin pracy i tyle samo okazji do pomyłki — a bez tych wpisów nie ma
 * ani zwrotu VAT, ani spalania.
 *
 * Trzy decyzje, które widać w kodzie:
 *
 * 1. **Stan licznika jest wymagany.** Kolumna `odometer_km` jest NOT NULL, ale
 *    nie to jest powodem — podstawienie zera przy braku danych zafałszowałoby
 *    spalanie każdego kolejnego tankowania tego auta (silnik liczy różnice
 *    przebiegów). Lepiej odrzucić wiersz i powiedzieć wprost, czego brakuje.
 *
 * 2. **Duplikaty wyłapujemy PRZED zapisem**, nie po. Wgranie tego samego
 *    zestawienia dwa razy to najbardziej prawdopodobny błąd użytkownika, a każdy
 *    import generuje nowe UUID-y, więc idempotencja po kluczu nie zadziała.
 *    Porównujemy trójkę pojazd + moment + litry i pokazujemy trafienia
 *    w podglądzie — użytkownik widzi je, zanim cokolwiek trafi do bazy.
 *
 * 3. **Kraj przechodzi przez `fuelLogSchema`**, więc „Deutschland" z niemieckiego
 *    zestawienia zapisze się jako `DE`, a wpis, którego nie da się rozpoznać,
 *    zatrzyma się na podglądzie zamiast wypaść później z rozliczenia VAT (#372).
 *
 * 4. **Kartę wskazuje użytkownik, nie plik.** Schemat wymaga `fuelCardId` przy
 *    płatności kartą i słusznie: bez tego nie wiadomo, z czyjego limitu poszło
 *    tankowanie. Zestawienie pochodzi z jednej karty, więc wybiera się ją raz
 *    dla całego pliku, zamiast szukać numeru w kolumnach — numerów kart i tak
 *    nie trzymamy w całości ([`cardMask.ts`](packages/core/src/cardMask.ts)).
 */

import { insertFuelLog, listFuelLogs } from "@e-logistic/api";
import { newId } from "@e-logistic/core";
import { cssPalette as palette } from "@e-logistic/ui";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DataImport, type ImportColumn, type ImportResult } from "@/components/DataImport";
import { useT } from "@/components/LocaleProvider";
import {
  buildFuelImportRow,
  type FuelImportRow,
  fuelImportDupKey,
  normalizeRegistration,
} from "@/lib/fuelImport";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { useFleet } from "@/lib/useFleet";

type Kind = "fuel" | "adblue";
const TABLE: Record<Kind, "fuel_logs" | "adblue_logs"> = {
  fuel: "fuel_logs",
  adblue: "adblue_logs",
};

/** Nagłówki zgodne z eksportem historii + warianty spotykane u operatorów kart. */
const COLUMNS: ImportColumn[] = [
  {
    key: "vehicle",
    label: "Pojazd",
    aliases: ["rejestracja", "registration", "nr rej", "vehicle", "kennzeichen"],
    required: true,
  },
  {
    key: "date",
    label: "Data",
    aliases: ["data", "date", "datum", "data transakcji"],
    required: true,
  },
  {
    key: "country",
    label: "Kraj",
    aliases: ["country", "land", "kraj tankowania"],
    required: true,
  },
  { key: "city", label: "Miejscowość", aliases: ["miasto", "city", "ort", "stacja", "station"] },
  {
    key: "odometer",
    label: "Stan licznika (km)",
    aliases: ["licznik", "przebieg", "odometer", "km", "kilometrstand"],
    required: true,
  },
  {
    key: "liters",
    label: "Litry",
    aliases: ["litry", "liters", "ilość", "menge", "l"],
    required: true,
  },
  {
    key: "gross",
    label: "Brutto",
    aliases: ["kwota", "cena", "wartość", "gross", "brutto", "amount"],
  },
  { key: "currency", label: "Waluta", aliases: ["currency", "waluta", "währung"] },
  { key: "net", label: "Netto", aliases: ["net", "netto", "wartość netto"] },
  { key: "vatRate", label: "VAT %", aliases: ["vat", "stawka vat", "podatek"] },
  { key: "payment", label: "Forma płatności", aliases: ["płatność", "payment", "zapłata"] },
  { key: "full", label: "Do pełna", aliases: ["pełny bak", "full", "do pelna"] },
  { key: "comment", label: "Opis", aliases: ["opis", "komentarz", "uwagi", "comment", "notes"] },
];

export default function FormsImportPage() {
  const t = useT();
  const { vehicles, cards, source } = useFleet();
  const [kind, setKind] = useState<Kind>("fuel");
  const [cardId, setCardId] = useState("");
  const [existing, setExisting] = useState<Set<string>>(new Set());

  /** Rejestracja → id. Porównanie bez spacji i wielkości liter: w arkuszach
      ta sama tablica bywa „WX 1234", „wx1234" i „WX-1234". */
  const byRegistration = useMemo(() => {
    const m = new Map<string, string>();
    for (const v of vehicles) m.set(normalizeRegistration(v.registration), v.id);
    return m;
  }, [vehicles]);

  const loadExisting = useCallback(async () => {
    try {
      const sb = getBrowserSupabase();
      const rows = (await listFuelLogs(sb, { table: TABLE[kind], limit: 1000 })) as {
        vehicle_id: string;
        occurred_at: string;
        liters: number;
      }[];
      setExisting(
        new Set(rows.map((r) => fuelImportDupKey(r.vehicle_id, r.occurred_at, Number(r.liters)))),
      );
    } catch {
      // Brak sesji/offline — import i tak nie zadziała, a podgląd nie może się
      // wywalić przez to, że nie udało się pobrać listy do porównania.
      setExisting(new Set());
    }
  }, [kind]);

  useEffect(() => {
    loadExisting();
  }, [loadExisting]);

  const validate = useCallback(
    (rec: Record<string, string>) =>
      buildFuelImportRow(rec, {
        resolveVehicle: (reg) => byRegistration.get(normalizeRegistration(reg)),
        cardId,
        existing,
        messages: {
          vehicleUnknown: t("history.importVehicleUnknown"),
          pickCard: t("history.importPickCard"),
        },
      }),
    [byRegistration, cardId, existing, t],
  );

  const onImport = useCallback(
    async (values: FuelImportRow[]): Promise<ImportResult> => {
      const sb = getBrowserSupabase();
      const m = await getCachedMembership(sb);
      if (!m) throw new Error(t("history.importNoCompany"));
      const { data: auth } = await sb.auth.getUser();
      const driverId = auth.user?.id;
      if (!driverId) throw new Error(t("history.importNoSession"));

      let inserted = 0;
      const errors: string[] = [];
      for (const v of values) {
        try {
          await insertFuelLog(
            sb,
            v.input,
            { id: newId(), companyId: m.companyId, driverId },
            TABLE[kind],
          );
          inserted++;
        } catch (e) {
          errors.push(`${v.registration}: ${e instanceof Error ? e.message : "błąd zapisu"}`);
        }
      }
      await loadExisting();
      return { inserted, failed: errors.length, errors };
    },
    [kind, loadExisting, t],
  );

  return (
    <div style={{ maxWidth: 760 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>{t("history.importTitle")}</h1>
      <p style={{ color: palette.smoke, marginTop: 6, lineHeight: 1.5 }}>
        {t("history.importHint")}
      </p>

      {source === "no-vehicles" || vehicles.length === 0 ? (
        <p style={{ color: palette.red, marginTop: 20 }}>{t("history.importNoVehicles")}</p>
      ) : (
        <>
          <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "20px 0 12px" }}>
            <span style={{ color: palette.smoke, fontSize: 13 }}>{t("history.importKind")}:</span>
            {(["fuel", "adblue"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                style={kind === k ? chipActive : chip}
              >
                {t(`history.kind.${k}`)}
              </button>
            ))}
          </div>

          {/* Karta dla całego pliku. Bez niej wiersze płacone kartą nie przejdą
              walidacji — i tak ma być: wpis bez karty nie mówi, z czyjego limitu
              poszło tankowanie. */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14 }}>
            <span style={{ color: palette.smoke, fontSize: 13 }}>{t("history.importCard")}:</span>
            <select
              value={cardId}
              onChange={(e) => setCardId(e.target.value)}
              style={{
                background: palette.black,
                color: palette.offWhite,
                border: `1px solid ${cardId ? palette.graphite : palette.red}`,
                borderRadius: 8,
                padding: "6px 10px",
                fontSize: 13,
              }}
            >
              <option value="">{t("history.importCardNone")}</option>
              {cards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                  {c.registration ? ` · ${c.registration}` : ""}
                </option>
              ))}
            </select>
          </div>

          <DataImport
            key={`${kind}/${cardId}`}
            columns={COLUMNS}
            validate={validate}
            onImport={onImport}
            templateBase={kind === "fuel" ? "tankowania" : "adblue"}
          />
        </>
      )}

      <p style={{ marginTop: 24 }}>
        <Link href="/forms/history" style={{ color: palette.smoke, fontSize: 14 }}>
          ← {t("common.history")}
        </Link>
      </p>
    </div>
  );
}

const chip: React.CSSProperties = {
  background: "transparent",
  color: palette.smoke,
  border: `1px solid ${palette.graphite}`,
  borderRadius: 999,
  padding: "5px 14px",
  fontSize: 13,
  cursor: "pointer",
};
const chipActive: React.CSSProperties = {
  ...chip,
  background: palette.red,
  color: palette.white,
  border: `1px solid ${palette.red}`,
  fontWeight: 700,
};
