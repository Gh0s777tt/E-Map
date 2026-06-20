"use client";

import {
  getActiveMembership,
  getFuelCardPin,
  insertFuelCard,
  listFuelCardsSafe,
  setFuelCardPin,
} from "@e-logistic/api";
import { FUEL_CARD_PROVIDERS, fuelCardSchema } from "@e-logistic/core";
import { createTranslator } from "@e-logistic/i18n";
import { palette } from "@e-logistic/ui";
import { useCallback, useEffect, useState } from "react";
import { Field, fieldInputStyle as input } from "@/components/Field";
import { getBrowserSupabase } from "@/lib/supabase/client";

const t = createTranslator("pl");

type Card = {
  id: string;
  provider: string;
  card_number_masked: string;
  valid_until: string | null;
  discount_percent: number;
};

export default function CardsPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [offline, setOffline] = useState(false);
  const [pins, setPins] = useState<Record<string, string>>({});

  const [provider, setProvider] = useState<(typeof FUEL_CARD_PROVIDERS)[number]>("dkv");
  const [masked, setMasked] = useState("");
  const [pin, setPin] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [discount, setDiscount] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const sb = getBrowserSupabase();
      const m = await getActiveMembership(sb);
      if (!m) {
        setOffline(true);
        return;
      }
      setIsOwner(m.role === "owner");
      setCards((await listFuelCardsSafe(sb, m.companyId)) as Card[]);
    } catch {
      setOffline(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function reveal(cardId: string) {
    try {
      const value = await getFuelCardPin(getBrowserSupabase(), cardId);
      setPins((p) => ({ ...p, [cardId]: value || "(brak PIN-u)" }));
    } catch (e) {
      setPins((p) => ({ ...p, [cardId]: e instanceof Error ? e.message : "Błąd" }));
    }
  }

  async function addCard() {
    setErrors({});
    setStatus(null);
    const parsed = fuelCardSchema.safeParse({
      provider,
      cardNumberMasked: masked,
      pin: pin || undefined,
      validUntil: validUntil || undefined,
      discountPercent: discount ? Number(discount) : undefined,
    });
    if (!parsed.success) {
      const map: Record<string, string> = {};
      for (const issue of parsed.error.issues) map[issue.path.join(".")] = issue.message;
      setErrors(map);
      return;
    }
    try {
      const sb = getBrowserSupabase();
      const m = await getActiveMembership(sb);
      if (!m) {
        setStatus("Brak firmy — nie można zapisać.");
        return;
      }
      const cardId = await insertFuelCard(sb, parsed.data, m.companyId);
      if (parsed.data.pin) await setFuelCardPin(sb, cardId, parsed.data.pin);
      setStatus("✅ Karta dodana.");
      setMasked("");
      setPin("");
      setValidUntil("");
      setDiscount("");
      await load();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Błąd zapisu karty.");
    }
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>{t("nav.cards")}</h1>
      <p style={{ color: palette.smoke, marginTop: 4 }}>
        PIN-y szyfrowane (Vault); kierowca może je odsłonić, by zapłacić w automacie. Każdy odczyt
        jest audytowany.
      </p>

      {offline && (
        <p style={{ color: palette.smoke, marginTop: 16 }}>
          Zaloguj się i utwórz firmę, aby zarządzać kartami.
        </p>
      )}

      {isOwner && (
        <div style={styles.form}>
          <div style={{ display: "flex", gap: 12 }}>
            <Field label="Dostawca" error={errors.provider}>
              <select
                style={input}
                value={provider}
                onChange={(e) =>
                  setProvider(e.target.value as (typeof FUEL_CARD_PROVIDERS)[number])
                }
              >
                {FUEL_CARD_PROVIDERS.map((p) => (
                  <option key={p} value={p}>
                    {p.toUpperCase()}
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
          <button type="button" style={styles.primary} onClick={addCard}>
            {t("common.save")}
          </button>
          {status && <p style={{ color: palette.smoke, fontSize: 14 }}>{status}</p>}
        </div>
      )}

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32 }}>Karty</h2>
      {cards.length === 0 ? (
        <p style={{ color: palette.smoke }}>Brak kart.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          {cards.map((c) => (
            <div key={c.id} style={styles.row}>
              <strong style={{ minWidth: 90 }}>{c.provider.toUpperCase()}</strong>
              <span style={styles.cell}>{c.card_number_masked}</span>
              <span style={styles.cell}>{c.valid_until ?? "—"}</span>
              <span style={styles.cell}>{c.discount_percent}%</span>
              <span style={{ flex: 1 }} />
              {pins[c.id] ? (
                <strong style={{ color: palette.red, letterSpacing: 2 }}>{pins[c.id]}</strong>
              ) : (
                <button type="button" style={styles.ghost} onClick={() => reveal(c.id)}>
                  🔓 Pokaż PIN
                </button>
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
    alignSelf: "flex-start",
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
  row: {
    display: "flex",
    gap: 16,
    alignItems: "center",
    padding: "10px 16px",
    borderRadius: 10,
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
  },
  cell: { color: palette.smoke, fontSize: 14 },
};
