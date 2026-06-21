"use client";

import {
  deleteFuelCard,
  getFuelCardPin,
  insertFuelCard,
  listFuelCardsForUser,
  listVehicles,
  setFuelCardPin,
  updateFuelCard,
} from "@e-logistic/api";
import {
  FUEL_CARD_PROVIDER_LABELS,
  FUEL_CARD_PROVIDERS,
  type FuelCardProvider,
  fuelCardSchema,
} from "@e-logistic/core";
import { createTranslator } from "@e-logistic/i18n";
import { palette } from "@e-logistic/ui";
import { useCallback, useEffect, useState } from "react";
import { CardArt } from "@/components/CardArt";
import { Field, fieldInputStyle as input } from "@/components/Field";
import { ListStatus } from "@/components/ListStatus";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";

const t = createTranslator("pl");

type Card = {
  id: string;
  provider: string;
  card_number_masked: string;
  valid_until: string | null;
  discount_percent: number | null;
  vehicle_id: string | null;
  registration: string | null;
};
type Vehicle = { id: string; registration: string };

const providerLabel = (p: string) =>
  FUEL_CARD_PROVIDER_LABELS[p as FuelCardProvider] ?? p.toUpperCase();

export default function CardsPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [offline, setOffline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [pins, setPins] = useState<Record<string, string>>({});

  const [editingId, setEditingId] = useState<string | null>(null);
  const [provider, setProvider] = useState<FuelCardProvider>("dkv");
  const [masked, setMasked] = useState("");
  const [pin, setPin] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [discount, setDiscount] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadErr(null);
    try {
      const sb = getBrowserSupabase();
      const m = await getCachedMembership(sb);
      if (!m) {
        setOffline(true);
        return;
      }
      setOffline(false);
      setIsOwner(m.role === "owner");
      const [cs, vs] = await Promise.all([listFuelCardsForUser(sb), listVehicles(sb, m.companyId)]);
      setCards(cs as Card[]);
      setVehicles((vs as Vehicle[]).map((v) => ({ id: v.id, registration: v.registration })));
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Nie udało się pobrać kart.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function resetForm() {
    setEditingId(null);
    setProvider("dkv");
    setMasked("");
    setPin("");
    setValidUntil("");
    setDiscount("");
    setVehicleId("");
    setErrors({});
  }

  function startEdit(c: Card) {
    setEditingId(c.id);
    setProvider(
      (FUEL_CARD_PROVIDERS as readonly string[]).includes(c.provider)
        ? (c.provider as FuelCardProvider)
        : "other",
    );
    setMasked(c.card_number_masked);
    setPin("");
    setValidUntil(c.valid_until ?? "");
    setDiscount(String(c.discount_percent ?? ""));
    setVehicleId(c.vehicle_id ?? "");
    setErrors({});
    setStatus(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function reveal(cardId: string) {
    try {
      const value = await getFuelCardPin(getBrowserSupabase(), cardId);
      setPins((p) => ({ ...p, [cardId]: value || "(brak PIN-u)" }));
    } catch (e) {
      setPins((p) => ({ ...p, [cardId]: e instanceof Error ? e.message : "Błąd" }));
    }
  }

  async function save() {
    setErrors({});
    setStatus(null);
    const parsed = fuelCardSchema.safeParse({
      provider,
      cardNumberMasked: masked,
      pin: pin || undefined,
      validUntil: validUntil || undefined,
      discountPercent: discount ? Number(discount) : undefined,
      vehicleId: vehicleId || undefined,
    });
    if (!parsed.success) {
      const map: Record<string, string> = {};
      for (const issue of parsed.error.issues) map[issue.path.join(".")] = issue.message;
      setErrors(map);
      return;
    }
    try {
      const sb = getBrowserSupabase();
      const m = await getCachedMembership(sb);
      if (!m) {
        setStatus("Brak firmy — nie można zapisać.");
        return;
      }
      if (editingId) {
        await updateFuelCard(sb, editingId, parsed.data);
        if (parsed.data.pin) await setFuelCardPin(sb, editingId, parsed.data.pin);
        setStatus("✅ Zmiany zapisane.");
      } else {
        const cardId = await insertFuelCard(sb, parsed.data, m.companyId);
        if (parsed.data.pin) await setFuelCardPin(sb, cardId, parsed.data.pin);
        setStatus("✅ Karta dodana.");
      }
      resetForm();
      await load();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Błąd zapisu karty.");
    }
  }

  async function remove(cardId: string) {
    if (!window.confirm("Usunąć tę kartę? Tej operacji nie można cofnąć.")) return;
    try {
      await deleteFuelCard(getBrowserSupabase(), cardId);
      setPins((p) => {
        const next = { ...p };
        delete next[cardId];
        return next;
      });
      if (editingId === cardId) resetForm();
      setStatus("🗑️ Karta usunięta.");
      await load();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Błąd usuwania karty.");
    }
  }

  return (
    <div style={{ maxWidth: 760 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>{t("nav.cards")}</h1>
      <p style={{ color: palette.smoke, marginTop: 4 }}>
        PIN-y szyfrowane (Vault); kierowca może je odsłonić, by zapłacić w automacie. Każdy odczyt
        jest audytowany. Kartę można przypisać do pojazdu.
      </p>

      {offline && (
        <p style={{ color: palette.smoke, marginTop: 16 }}>
          Zaloguj się i utwórz firmę, aby zarządzać kartami.
        </p>
      )}

      {isOwner && (
        <div style={styles.form}>
          {editingId && (
            <div style={{ fontSize: 13, color: palette.red, fontWeight: 700 }}>
              ✏️ Edytujesz kartę — zostaw PIN pusty, by go nie zmieniać.
            </div>
          )}
          <div style={{ display: "flex", gap: 12 }}>
            <Field label="Dostawca" error={errors.provider}>
              <select
                style={input}
                value={provider}
                onChange={(e) => setProvider(e.target.value as FuelCardProvider)}
              >
                {FUEL_CARD_PROVIDERS.map((p) => (
                  <option key={p} value={p}>
                    {providerLabel(p)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Numer (zamaskowany)" error={errors.cardNumberMasked}>
              <input
                style={input}
                value={masked}
                onChange={(e) => setMasked(e.target.value)}
                placeholder="**** 1234"
              />
            </Field>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <Field label="PIN (4–6 cyfr)" error={errors.pin}>
              <input
                style={input}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                inputMode="numeric"
                placeholder={editingId ? "bez zmian" : ""}
              />
            </Field>
            <Field label="Ważna do" error={errors.validUntil}>
              <input
                style={input}
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </Field>
            <Field label="Rabat %" error={errors.discountPercent}>
              <input
                style={input}
                type="number"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Przypisz do pojazdu" error={errors.vehicleId}>
            <select style={input} value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
              <option value="">— brak —</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.registration}
                </option>
              ))}
            </select>
          </Field>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" style={styles.primary} onClick={save}>
              {editingId ? "Zapisz zmiany" : t("common.save")}
            </button>
            {editingId && (
              <button type="button" style={styles.ghost} onClick={resetForm}>
                Anuluj
              </button>
            )}
          </div>
          {status && <p style={{ color: palette.smoke, fontSize: 14 }}>{status}</p>}
        </div>
      )}

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32 }}>Karty</h2>
      <ListStatus
        loading={loading && !offline}
        error={loadErr}
        empty={!offline && cards.length === 0}
        emptyText="Brak kart."
        onRetry={load}
      />
      {!loading && !loadErr && cards.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          {cards.map((c) => (
            <div key={c.id} style={styles.row}>
              <CardArt
                provider={c.provider}
                masked={c.card_number_masked}
                validUntil={c.valid_until}
                registration={c.registration}
                width={132}
              />
              <strong style={{ minWidth: 90 }}>{providerLabel(c.provider)}</strong>
              <span style={styles.cell}>{c.valid_until ?? "—"}</span>
              {c.discount_percent != null && <span style={styles.cell}>{c.discount_percent}%</span>}
              <span style={{ flex: 1 }} />
              {pins[c.id] ? (
                <strong style={{ color: palette.red, letterSpacing: 2 }}>{pins[c.id]}</strong>
              ) : (
                <button type="button" style={styles.ghost} onClick={() => reveal(c.id)}>
                  🔓 PIN
                </button>
              )}
              {isOwner && (
                <>
                  <button type="button" style={styles.ghost} onClick={() => startEdit(c)}>
                    ✏️ Edytuj
                  </button>
                  <button type="button" style={styles.danger} onClick={() => remove(c.id)}>
                    🗑️
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: { display: "flex", flexDirection: "column", gap: 14, marginTop: 20, maxWidth: 560 },
  primary: {
    background: palette.red,
    color: palette.white,
    border: "none",
    borderRadius: 8,
    padding: "11px",
    fontWeight: 700,
    cursor: "pointer",
    minWidth: 140,
  },
  ghost: {
    background: "transparent",
    color: palette.offWhite,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
    padding: "7px 12px",
    cursor: "pointer",
  },
  danger: {
    background: "transparent",
    color: palette.red,
    border: `1px solid ${palette.red}`,
    borderRadius: 8,
    padding: "7px 11px",
    cursor: "pointer",
  },
  row: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    padding: "10px 16px",
    borderRadius: 10,
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
  },
  cell: { color: palette.smoke, fontSize: 14 },
  tag: {
    color: palette.offWhite,
    fontSize: 12,
    background: palette.coal,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 6,
    padding: "2px 8px",
  },
};
