"use client";

/**
 * [#375] Dodatkowe koszty trasy: hotele, bramki, autostrady, promy, tunele,
 * pociągi — wszystko, co obciąża trasę poza paliwem.
 *
 * Wypełnia ZARZĄD po zakończeniu trasy przez kierowcę, stąd inne uprawnienia
 * niż przy pauzie: kierowca tych kosztów nie widzi ani nie wprowadza (RLS
 * z migracji 0095). Powiązanie ze zleceniem pozwoli policzyć pełny koszt trasy.
 */
import {
  insertRouteExtraCost,
  listOrders,
  listRouteExtraCosts,
  type Order,
  ROUTE_COST_KINDS,
  type RouteCostKind,
  type RouteExtraCostRow,
} from "@e-logistic/api";
import { currencyForCountry, setupMessage } from "@e-logistic/core";
import { cssPalette as palette } from "@e-logistic/ui";
import { useCallback, useEffect, useState } from "react";
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

const OPEN_STATUSES = ["new", "assigned", "in_progress", "delivered"];

export default function RouteCostsPage() {
  const { vehicles, source } = useFleet();
  const t = useT();
  const toast = useToast();
  const setupMsg = setupMessage(source, {
    noCompany: "Najpierw utwórz firmę na Pulpicie.",
    noVehicles: "Dodaj pojazd w zakładce Pojazdy.",
  });

  const [vehicleId, setVehicleId] = useState("");
  const [orderId, setOrderId] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [kind, setKind] = useState<RouteCostKind>("toll");
  const [occurredAt, setOccurredAt] = useState(localNowInput);
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [currencyTouched, setCurrencyTouched] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<RouteExtraCostRow[]>([]);

  const load = useCallback(async () => {
    try {
      const sb = getBrowserSupabase();
      const m = await getCachedMembership(sb);
      if (!m) return;
      const [ord, list] = await Promise.all([
        listOrders(sb, m.companyId, { limit: 200 }),
        listRouteExtraCosts(sb, { limit: 50 }),
      ]);
      setOrders(ord.filter((o) => OPEN_STATUSES.includes(o.status)));
      setRows(list);
    } catch {
      // brak sesji/uprawnień — lista pozostaje pusta
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function submit() {
    if (busy) return;
    const value = Number(amount);
    if (!amount || !Number.isFinite(value) || value < 0) {
      toast(t("forms.common.amount"), "error");
      return;
    }
    setBusy(true);
    try {
      const sb = getBrowserSupabase();
      const m = await getCachedMembership(sb);
      if (!m) throw new Error("Brak firmy.");
      await insertRouteExtraCost(sb, {
        companyId: m.companyId,
        vehicleId: vehicleId || null,
        orderId: orderId || null,
        occurredAt: toIsoOrUndefined(occurredAt),
        kind,
        country: country || null,
        city: city || null,
        amount: value,
        currency,
        paymentMethod: paymentMethod || null,
        comment: comment || null,
      });
      toast(t("forms.routeCost.saved"), "success");
      setAmount("");
      setComment("");
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : t("forms.common.saveError"), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <PageHeader title={t("forms.routeCost.title")} subtitle={t("forms.routeCost.subtitle")} />
      {setupMsg && <p style={{ color: palette.warning, fontSize: 13 }}>{setupMsg}</p>}

      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: 12 }}>
          <Field label={t("forms.routeCost.kind")}>
            <select
              style={input}
              value={kind}
              onChange={(e) => setKind(e.target.value as RouteCostKind)}
            >
              {ROUTE_COST_KINDS.map((k) => (
                <option key={k} value={k}>
                  {t(`cost.${k}` as Parameters<typeof t>[0])}
                </option>
              ))}
            </select>
          </Field>
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
        </div>

        <Field label={t("forms.routeCost.order")}>
          <select style={input} value={orderId} onChange={(e) => setOrderId(e.target.value)}>
            <option value="">—</option>
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {[o.reference_no ? `#${o.reference_no}` : "", o.origin, o.destination]
                  .filter(Boolean)
                  .join(" · ")}
              </option>
            ))}
          </select>
        </Field>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 12, color: palette.smoke }}>Wyszukaj miejsce (opcjonalnie)</span>
          <PlaceSearch
            onPick={(h) => {
              const p = placeFromHit(h);
              setCity(p.city);
              if (p.country) setCountry(p.country);
              if (p.countryCode && !currencyTouched) setCurrency(currencyForCountry(p.countryCode));
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
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <Field label={t("form.field.occurredAt")}>
            <input
              style={input}
              type="datetime-local"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
            />
          </Field>
          <Field label={t("forms.common.amount")}>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                style={input}
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
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
        </div>

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

      {rows.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <h3 style={{ fontSize: 15, color: palette.offWhite }}>{t("common.recent")}</h3>
          <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
            {rows.map((r) => (
              <div
                key={r.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "8px 10px",
                  border: `1px solid ${palette.graphite}`,
                  borderRadius: 8,
                  fontSize: 13,
                }}
              >
                <span style={{ color: palette.offWhite }}>
                  {t(`cost.${r.kind}` as Parameters<typeof t>[0])}
                  {r.city ? ` · ${r.city}` : ""}
                  {r.country ? ` (${r.country})` : ""}
                </span>
                <span style={{ color: palette.smoke }}>
                  {r.occurred_at.slice(0, 10)} · {r.amount} {r.currency}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
