"use client";

/**
 * #293: Kreator startu firmy — prowadzi nowego właściciela przez 3 kroki:
 * 1) firma (bootstrap_company) → 2) pierwszy pojazd → 3) zaproszenie kierowcy.
 * Pokazuje się na pulpicie, dopóki konfiguracja jest niekompletna; stan liczony
 * z realnych danych (membership / liczba pojazdów / kierowcy w zespole).
 */
import {
  bootstrapCompany,
  createInvite,
  getActiveMembership,
  insertVehicle,
  listCompanyMembers,
  listVehicles,
} from "@e-logistic/api";
import { vehicleSchema } from "@e-logistic/core";
import { cssPalette as palette } from "@e-logistic/ui";
import { useCallback, useEffect, useState } from "react";
import { clearMembershipCache } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";

type Step = "company" | "vehicle" | "invite" | "hidden";

export function CompanyBanner() {
  const [step, setStep] = useState<Step>("hidden");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // krok 1
  const [name, setName] = useState("");
  // krok 2
  const [registration, setRegistration] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  // krok 3
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const evaluate = useCallback(async () => {
    try {
      const sb = getBrowserSupabase();
      const m = await getActiveMembership(sb);
      if (!m) {
        setStep("company");
        return;
      }
      setCompanyId(m.companyId);
      if (m.role !== "owner" && m.role !== "dispatcher") {
        setStep("hidden"); // kierowca nie konfiguruje firmy
        return;
      }
      const [vehicles, members] = await Promise.all([
        listVehicles(sb, m.companyId).catch(() => []),
        listCompanyMembers(sb).catch(() => []),
      ]);
      if (vehicles.length === 0) setStep("vehicle");
      else if (members.filter((x) => x.role === "driver").length === 0) setStep("invite");
      else setStep("hidden");
    } catch {
      setStep("hidden"); // offline / brak konfiguracji — nie blokuj pulpitu
    }
  }, []);

  useEffect(() => {
    evaluate();
  }, [evaluate]);

  async function createCompany() {
    setBusy(true);
    setError(null);
    try {
      await bootstrapCompany(getBrowserSupabase(), name.trim() || "Moja firma");
      clearMembershipCache();
      await evaluate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nie udało się utworzyć firmy.");
    } finally {
      setBusy(false);
    }
  }

  async function addVehicle() {
    if (!companyId) return;
    setError(null);
    const parsed = vehicleSchema.safeParse({
      registration: registration.trim().toUpperCase(),
      model: model.trim() || "TIR",
      year: Number(year),
    });
    if (!parsed.success) {
      setError("Podaj rejestrację, model i rok (np. WGM 4523K · Actros · 2021).");
      return;
    }
    setBusy(true);
    try {
      await insertVehicle(getBrowserSupabase(), parsed.data, companyId);
      await evaluate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nie udało się dodać pojazdu.");
    } finally {
      setBusy(false);
    }
  }

  async function makeInvite() {
    setBusy(true);
    setError(null);
    try {
      const token = await createInvite(getBrowserSupabase(), { role: "driver" });
      setInviteUrl(`${window.location.origin}/join?token=${token}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nie udało się utworzyć zaproszenia.");
    } finally {
      setBusy(false);
    }
  }

  if (step === "hidden") return null;
  const stepIndex = step === "company" ? 0 : step === "vehicle" ? 1 : 2;

  return (
    <section style={s.wrap} aria-label="Kreator startu firmy">
      <div style={s.head}>
        <strong style={s.title}>🚀 Skonfiguruj E-Logistic w 3 krokach</strong>
        <span style={s.counter}>{stepIndex + 1}/3</span>
      </div>
      <div style={s.steps}>
        {["Firma", "Pierwszy pojazd", "Zaproś kierowcę"].map((label, i) => (
          <div key={label} style={s.step}>
            <span
              style={{
                ...s.dot,
                background:
                  i < stepIndex ? palette.success : i === stepIndex ? palette.red : "transparent",
                borderColor: i <= stepIndex ? "transparent" : palette.graphite,
              }}
            >
              {i < stepIndex ? "✓" : i + 1}
            </span>
            <span style={{ color: i === stepIndex ? "#fff" : palette.smoke, fontSize: 13 }}>
              {label}
            </span>
            {i < 2 && <span style={s.connector} />}
          </div>
        ))}
      </div>

      {step === "company" && (
        <div style={s.row}>
          <input
            style={s.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nazwa Twojej firmy transportowej"
          />
          <button type="button" style={s.cta} onClick={createCompany} disabled={busy}>
            {busy ? "Tworzę…" : "Utwórz firmę"}
          </button>
          <span style={s.hint}>
            Bez firmy formularze i pojazdy nie zapiszą się w bazie (zostają lokalnie).
          </span>
        </div>
      )}

      {step === "vehicle" && (
        <div style={s.row}>
          <input
            style={{ ...s.input, maxWidth: 160 }}
            value={registration}
            onChange={(e) => setRegistration(e.target.value)}
            placeholder="Rejestracja"
          />
          <input
            style={s.input}
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="Model (np. Actros)"
          />
          <input
            style={{ ...s.input, maxWidth: 100 }}
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="Rok"
            inputMode="numeric"
          />
          <button type="button" style={s.cta} onClick={addVehicle} disabled={busy}>
            {busy ? "Zapisuję…" : "Dodaj pojazd"}
          </button>
          <span style={s.hint}>
            Resztę danych (przeglądy, OC, wymiary) uzupełnisz później w zakładce Pojazdy.
          </span>
        </div>
      )}

      {step === "invite" &&
        (inviteUrl ? (
          <div style={s.row}>
            <input style={s.input} readOnly value={inviteUrl} onFocus={(e) => e.target.select()} />
            <button
              type="button"
              style={s.cta}
              onClick={() => {
                navigator.clipboard?.writeText(inviteUrl).catch(() => {});
                setCopied(true);
              }}
            >
              {copied ? "✓ Skopiowano" : "Kopiuj link"}
            </button>
            <button type="button" style={s.ghost} onClick={() => evaluate()}>
              Gotowe
            </button>
            <span style={s.hint}>
              Wyślij kierowcy (SMS/komunikator) — po kliknięciu założy konto i dołączy do Twojej
              firmy. Kreator zniknie, gdy kierowca dołączy.
            </span>
          </div>
        ) : (
          <div style={s.row}>
            <span style={{ color: palette.offWhite, fontSize: 14 }}>
              Zaproś pierwszego kierowcę — dostanie link z dostępem do aplikacji Twojej firmy.
            </span>
            <button type="button" style={s.cta} onClick={makeInvite} disabled={busy}>
              {busy ? "Generuję…" : "Wygeneruj zaproszenie"}
            </button>
          </div>
        ))}

      {error && <p style={s.error}>{error}</p>}
    </section>
  );
}

const s: Record<string, React.CSSProperties> = {
  wrap: {
    marginBottom: 20,
    padding: 18,
    borderRadius: 14,
    background: palette.nearBlack,
    border: `1px solid ${palette.red}`,
    display: "grid",
    gap: 14,
  },
  head: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  title: { color: "#fff", fontSize: 16 },
  counter: { color: palette.red, fontWeight: 800, fontSize: 14 },
  steps: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" },
  step: { display: "flex", alignItems: "center", gap: 8 },
  dot: {
    width: 26,
    height: 26,
    borderRadius: "50%",
    border: "2px solid",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 800,
    flexShrink: 0,
    color: "#fff",
  },
  connector: { width: 28, height: 2, background: palette.graphite, marginLeft: 4 },
  row: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },
  input: {
    flex: 1,
    minWidth: 180,
    background: palette.black,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 10,
    color: palette.offWhite,
    padding: "10px 12px",
    fontSize: 14,
  },
  cta: {
    background: palette.red,
    color: "#fff",
    border: "none",
    borderRadius: 999,
    padding: "10px 20px",
    fontWeight: 700,
    cursor: "pointer",
  },
  ghost: {
    background: "transparent",
    color: palette.offWhite,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 999,
    padding: "10px 20px",
    fontWeight: 600,
    cursor: "pointer",
  },
  hint: { color: palette.smoke, fontSize: 12, flexBasis: "100%" },
  error: { color: palette.danger, fontSize: 13, margin: 0 },
};
