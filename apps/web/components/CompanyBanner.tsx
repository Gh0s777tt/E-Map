"use client";

import { bootstrapCompany, getActiveMembership } from "@e-logistic/api";
import { palette } from "@e-logistic/ui";
import { useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";

type State = "loading" | "needCompany" | "hidden";

/**
 * Onboarding firmy. Pokazuje się tylko, gdy zalogowany user nie ma jeszcze firmy.
 * Bez skonfigurowanego Supabase (tryb offline) — ukryty.
 */
export function CompanyBanner() {
  const [state, setState] = useState<State>("loading");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const membership = await getActiveMembership(getBrowserSupabase());
        setState(membership ? "hidden" : "needCompany");
      } catch {
        setState("hidden");
      }
    })();
  }, []);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      await bootstrapCompany(getBrowserSupabase(), name.trim() || "Moja firma");
      setState("hidden");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nie udało się utworzyć firmy.");
    } finally {
      setBusy(false);
    }
  }

  if (state !== "needCompany") return null;

  return (
    <div
      style={{
        marginBottom: 20,
        padding: 16,
        borderRadius: 12,
        background: palette.nearBlack,
        border: `1px solid ${palette.red}`,
        display: "flex",
        gap: 12,
        alignItems: "flex-end",
        flexWrap: "wrap",
      }}
    >
      <div style={{ flex: 1, minWidth: 220 }}>
        <div style={{ fontWeight: 700 }}>Dokończ konfigurację — utwórz firmę</div>
        <div style={{ color: palette.smoke, fontSize: 13, marginTop: 2 }}>
          Bez firmy formularze i pojazdy nie zapiszą się w bazie (zostają lokalnie).
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nazwa firmy"
          style={{
            marginTop: 10,
            width: "100%",
            maxWidth: 320,
            background: palette.black,
            border: `1px solid ${palette.graphite}`,
            borderRadius: 8,
            padding: "10px 12px",
            color: palette.offWhite,
          }}
        />
        {error && <div style={{ color: palette.red, fontSize: 12, marginTop: 6 }}>{error}</div>}
      </div>
      <button
        type="button"
        onClick={create}
        disabled={busy}
        style={{
          background: palette.red,
          color: palette.white,
          border: "none",
          borderRadius: 8,
          padding: "11px 16px",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        {busy ? "Tworzę…" : "Utwórz firmę"}
      </button>
    </div>
  );
}
