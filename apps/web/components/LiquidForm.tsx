"use client";

import { fuelLogSchema, PAYMENT_METHODS } from "@e-logistic/core";
import { createTranslator } from "@e-logistic/i18n";
import { palette } from "@e-logistic/ui";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PlaceSearch } from "@/components/PlaceSearch";
import { enqueue } from "@/lib/outbox";
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

const t = createTranslator("pl");

/** Formularz „płynów" — paliwo lub AdBlue (ta sama struktura, `fuelLogSchema`). */
export function LiquidForm({ kind }: { kind: "fuel" | "adblue" }) {
  const title = kind === "fuel" ? t("form.fuel.title") : t("form.adblue.title");

  const { vehicles, cards } = useFleet();
  const [vehicleId, setVehicleId] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [odometerKm, setOdometerKm] = useState("");
  const [liters, setLiters] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<(typeof PAYMENT_METHODS)[number]>("card");
  const [fuelCardId, setFuelCardId] = useState("");
  const [priceTotal, setPriceTotal] = useState("");
  const [comment, setComment] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!vehicleId && vehicles[0]) setVehicleId(vehicles[0].id);
  }, [vehicles, vehicleId]);
  useEffect(() => {
    if (!fuelCardId && cards[0]) setFuelCardId(cards[0].id);
  }, [cards, fuelCardId]);

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
    setErrors({});
    setStatus(null);

    const input = {
      vehicleId,
      station: { country, city: city || undefined, lat: coords?.lat, lng: coords?.lng },
      odometerKm: Number(odometerKm),
      liters: Number(liters),
      paymentMethod,
      fuelCardId: paymentMethod === "card" ? fuelCardId || undefined : undefined,
      priceTotal: priceTotal ? Number(priceTotal) : undefined,
      comment: comment || undefined,
    };

    const parsed = fuelLogSchema.safeParse(input);
    if (!parsed.success) {
      const map: Record<string, string> = {};
      for (const issue of parsed.error.issues) map[issue.path.join(".")] = issue.message;
      setErrors(map);
      setStatus("Popraw błędy w formularzu.");
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
    setPriceTotal("");
    setComment("");
  }

  return (
    <div style={{ maxWidth: 520 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>{title}</h1>
      <p style={{ color: palette.smoke, marginTop: 4 }}>
        Walidacja na współdzielonym schemacie Zod (offline-first).{" "}
        <Link href="/forms/history" style={{ color: palette.red }}>
          {t("common.history")} →
        </Link>
      </p>

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
        </Field>

        <Field label={t("form.field.comment")} error={errors.comment}>
          <textarea
            style={{ ...styles.input, minHeight: 70 }}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </Field>

        <button type="button" style={styles.primary} onClick={submit}>
          {t("common.save")}
        </button>

        {status && <p style={{ color: palette.smoke, fontSize: 14 }}>{status}</p>}
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: kontrolka (input/select/textarea) jest przekazywana przez children
    <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
      <span style={{ fontSize: 12, color: palette.smoke }}>{label}</span>
      {children}
      {error && <span style={{ color: palette.red, fontSize: 12 }}>{error}</span>}
    </label>
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
};
