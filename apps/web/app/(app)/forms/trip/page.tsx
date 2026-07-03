"use client";

import {
  getTripEvent,
  listOrders,
  listTripEvents,
  notifyCompany,
  type Order,
  updateTripEvent,
} from "@e-logistic/api";
import { setupMessage, TRIP_ACTIONS, tripEventSchema, zodFieldErrors } from "@e-logistic/core";
import { cssPalette as palette } from "@e-logistic/ui";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Field, fieldInputStyle as input } from "@/components/Field";
import { useT } from "@/components/LocaleProvider";
import { PlaceSearch } from "@/components/PlaceSearch";
import { useToast } from "@/components/Toast";
import { getCachedMembership } from "@/lib/membership";
import { enqueue } from "@/lib/outbox";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { useFleet } from "@/lib/useFleet";

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

/** Czytelna etykieta zlecenia w pickerze: numer · trasa/ładunek. */
function orderLabel(o: Order): string {
  const ref = o.reference_no ? `#${o.reference_no}` : "";
  const route = [o.origin, o.destination].filter(Boolean).join(" → ");
  return [ref, route || o.cargo || o.id.slice(0, 8)].filter(Boolean).join(" · ");
}

const ORDER_OPEN_STATUSES = ["new", "assigned", "in_progress"];

export default function TripFormPage() {
  const { vehicles, source } = useFleet();
  const t = useT();
  const toast = useToast();
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
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [editId, setEditId] = useState<string | null>(null);
  // #245: powiązanie load/unload ze zleceniem → auto-zamknięcie po komplecie load+unload.
  const [orderId, setOrderId] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);

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
          // opcjonalne: kolumna dochodzi migracją 0052 (typy DB dogonią po gen:types).
          order_id?: string | null;
        };
        setVehicleId(row.vehicle_id);
        setAction(row.action);
        setCountry(row.country);
        setLocation(row.location ?? "");
        setOdometerKm(String(row.odometer_km));
        setWeightKg(row.weight_kg != null ? String(row.weight_kg) : "");
        setAmount(row.amount != null ? String(row.amount) : "");
        setComment(row.comment ?? "");
        setOrderId(row.order_id ?? "");
      } catch (e) {
        toast(
          e instanceof Error ? e.message : "Nie udało się wczytać zdarzenia do edycji.",
          "error",
        );
      }
    })();
  }, [toast]);

  useEffect(() => {
    if (!editId && !vehicleId && vehicles[0]) setVehicleId(vehicles[0].id);
  }, [vehicles, vehicleId, editId]);

  // #245: aktywne zlecenia firmy do powiązania przy załadunku/rozładunku.
  useEffect(() => {
    (async () => {
      try {
        const sb = getBrowserSupabase();
        const m = await getCachedMembership(sb);
        if (!m) return;
        const rows = await listOrders(sb, m.companyId, { limit: 200 });
        setOrders(rows.filter((o) => ORDER_OPEN_STATUSES.includes(o.status)));
      } catch {
        // brak sesji/firmy — picker pozostaje pusty (powiązanie opcjonalne)
      }
    })();
  }, []);

  const needsWeight = action === "load" || action === "unload";
  const needsAmount = action === "service" || action === "other";
  const commentRequired = action === "service" || action === "other";

  function fillGps() {
    if (!navigator.geolocation) {
      toast("GPS niedostępny w tej przeglądarce.", "error");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => toast("Nie udało się pobrać GPS — wpisz lokalizację ręcznie.", "error"),
    );
  }

  // A5: powtórz ostatnie zdarzenie — prefill akcji/kraju/lokalizacji z ostatniego zdarzenia pojazdu.
  async function repeatLast() {
    if (!vehicleId) return;
    try {
      const rows = (await listTripEvents(getBrowserSupabase(), { vehicleId, limit: 1 })) as {
        action: string;
        country: string | null;
        location: string | null;
      }[];
      const last = rows[0];
      if (!last) {
        toast("Brak wcześniejszych zdarzeń dla tego pojazdu.", "info");
        return;
      }
      if ((TRIP_ACTIONS as readonly string[]).includes(last.action)) {
        setAction(last.action as (typeof TRIP_ACTIONS)[number]);
      }
      setCountry(last.country ?? "");
      setLocation(last.location ?? "");
      toast("Wczytano dane z ostatniego zdarzenia — uzupełnij licznik i wagę.", "success");
    } catch (e) {
      toast(
        e instanceof Error ? e.message : "Nie udało się wczytać ostatniego zdarzenia.",
        "error",
      );
    }
  }

  async function submit() {
    if (busy) return; // blokada podwójnego zapisu (każdy tap = osobny wpis w outboxie)
    if (setupMsg) {
      toast(setupMsg, "error");
      return;
    }
    setErrors({});

    const base = {
      action,
      vehicleId,
      place: { country, location: location || undefined, lat: coords?.lat, lng: coords?.lng },
      odometerKm: Number(odometerKm),
      comment: comment || undefined,
    };
    const candidate = needsWeight
      ? {
          ...base,
          weightKg: weightKg ? Number(weightKg) : undefined,
          orderId: orderId || undefined,
        }
      : needsAmount
        ? { ...base, amount: amount ? Number(amount) : undefined }
        : base;

    const parsed = tripEventSchema.safeParse(candidate);
    if (!parsed.success) {
      const map = zodFieldErrors(parsed.error);
      setErrors(map);
      toast("Popraw błędy w formularzu.", "error");
      return;
    }

    setBusy(true);
    try {
      if (editId) {
        try {
          await updateTripEvent(getBrowserSupabase(), editId, parsed.data);
          toast("Zmiany zapisane. Przekierowuję do historii…", "success");
          setTimeout(() => {
            window.location.href = "/forms/history";
          }, 900);
        } catch (e) {
          toast(e instanceof Error ? e.message : "Błąd zapisu zmian.", "error");
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

      toast(
        (item.status === "synced"
          ? "Zapisano i zsynchronizowano."
          : "Zapisano lokalnie — synchronizacja po połączeniu.") + overloadMsg,
        item.status === "synced" ? "success" : "info",
      );
      setOdometerKm("");
      setWeightKg("");
      setAmount("");
      setComment("");
      setOrderId("");
    } finally {
      setBusy(false);
    }
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

        {!editId && (
          <button
            type="button"
            onClick={repeatLast}
            style={{
              background: "transparent",
              color: palette.offWhite,
              border: `1px solid ${palette.graphite}`,
              borderRadius: 8,
              padding: "9px 14px",
              cursor: "pointer",
              alignSelf: "flex-start",
            }}
          >
            ↺ Powtórz ostatnie zdarzenie
          </button>
        )}

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

        {needsWeight && orders.length > 0 && (
          <Field label="Zlecenie — auto-zamknięcie po komplecie load+unload" error={errors.orderId}>
            <select style={input} value={orderId} onChange={(e) => setOrderId(e.target.value)}>
              <option value="">— bez powiązania —</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {orderLabel(o)}
                </option>
              ))}
            </select>
          </Field>
        )}

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
            opacity: setupMsg || busy ? 0.5 : 1,
          }}
          onClick={submit}
          disabled={!!setupMsg || busy}
        >
          {busy ? "Zapisuję…" : t("common.save")}
        </button>
      </div>
    </div>
  );
}
