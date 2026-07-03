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
import { useToast } from "@/components/Toast";
import { enqueue } from "@/lib/outbox";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { useFleet } from "@/lib/useFleet";
import styles from "./LiquidForm.module.css";

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
  const toast = useToast();
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
  const [editId, setEditId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
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
        toast(e instanceof Error ? e.message : "Nie udało się wczytać wpisu do edycji.", "error");
      }
    })();
  }, [table, toast]);

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
      toast("GPS niedostępny w tej przeglądarce.", "error");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        toast("Pobrano współrzędne GPS.", "success");
      },
      () => toast("Nie udało się pobrać GPS — wpisz lokalizację ręcznie.", "error"),
    );
  }

  // A5: powtórz ostatni wpis — prefill stałych pól z ostatniego tankowania pojazdu
  // (stacja/płatność/karta/„do pełna"). Zmienne pola (licznik, litry, cena) zostają puste.
  async function repeatLast() {
    if (!vehicleId) return;
    try {
      const rows = (await listFuelLogs(getBrowserSupabase(), { vehicleId, table, limit: 1 })) as {
        station_country: string | null;
        station_city: string | null;
        payment_method: string | null;
        fuel_card_id: string | null;
        is_full: boolean | null;
      }[];
      const last = rows[0];
      if (!last) {
        toast("Brak wcześniejszych wpisów dla tego pojazdu.", "info");
        return;
      }
      setCountry(last.station_country ?? "");
      setCity(last.station_city ?? "");
      if (last.payment_method === "card" || last.payment_method === "cash") {
        setPaymentMethod(last.payment_method);
      }
      if (last.fuel_card_id) setFuelCardId(last.fuel_card_id);
      setIsFull(last.is_full ?? true);
      toast("Wczytano dane z ostatniego wpisu — uzupełnij licznik i litry.", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Nie udało się wczytać ostatniego wpisu.", "error");
    }
  }

  async function submit() {
    if (busy) return; // blokada podwójnego zapisu (każdy tap = osobny wpis w outboxie)
    if (setupMsg) {
      toast(setupMsg, "error");
      return;
    }
    setErrors({});

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
      toast("Popraw błędy w formularzu.", "error");
      return;
    }

    setBusy(true);
    try {
      if (editId) {
        try {
          await updateFuelLog(getBrowserSupabase(), editId, parsed.data, table);
          toast("Zmiany zapisane. Przekierowuję do historii…", "success");
          setTimeout(() => {
            window.location.href = "/forms/history";
          }, 900);
        } catch (e) {
          toast(e instanceof Error ? e.message : "Błąd zapisu zmian.", "error");
        }
        return;
      }

      const item = await enqueue(kind, parsed.data, new Date().toISOString());
      toast(
        item.status === "synced"
          ? "Zapisano i zsynchronizowano."
          : item.status === "error"
            ? `Zapisano lokalnie (w kolejce). ${item.error ?? ""}`
            : "Zapisano lokalnie — synchronizacja po połączeniu.",
        item.status === "synced" ? "success" : "info",
      );
      setOdometerKm("");
      setLiters("");
      setIsFull(true);
      setPriceTotal("");
      setComment("");
    } finally {
      setBusy(false);
    }
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

      <div className={styles.form}>
        <Field label={t("form.field.vehicle")} error={errors.vehicleId}>
          <select
            className={styles.input}
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

        {!editId && (
          <button type="button" className={styles.ghost} onClick={repeatLast}>
            ↺ Powtórz ostatni wpis
          </button>
        )}

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
              className={styles.input}
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="DE"
            />
          </Field>
          <Field label={t("form.field.location")} error={errors["station.city"]}>
            <input
              className={styles.input}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Berlin"
            />
          </Field>
        </div>

        <button type="button" className={styles.ghost} onClick={fillGps}>
          📍 Pobierz GPS {coords ? `(${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)})` : ""}
        </button>

        <div style={{ display: "flex", gap: 12 }}>
          <Field label={t("form.field.odometer")} error={errors.odometerKm}>
            <input
              className={styles.input}
              type="number"
              value={odometerKm}
              onChange={(e) => setOdometerKm(e.target.value)}
            />
          </Field>
          <Field label={t("form.field.liters")} error={errors.liters}>
            <input
              className={styles.input}
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
              className={styles.input}
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
            className={styles.input}
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
                className={styles.linkBtn}
                onClick={() => {
                  const l = Number(liters);
                  if (l > 0 && lastPrice != null) setPriceTotal(String(round2(l * lastPrice)));
                  else toast("Podaj najpierw litry, aby przeliczyć kwotę.", "error");
                }}
              >
                Przelicz kwotę
              </button>
            </span>
          )}
        </Field>

        <Field label={t("form.field.comment")} error={errors.comment}>
          <textarea
            className={styles.input}
            style={{ minHeight: 70 }}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </Field>

        <button
          type="button"
          className={styles.primary}
          style={{ opacity: setupMsg || busy ? 0.5 : 1 }}
          onClick={submit}
          disabled={!!setupMsg || busy}
        >
          {busy ? "Zapisuję…" : t("common.save")}
        </button>
      </div>
    </div>
  );
}
