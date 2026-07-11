"use client";

/**
 * #289: Publiczna strona śledzenia przesyłki (QR od kierowcy / link od firmy).
 * Bez logowania — czyta wyłącznie bezpieczny podzbiór pól przez RPC
 * `order_tracking` (SECURITY DEFINER); token to sekret w URL.
 */
import { fetchOrderTracking, type OrderTracking } from "@e-logistic/api";
import { cssPalette as palette } from "@e-logistic/ui";
import { use, useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";

const STEPS = ["new", "assigned", "in_progress", "delivered"] as const;
const STEP_LABEL: Record<string, string> = {
  new: "Przyjęte",
  assigned: "Przypisany kierowca",
  in_progress: "W trasie",
  delivered: "Dostarczone",
  invoiced: "Dostarczone",
  cancelled: "Anulowane",
};

export default function TrackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [row, setRow] = useState<OrderTracking | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "missing" | "error">("loading");

  useEffect(() => {
    fetchOrderTracking(getBrowserSupabase(), token)
      .then((r) => {
        setRow(r);
        setState(r ? "ok" : "missing");
      })
      .catch(() => setState("error"));
  }, [token]);

  const effective = row?.status === "invoiced" ? "delivered" : row?.status;
  const activeIdx = effective ? STEPS.indexOf(effective as (typeof STEPS)[number]) : -1;
  const cancelled = row?.status === "cancelled";

  return (
    <main style={s.wrap}>
      <div style={s.card}>
        <div style={s.brand}>
          <span style={s.accent}>E</span>-Logistic · śledzenie przesyłki
        </div>

        {state === "loading" && <p style={s.muted}>Wczytywanie…</p>}
        {state === "missing" && (
          <p style={s.muted}>Nie znaleziono przesyłki — sprawdź, czy link jest kompletny.</p>
        )}
        {state === "error" && <p style={s.muted}>Nie udało się pobrać statusu. Odśwież stronę.</p>}

        {row && (
          <>
            <h1 style={s.route}>
              {row.origin || "?"} → {row.destination || "?"}
            </h1>
            <p style={s.ref}>
              {row.reference_no ? `Zlecenie ${row.reference_no}` : "Przesyłka"}
              {row.unload_date ? ` · planowany rozładunek ${row.unload_date}` : ""}
            </p>

            {cancelled ? (
              <div style={s.cancelled}>Zlecenie anulowane</div>
            ) : (
              <ol style={s.timeline}>
                {STEPS.map((step, i) => {
                  const done = i <= activeIdx;
                  const current = i === activeIdx;
                  return (
                    <li key={step} style={s.step}>
                      <span
                        style={{
                          ...s.dot,
                          background: done ? palette.red : "transparent",
                          borderColor: done ? palette.red : palette.graphite,
                          boxShadow: current ? `0 0 0 4px ${palette.red}33` : "none",
                        }}
                      >
                        {done ? "✓" : ""}
                      </span>
                      <span style={{ ...s.stepLabel, color: done ? "#fff" : palette.smoke }}>
                        {STEP_LABEL[step]}
                        {current && row.status === "in_progress" ? "…" : ""}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}

            <p style={s.note}>
              Status potwierdzany przez kierowcę w aplikacji E-Logistic.
              {row.status === "delivered" || row.status === "invoiced"
                ? " Dziękujemy — przesyłka dostarczona. ✅"
                : ""}
            </p>
          </>
        )}
      </div>
    </main>
  );
}

const s: Record<string, React.CSSProperties> = {
  wrap: {
    minHeight: "100vh",
    background: palette.black,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 480,
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 20,
    padding: 28,
  },
  brand: { color: palette.smoke, fontSize: 13, letterSpacing: 1, marginBottom: 18 },
  accent: { color: palette.red, fontWeight: 800 },
  route: { color: "#fff", fontSize: 26, fontWeight: 800, margin: 0 },
  ref: { color: palette.smoke, fontSize: 14, marginTop: 6, marginBottom: 22 },
  timeline: { listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 18 },
  step: { display: "flex", alignItems: "center", gap: 14 },
  dot: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    border: "2px solid",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontSize: 14,
    fontWeight: 800,
    flexShrink: 0,
  },
  stepLabel: { fontSize: 16, fontWeight: 600 },
  cancelled: {
    color: palette.danger,
    border: `1px solid ${palette.danger}`,
    borderRadius: 12,
    padding: "10px 14px",
    fontWeight: 700,
    textAlign: "center",
  },
  note: { color: palette.smoke, fontSize: 13, marginTop: 22, lineHeight: 1.5 },
  muted: { color: palette.smoke },
};
