"use client";

import { TRIP_ACTIONS, tripEventSchema } from "@e-logistic/core";
import { createTranslator } from "@e-logistic/i18n";
import { palette } from "@e-logistic/ui";
import Link from "next/link";
import { useState } from "react";
import { Field, fieldInputStyle as input } from "@/components/Field";
import { DEMO_VEHICLES as VEHICLES } from "@/lib/demo";
import { enqueue } from "@/lib/outbox";

const t = createTranslator("pl");

export default function TripFormPage() {
  const [vehicleId, setVehicleId] = useState(VEHICLES[0]?.id ?? "");
  const [action, setAction] = useState<(typeof TRIP_ACTIONS)[number]>("load");
  const [country, setCountry] = useState("");
  const [location, setLocation] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [odometerKm, setOdometerKm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string | null>(null);

  const needsWeight = action === "load" || action === "unload";
  const needsAmount = action === "service" || action === "other";
  const commentRequired = action === "service" || action === "other";

  function fillGps() {
    if (!navigator.geolocation) {
      setStatus("GPS niedostępny w tej przeglądarce.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setStatus("Nie udało się pobrać GPS — wpisz lokalizację ręcznie."),
    );
  }

  async function submit() {
    setErrors({});
    setStatus(null);

    const base = {
      action,
      vehicleId,
      place: { country, location: location || undefined, lat: coords?.lat, lng: coords?.lng },
      odometerKm: Number(odometerKm),
      comment: comment || undefined,
    };
    const candidate = needsWeight
      ? { ...base, weightKg: weightKg ? Number(weightKg) : undefined }
      : needsAmount
        ? { ...base, amount: amount ? Number(amount) : undefined }
        : base;

    const parsed = tripEventSchema.safeParse(candidate);
    if (!parsed.success) {
      const map: Record<string, string> = {};
      for (const issue of parsed.error.issues) map[issue.path.join(".")] = issue.message;
      setErrors(map);
      setStatus("Popraw błędy w formularzu.");
      return;
    }

    const item = await enqueue("trip", parsed.data, new Date().toISOString());
    setStatus(
      item.status === "synced"
        ? "✅ Zapisano i zsynchronizowano."
        : "📥 Zapisano lokalnie — synchronizacja po połączeniu.",
    );
    setOdometerKm("");
    setWeightKg("");
    setAmount("");
    setComment("");
  }

  return (
    <div style={{ maxWidth: 520 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>{t("form.trip.title")}</h1>
      <p style={{ color: palette.smoke, marginTop: 4 }}>
        Pola zależne od akcji (walidacja warunkowa Zod).{" "}
        <Link href="/forms/history" style={{ color: palette.red }}>
          {t("common.history")} →
        </Link>
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 20 }}>
        <Field label={t("form.field.vehicle")} error={errors.vehicleId}>
          <select style={input} value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
            {VEHICLES.map((v) => (
              <option key={v.id} value={v.id}>
                {v.registration}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Akcja" error={errors.action}>
          <select
            style={input}
            value={action}
            onChange={(e) => setAction(e.target.value as (typeof TRIP_ACTIONS)[number])}
          >
            {TRIP_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {t(`trip.action.${a}`)}
              </option>
            ))}
          </select>
        </Field>

        <div style={{ display: "flex", gap: 12 }}>
          <Field label={t("form.field.country")} error={errors["place.country"]}>
            <input
              style={input}
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="PL"
            />
          </Field>
          <Field label={t("form.field.location")} error={errors["place.location"]}>
            <input
              style={input}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Poznań"
            />
          </Field>
        </div>

        <button
          type="button"
          style={{
            background: "transparent",
            color: palette.offWhite,
            border: `1px solid ${palette.graphite}`,
            borderRadius: 8,
            padding: "9px 12px",
            cursor: "pointer",
            alignSelf: "flex-start",
          }}
          onClick={fillGps}
        >
          📍 Pobierz GPS {coords ? `(${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)})` : ""}
        </button>

        <div style={{ display: "flex", gap: 12 }}>
          <Field label={t("form.field.odometer")} error={errors.odometerKm}>
            <input
              style={input}
              type="number"
              value={odometerKm}
              onChange={(e) => setOdometerKm(e.target.value)}
            />
          </Field>
          {needsWeight && (
            <Field label={t("form.field.weight")} error={errors.weightKg}>
              <input
                style={input}
                type="number"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
              />
            </Field>
          )}
          {needsAmount && (
            <Field label={`${t("form.field.amount")} (opcjonalnie)`} error={errors.amount}>
              <input
                style={input}
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
          )}
        </div>

        <Field
          label={`${t("form.field.comment")}${commentRequired ? " (wymagane)" : ""}`}
          error={errors.comment}
        >
          <textarea
            style={{ ...input, minHeight: 70 }}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={action === "service" ? "Co zostało naprawione?" : ""}
          />
        </Field>

        <button
          type="button"
          style={{
            background: palette.red,
            color: palette.white,
            border: "none",
            borderRadius: 8,
            padding: "12px",
            fontWeight: 700,
            cursor: "pointer",
          }}
          onClick={submit}
        >
          {t("common.save")}
        </button>

        {status && <p style={{ color: palette.smoke, fontSize: 14 }}>{status}</p>}
      </div>
    </div>
  );
}
