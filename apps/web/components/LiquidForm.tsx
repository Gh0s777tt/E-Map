"use client";

import { getFuelLog, listFuelLogs, updateFuelLog } from "@e-logistic/api";
import {
  fuelLogSchema,
  latestUnitPrice,
  PAYMENT_METHODS,
  round2,
  setupMessage,
  zodFieldErrors,
} from "@e-logistic/core";
import { cssPalette as palette } from "@e-logistic/ui";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Field } from "@/components/Field";
import { useT } from "@/components/LocaleProvider";
import { PlaceSearch } from "@/components/PlaceSearch";
import { enqueue } from "@/lib/outbox";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { useFleet } from "@/lib/useFleet";

/** Z etykiety geokodera „Miasto, …, Kraj" wyciąga miasto (pierwszy człon) i kraj (ostatni). */
function splitPlace(label: string): { city: string; country: string } {
  const parts = label
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    city: parts[0] ?? label,
    country: parts.length > 1 ? (parts[parts.length - 1] ?? "") : "",
  };
}

/** Formularz „płynów" — paliwo lub AdBlue (ta sama struktura, `fuelLogSchema`). */
export function LiquidForm({ kind }: { kind: "fuel" | "adblue" }) {
  const t = useT();
  const title = kind === "fuel" ? t("form.fuel.title") : t("form.adblue.title");

  const { vehicles, cards, source } = useFleet();
  const setupMsg = setupMessage(source, {
    noCompany: "Najpierw utwórz firmę na Pulpicie, aby zapisywać i synchronizować formularze.",
    noVehicles: "Dodaj pojazd w zakładce Pojazdy, aby móc zapisać formularz.",
  });
  const [vehicleId, setVehicleId] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [odometerKm, setOdometerKm] = useState("");
  const [liters, setLiters] = useState("");
  const [isFull, setIsFull] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<(typeof PAYMENT_METHODS)[number]>("card");
  const [fuelCardId, setFuelCardId] = useState("");
  const [priceTotal, setPriceTotal] = useState("");
  const [comment, setComment] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [lastPriceInfo, setLastPriceInfo] = useState("");

  const table = kind === "adblue" ? "adblue_logs" : "fuel_logs";

  // Tryb edycji: ?edit=<id> → wczytaj istniejący wpis i wypełnij pola.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("edit");
    if (!id) return;
    setEditId(id);
    (async () => {
      try {
        const row = (await getFuelLog(getBrowserSupabase(), id, table)) as {
          vehicle_id: string;
          station_country: string;
          station_city: string | null;
          odometer_km: number;
          liters: number;
          is_full?: boolean;
          payment_method: "card" | "cash";
          fuel_card_id: string | null;
          price_total: number | null;
          comment: string | null;
        };
        setVehicleId(row.vehicle_id);
        setCountry(row.station_country);
        setCity(row.station_city ?? "");
        setOdometerKm(String(row.odometer_km));
        setLiters(String(row.liters));
        setIsFull(row.is_full !== false);
        setPaymentMethod(row.payment_method);
        if (row.fuel_card_id) setFuelCardId(row.fuel_card_id);
        setPriceTotal(row.price_total != null ? String(row.price_total) : "");
        setComment(row.comment ?? "");
      } catch (e) {
        setStatus(e instanceof Error ? e.message : "Nie udało się wczytać wpisu do edycji.");
      }
    })();
  }, [table]);

  useEffect(() => {
    if (!editId && !vehicleId && vehicles[0]) setVehicleId(vehicles[0].id);
  }, [vehicles, vehicleId, editId]);
  useEffect(() => {
    if (!fuelCardId && cards[0]) setFuelCardId(cards[0].id);
  }, [cards, fuelCardId]);

  // Podpowiedź ceny: ostatnia cena jednostkowa z historii pojazdu (paliwo/AdBlue).
  useEffect(() => {
    if (!vehicleId) {
      setLastPrice(null);
      setLastPriceInfo("");
      return;
    }
    (async () => {
      try {
        const rows = (await listFuelLogs(getBrowserSupabase(), { vehicleId, table })) as {
          liters: number;
          price_total: number | null;
          station_city: string | null;
          station_country: string | null;
          created_at: string;
        }[];
        const up = latestUnitPrice(
          rows.map((r) => ({ liters: r.liters, priceTotal: r.price_total })),
        );
        setLastPrice(up);
        const top = rows.find((r) => r.price_total != null && r.price_total > 0 && r.liters > 0);
        setLastPriceInfo(
          up != null && top
            ? `${[top.station_city, top.station_country].filter(Boolean).join(", ")} · ${top.created_at.slice(0, 10)}`.trim()
            : "",
        );
      } catch {
        setLastPrice(null);
        setLastPriceInfo("");
      }
    })();
  }, [vehicleId, table]);

  function fillGps() {
    if (!navigator.geolocation) {
      setStatus("GPS niedostępny w tej przeglądarce.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus("Pobrano współrzędne GPS.");
      },
      () => setStatus("Nie udało się pobrać GPS — wpisz lokalizację ręcznie."),
    );
  }

  async function submit() {
    if (setupMsg) {
      setStatus(`⚠️ ${setupMsg}`);
      return;
    }
    setErrors({});
    setStatus(null);

    const input = {
      vehicleId,
      station: { country, city: city || undefined, lat: coords?.lat, lng: coords?.lng },
      odometerKm: Number(odometerKm),
      liters: Number(liters),
      isFull,
      paymentMethod,
      fuelCardId: paymentMethod === "card" ? fuelCardId || undefined : undefined,
      priceTotal: priceTotal ? Number(priceTotal) : undefined,
      comment: comment || undefined,
    };

    const parsed = fuelLogSchema.safeParse(input);
    if (!parsed.success) {
      const map = zodFieldErrors(parsed.error);
      setErrors(map);
      setStatus("Popraw błędy w formularzu.");
      return;
    }

    if (editId) {
      try {
        await updateFuelLog(getBrowserSupabase(), editId, parsed.data, table);
        setStatus("✅ Zmiany zapisane. Przekierowuję do historii…");
        setTimeout(() => {
          window.location.href = "/forms/history";
        }, 900);
      } catch (e) {
        setStatus(e instanceof Error ? e.message : "Błąd zapisu zmian.");
      }
      return;
    }

    const item = await enqueue(kind, parsed.data, new Date().toISOString());
    setStatus(
      item.status === "synced"
        ? "✅ Zapisano i zsynchronizowano."
        : item.status === "error"
          ? `📥 Zapisano lokalnie (w kolejce). ${item.error ?? ""}`
          : "📥 Zapisano lokalnie — synchronizacja po połączeniu.",
    );
    setOdometerKm("");
    setLiters("");
    setIsFull(true);
    setPriceTotal("");
    setComment("");
  }

  return (
    <div style={{ maxWidth: 520 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>
        {title}
        {editId ? " · edycja" : ""}
      </h1>
      <p style={{ color: palette.smoke, marginTop: 4 }}>
        Walidacja na współdzielonym schemacie Zod (offline-first).{" "}
        <Link href="/forms/history" style={{ color: palette.red }}>
          {t("common.history")} →
        </Link>
      </p>

      {setupMsg && (
        <div
          style={{
            margin: "12px 0",
            padding: 12,
            borderRadius: 10,
            background: palette.nearBlack,
            border: `1px solid ${palette.red}`,
            color: palette.offWhite,
            fontSize: 14,
          }}
        >
          ⚠️ {setupMsg}{" "}
          <Link href="/dashboard" style={{ color: palette.red }}>
            Pulpit
          </Link>{" "}
          ·{" "}
          <Link href="/vehicles" style={{ color: palette.red }}>
            Pojazdy
          </Link>
        </div>
      )}

      <div style={styles.form}>
        <Field label={t("form.field.vehicle")} error={errors.vehicleId}>
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
        </Field>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 12, color: palette.smoke }}>Wyszukaj miejsce (adres → GPS)</span>
          <PlaceSearch
            onPick={(h) => {
              const p = splitPlace(h.label);
              setCity(p.city);
              if (p.country) setCountry(p.country);
              setCoords({ lat: h.lat, lng: h.lng });
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <Field label={t("form.field.country")} error={errors["station.country"]}>
            <input
              style={styles.input}
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="DE"
            />
          </Field>
          <Field label={t("form.field.location")} error={errors["station.city"]}>
            <input
              style={styles.input}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Berlin"
            />
          </Field>
        </div>

        <button type="button" style={styles.ghost} onClick={fillGps}>
          📍 Pobierz GPS {coords ? `(${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)})` : ""}
        </button>

        <div style={{ display: "flex", gap: 12 }}>
          <Field label={t("form.field.odometer")} error={errors.odometerKm}>
            <input
              style={styles.input}
              type="number"
              value={odometerKm}
              onChange={(e) => setOdometerKm(e.target.value)}
            />
          </Field>
          <Field label={t("form.field.liters")} error={errors.liters}>
            <input
              style={styles.input}
              type="number"
              value={liters}
              onChange={(e) => setLiters(e.target.value)}
            />
          </Field>
        </div>

        {kind === "fuel" && (
          <label
            style={{
              color: palette.offWhite,
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <input type="checkbox" checked={isFull} onChange={(e) => setIsFull(e.target.checked)} />
            Zatankowano do pełna (potrzebne do liczenia spalania)
          </label>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 12, color: palette.smoke }}>
            {t("form.field.paymentMethod")}
          </span>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            {PAYMENT_METHODS.map((m) => (
              <label key={m} style={{ color: palette.offWhite, fontSize: 14 }}>
                <input
                  type="radio"
                  name="pm"
                  checked={paymentMethod === m}
                  onChange={() => setPaymentMethod(m)}
                />{" "}
                {m === "card" ? t("form.payment.card") : t("form.payment.cash")}
              </label>
            ))}
          </div>
        </div>

        {paymentMethod === "card" && (
          <Field label={t("nav.cards")} error={errors.fuelCardId}>
            <select
              style={styles.input}
              value={fuelCardId}
              onChange={(e) => setFuelCardId(e.target.value)}
            >
              {cards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field label={`${t("form.field.amount")} (opcjonalnie)`} error={errors.priceTotal}>
          <input
            style={styles.input}
            type="number"
            value={priceTotal}
            onChange={(e) => setPriceTotal(e.target.value)}
          />
          {lastPrice != null && (
            <span style={{ fontSize: 12, color: palette.smoke }}>
              Ostatnia cena: <strong style={{ color: palette.offWhite }}>{lastPrice} /l</strong>
              {lastPriceInfo ? ` · ${lastPriceInfo}` : ""}{" "}
              <button
                type="button"
                style={styles.linkBtn}
                onClick={() => {
                  const l = Number(liters);
                  if (l > 0 && lastPrice != null) setPriceTotal(String(round2(l * lastPrice)));
                  else setStatus("Podaj najpierw litry, aby przeliczyć kwotę.");
                }}
              >
                Przelicz kwotę
              </button>
            </span>
          )}
        </Field>

        <Field label={t("form.field.comment")} error={errors.comment}>
          <textarea
            style={{ ...styles.input, minHeight: 70 }}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </Field>

        <button
          type="button"
          style={{ ...styles.primary, opacity: setupMsg ? 0.5 : 1 }}
          onClick={submit}
          disabled={!!setupMsg}
        >
          {t("common.save")}
        </button>

        {status && <p style={{ color: palette.smoke, fontSize: 14 }}>{status}</p>}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: { display: "flex", flexDirection: "column", gap: 14, marginTop: 20 },
  input: {
    background: palette.black,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
    padding: "10px 12px",
    color: palette.offWhite,
    width: "100%",
  },
  primary: {
    marginTop: 8,
    background: palette.red,
    color: palette.white,
    border: "none",
    borderRadius: 8,
    padding: "12px",
    fontWeight: 700,
    cursor: "pointer",
  },
  ghost: {
    background: "transparent",
    color: palette.offWhite,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
    padding: "9px 12px",
    cursor: "pointer",
    alignSelf: "flex-start",
  },
  linkBtn: {
    background: "transparent",
    color: palette.red,
    border: "none",
    padding: 0,
    cursor: "pointer",
    fontSize: 12,
    textDecoration: "underline",
  },
};
