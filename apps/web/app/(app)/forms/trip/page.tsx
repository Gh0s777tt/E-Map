"use client";

import { getTripEvent, notifyCompany, updateTripEvent } from "@e-logistic/api";
import { setupMessage, TRIP_ACTIONS, tripEventSchema } from "@e-logistic/core";
import { createTranslator } from "@e-logistic/i18n";
import { palette } from "@e-logistic/ui";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Field, fieldInputStyle as input } from "@/components/Field";
import { PlaceSearch } from "@/components/PlaceSearch";
import { getCachedMembership } from "@/lib/membership";
import { enqueue } from "@/lib/outbox";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { useFleet } from "@/lib/useFleet";

const t = createTranslator("pl");

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

export default function TripFormPage() {
  const { vehicles, source } = useFleet();
  const setupMsg = setupMessage(source, {
    noCompany: "Najpierw utwórz firmę na Pulpicie, aby zapisywać i synchronizować formularze.",
    noVehicles: "Dodaj pojazd w zakładce Pojazdy, aby móc zapisać formularz.",
  });
  const [vehicleId, setVehicleId] = useState("");
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
  const [editId, setEditId] = useState<string | null>(null);

  // Tryb edycji: ?edit=<id> → wczytaj istniejące zdarzenie.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("edit");
    if (!id) return;
    setEditId(id);
    (async () => {
      try {
        const row = (await getTripEvent(getBrowserSupabase(), id)) as {
          vehicle_id: string;
          action: (typeof TRIP_ACTIONS)[number];
          country: string;
          location: string | null;
          odometer_km: number;
          weight_kg: number | null;
          amount: number | null;
          comment: string | null;
        };
        setVehicleId(row.vehicle_id);
        setAction(row.action);
        setCountry(row.country);
        setLocation(row.location ?? "");
        setOdometerKm(String(row.odometer_km));
        setWeightKg(row.weight_kg != null ? String(row.weight_kg) : "");
        setAmount(row.amount != null ? String(row.amount) : "");
        setComment(row.comment ?? "");
      } catch (e) {
        setStatus(e instanceof Error ? e.message : "Nie udało się wczytać zdarzenia do edycji.");
      }
    })();
  }, []);

  useEffect(() => {
    if (!editId && !vehicleId && vehicles[0]) setVehicleId(vehicles[0].id);
  }, [vehicles, vehicleId, editId]);

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
    if (setupMsg) {
      setStatus(`⚠️ ${setupMsg}`);
      return;
    }
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

    if (editId) {
      try {
        await updateTripEvent(getBrowserSupabase(), editId, parsed.data);
        setStatus("✅ Zmiany zapisane. Przekierowuję do historii…");
        setTimeout(() => {
          window.location.href = "/forms/history";
        }, 900);
      } catch (e) {
        setStatus(e instanceof Error ? e.message : "Błąd zapisu zmian.");
      }
      return;
    }

    const item = await enqueue("trip", parsed.data, new Date().toISOString());

    // Kontrola przeładowania: waga załadunku > maks. ładowność pojazdu.
    const veh = vehicles.find((v) => v.id === vehicleId);
    const maxKg = veh?.maxPayloadKg ?? null;
    const w = weightKg ? Number(weightKg) : 0;
    let overloadMsg = "";
    if (action === "load" && maxKg && w > maxKg) {
      const over = w - maxKg;
      overloadMsg = ` ⚠️ PRZEŁADOWANIE: ${w} kg > ładowność ${maxKg} kg (o ${over} kg)!`;
      try {
        const sb = getBrowserSupabase();
        const m = await getCachedMembership(sb);
        if (m) {
          await notifyCompany(sb, {
            companyId: m.companyId,
            type: "overload",
            title: `Przeładowanie ${veh?.registration ?? "pojazdu"}`,
            body: `Załadunek ${w} kg przekracza ładowność ${maxKg} kg o ${over} kg.`,
            severity: "danger",
          });
        }
      } catch {
        // brak firmy/sesji — pomijamy powiadomienie
      }
    }

    setStatus(
      (item.status === "synced"
        ? "✅ Zapisano i zsynchronizowano."
        : "📥 Zapisano lokalnie — synchronizacja po połączeniu.") + overloadMsg,
    );
    setOdometerKm("");
    setWeightKg("");
    setAmount("");
    setComment("");
  }

  return (
    <div style={{ maxWidth: 520 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>
        {t("form.trip.title")}
        {editId ? " · edycja" : ""}
      </h1>
      <p style={{ color: palette.smoke, marginTop: 4 }}>
        Pola zależne od akcji (walidacja warunkowa Zod).{" "}
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

      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 20 }}>
        <Field label={t("form.field.vehicle")} error={errors.vehicleId}>
          <select style={input} value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
            {vehicles.map((v) => (
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

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 12, color: palette.smoke }}>Wyszukaj miejsce (adres → GPS)</span>
          <PlaceSearch
            onPick={(h) => {
              const p = splitPlace(h.label);
              setLocation(p.city);
              if (p.country) setCountry(p.country);
              setCoords({ lat: h.lat, lng: h.lng });
            }}
          />
        </div>

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
            opacity: setupMsg ? 0.5 : 1,
          }}
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
