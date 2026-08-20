"use client";

/**
 * [#375] Kary i mandaty.
 *
 * Osobno od kosztów trasy, mimo bardzo podobnej struktury: kara ma inny obieg
 * (kwestionowanie, termin płatności, przypisanie winy) i w jednym worku
 * z opłatami za autostrady zaśmiecałaby raporty kosztowe.
 *
 * Wprowadza ZARZĄD, ale kierowca WIDZI karę, która jego dotyczy (RLS 0095) —
 * inaczej dowiadywałby się o mandacie dopiero z potrącenia w wypłacie.
 */
import {
  insertPenalty,
  listDrivers,
  listPenalties,
  PENALTY_STATUSES,
  type PenaltyRow,
  type PenaltyStatus,
  setPenaltyStatus,
} from "@e-logistic/api";
import { setupMessage } from "@e-logistic/core";
import { cssPalette as palette } from "@e-logistic/ui";
import { useCallback, useEffect, useState } from "react";
import { CountryInput } from "@/components/CountryInput";
import { Field, fieldInputStyle as input } from "@/components/Field";
import { useT } from "@/components/LocaleProvider";
import { PlaceSearch } from "@/components/PlaceSearch";
import { useToast } from "@/components/Toast";
import { Button, PageHeader } from "@/components/ui";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { useFleet } from "@/lib/useFleet";
import { CURRENCIES, localNowInput, placeFromHit, toIsoOrUndefined } from "../formShared";

export default function PenaltiesPage() {
  const { vehicles, source } = useFleet();
  const t = useT();
  const toast = useToast();
  const setupMsg = setupMessage(source, {
    noCompany: "Najpierw utwórz firmę na Pulpicie.",
    noVehicles: "Dodaj pojazd w zakładce Pojazdy.",
  });

  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [drivers, setDrivers] = useState<{ id: string; label: string }[]>([]);
  const [occurredAt, setOccurredAt] = useState(localNowInput);
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [reason, setReason] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<PenaltyRow[]>([]);

  const load = useCallback(async () => {
    try {
      const sb = getBrowserSupabase();
      const m = await getCachedMembership(sb);
      if (!m) return;
      setRows(await listPenalties(sb, { limit: 50 }));
      const ds = (await listDrivers(sb, m.companyId).catch(() => [])) as {
        user_id?: string | null;
        first_name?: string | null;
        last_name?: string | null;
      }[];
      setDrivers(
        ds
          .filter((d): d is typeof d & { user_id: string } => Boolean(d.user_id))
          .map((d) => ({
            id: d.user_id,
            label: [d.first_name, d.last_name].filter(Boolean).join(" ") || d.user_id.slice(0, 8),
          })),
      );
    } catch {
      // brak uprawnień — lista pozostaje pusta
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
    if (!reason.trim()) {
      toast(t("forms.penalty.reason"), "error");
      return;
    }
    setBusy(true);
    try {
      const sb = getBrowserSupabase();
      const m = await getCachedMembership(sb);
      if (!m) throw new Error("Brak firmy.");
      await insertPenalty(sb, {
        companyId: m.companyId,
        vehicleId: vehicleId || null,
        driverId: driverId || null,
        occurredAt: toIsoOrUndefined(occurredAt),
        country: country || null,
        city: city || null,
        amount: value,
        currency,
        reason: reason.trim(),
        dueDate: dueDate || null,
        comment: comment || null,
      });
      toast(t("forms.penalty.saved"), "success");
      setAmount("");
      setReason("");
      setComment("");
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : t("forms.common.saveError"), "error");
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(id: string, status: PenaltyStatus) {
    try {
      await setPenaltyStatus(getBrowserSupabase(), id, status);
      setRows((list) => list.map((r) => (r.id === id ? { ...r, status } : r)));
    } catch (e) {
      toast(e instanceof Error ? e.message : t("forms.common.saveError"), "error");
    }
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <PageHeader title={t("forms.penalty.title")} subtitle={t("forms.penalty.subtitle")} />
      {setupMsg && <p style={{ color: palette.warning, fontSize: 13 }}>{setupMsg}</p>}

      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: 12 }}>
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
          <Field label={t("forms.penalty.driver")}>
            <select style={input} value={driverId} onChange={(e) => setDriverId(e.target.value)}>
              <option value="">—</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 12, color: palette.smoke }}>Wyszukaj miejsce (opcjonalnie)</span>
          <PlaceSearch
            onPick={(h) => {
              const p = placeFromHit(h);
              setCity(p.city);
              if (p.country) setCountry(p.country);
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <Field label={t("form.field.country")}>
            <CountryInput style={input} value={country} onChange={setCountry} />
          </Field>
          <Field label={t("form.field.location")}>
            <input style={input} value={city} onChange={(e) => setCity(e.target.value)} />
          </Field>
        </div>

        <Field label={t("forms.penalty.reason")}>
          <input
            style={input}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="np. przekroczenie prędkości, brak winiety, przeciążenie"
          />
        </Field>

        <div style={{ display: "flex", gap: 12 }}>
          <Field label={t("form.field.occurredAt")}>
            <input
              style={input}
              type="datetime-local"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
            />
          </Field>
          <Field label={t("forms.penalty.due")}>
            <input
              style={input}
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </Field>
        </div>

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
              onChange={(e) => setCurrency(e.target.value)}
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
                  alignItems: "center",
                  gap: 12,
                  padding: "8px 10px",
                  border: `1px solid ${palette.graphite}`,
                  borderRadius: 8,
                  fontSize: 13,
                }}
              >
                <span style={{ color: palette.offWhite, flex: 1 }}>
                  {r.reason}
                  {r.city ? ` · ${r.city}` : ""}
                </span>
                <span style={{ color: palette.smoke }}>
                  {r.occurred_at.slice(0, 10)} · {r.amount} {r.currency}
                </span>
                <select
                  style={{ ...input, maxWidth: 130 }}
                  value={r.status}
                  onChange={(e) => changeStatus(r.id, e.target.value as PenaltyStatus)}
                >
                  {PENALTY_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {t(`penalty.${st}` as Parameters<typeof t>[0])}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
