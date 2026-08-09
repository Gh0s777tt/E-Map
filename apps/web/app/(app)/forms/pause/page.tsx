"use client";

/**
 * [#375] Formularz pauzy / postoju.
 *
 * Wypełnia KIEROWCA — stąd te same pola miejsca co w tankowaniu i te same
 * uprawnienia (widzi swoje, zarząd widzi wszystkie). Postój bywa bezpłatny,
 * więc kwota jest opcjonalna, a nie zerowa: zero znaczyłoby „parking za darmo",
 * a brak wpisu znaczy „nie podano".
 */
import { insertPauseEvent, listFuelCardsForUser } from "@e-logistic/api";
import { currencyForCountry, setupMessage } from "@e-logistic/core";
import { cssPalette as palette } from "@e-logistic/ui";
import { useEffect, useState } from "react";
import { Field, fieldInputStyle as input } from "@/components/Field";
import { useT } from "@/components/LocaleProvider";
import { PlaceSearch } from "@/components/PlaceSearch";
import { useToast } from "@/components/Toast";
import { Button, PageHeader } from "@/components/ui";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { useFleet } from "@/lib/useFleet";
import {
  CURRENCIES,
  localNowInput,
  PAYMENT_METHODS_EXT,
  placeFromHit,
  toIsoOrUndefined,
} from "../formShared";

export default function PauseFormPage() {
  const { vehicles, source } = useFleet();
  const t = useT();
  const toast = useToast();
  const setupMsg = setupMessage(source, {
    noCompany: "Najpierw utwórz firmę na Pulpicie, aby zapisywać formularze.",
    noVehicles: "Dodaj pojazd w zakładce Pojazdy, aby móc zapisać formularz.",
  });

  const [vehicleId, setVehicleId] = useState("");
  const [occurredAt, setOccurredAt] = useState(localNowInput);
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [postcode, setPostcode] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [odometerKm, setOdometerKm] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [currencyTouched, setCurrencyTouched] = useState(false);
  const [secured, setSecured] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [fuelCardId, setFuelCardId] = useState("");
  const [cards, setCards] = useState<{ id: string; label: string }[]>([]);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!vehicleId && vehicles[0]) setVehicleId(vehicles[0].id);
  }, [vehicles, vehicleId]);

  useEffect(() => {
    (async () => {
      try {
        const rows = await listFuelCardsForUser(getBrowserSupabase());
        setCards(
          rows.map((c) => ({
            id: c.id,
            label: `${String(c.provider).toUpperCase()} •••• ${c.card_number_masked ?? ""}`.trim(),
          })),
        );
      } catch {
        // brak kart albo brak sieci — płatność kartą pozostaje niedostępna
      }
    })();
  }, []);

  async function submit() {
    if (busy) return;
    if (setupMsg) {
      toast(setupMsg, "error");
      return;
    }
    if (!country.trim()) {
      toast(t("form.field.country"), "error");
      return;
    }
    setBusy(true);
    try {
      const sb = getBrowserSupabase();
      const m = await getCachedMembership(sb);
      if (!m) throw new Error(setupMsg ?? "Brak firmy.");
      await insertPauseEvent(sb, {
        companyId: m.companyId,
        vehicleId: vehicleId || null,
        occurredAt: toIsoOrUndefined(occurredAt),
        country: country.trim(),
        city: city || null,
        postcode: postcode || null,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        odometerKm: odometerKm ? Number(odometerKm) : null,
        priceTotal: price ? Number(price) : null,
        currency,
        securedParking: secured,
        paymentMethod: paymentMethod || null,
        fuelCardId: paymentMethod === "card" ? fuelCardId || null : null,
        comment: comment || null,
      });
      toast(t("forms.pause.saved"), "success");
      setPrice("");
      setComment("");
      setOdometerKm("");
    } catch (e) {
      toast(e instanceof Error ? e.message : t("forms.common.saveError"), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 520 }}>
      <PageHeader title={t("forms.pause.title")} subtitle={t("forms.pause.subtitle")} />
      {setupMsg && <p style={{ color: palette.warning, fontSize: 13 }}>{setupMsg}</p>}

      <div style={{ display: "grid", gap: 12 }}>
        <Field label={t("common.vehicle")}>
          <select style={input} value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
            <option value="">{t("forms.common.noVehicle")}</option>
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
              const p = placeFromHit(h);
              setCity(p.city);
              if (p.country) setCountry(p.country);
              if (p.postcode) setPostcode(p.postcode);
              if (p.countryCode && !currencyTouched) setCurrency(currencyForCountry(p.countryCode));
              setCoords({ lat: h.lat, lng: h.lng });
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <Field label={t("form.field.country")}>
            <input style={input} value={country} onChange={(e) => setCountry(e.target.value)} />
          </Field>
          <Field label={t("form.field.location")}>
            <input style={input} value={city} onChange={(e) => setCity(e.target.value)} />
          </Field>
          <Field label={t("form.field.postcode")}>
            <input style={input} value={postcode} onChange={(e) => setPostcode(e.target.value)} />
          </Field>
        </div>

        <Field label={t("form.field.occurredAt")}>
          <input
            style={input}
            type="datetime-local"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
          />
        </Field>

        <Field label={t("form.field.odometer")}>
          <input
            style={input}
            type="number"
            value={odometerKm}
            onChange={(e) => setOdometerKm(e.target.value)}
          />
        </Field>

        {/* Postój bywa bezpłatny — kwota jest opcjonalna, nie zerowa. */}
        <Field label={`${t("forms.common.amount")} (opcjonalnie)`}>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              style={input}
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <select
              style={{ ...input, maxWidth: 110 }}
              value={currency}
              onChange={(e) => {
                setCurrency(e.target.value);
                setCurrencyTouched(true);
              }}
              aria-label={t("form.field.currency")}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </Field>

        <Field label={t("forms.common.paymentMethod")}>
          <select
            style={input}
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
          >
            <option value="">—</option>
            {PAYMENT_METHODS_EXT.map((m) => (
              <option key={m} value={m}>
                {t(`pay.${m}` as Parameters<typeof t>[0])}
              </option>
            ))}
          </select>
        </Field>

        {paymentMethod === "card" && cards.length > 0 && (
          <Field label={t("nav.cards")}>
            <select
              style={input}
              value={fuelCardId}
              onChange={(e) => setFuelCardId(e.target.value)}
            >
              <option value="">—</option>
              {cards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
        )}

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
          <input type="checkbox" checked={secured} onChange={(e) => setSecured(e.target.checked)} />
          {t("forms.pause.secured")}
        </label>

        <Field label={t("form.field.comment")}>
          <textarea
            style={{ ...input, minHeight: 70 }}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </Field>

        <Button onClick={submit} disabled={busy}>
          {busy ? "…" : t("common.save")}
        </Button>
      </div>
    </div>
  );
}
