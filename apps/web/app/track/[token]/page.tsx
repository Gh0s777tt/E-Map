"use client";

/**
 * #289: Publiczna strona śledzenia przesyłki (QR od kierowcy / link od firmy).
 * Bez logowania — czyta wyłącznie bezpieczny podzbiór pól przez RPC
 * `order_tracking` (SECURITY DEFINER); token to sekret w URL.
 */
import { fetchOrderTracking, type OrderTracking } from "@e-logistic/api";
import { geocode, haversineKm } from "@e-logistic/maps";
import { cssPalette as palette } from "@e-logistic/ui";
import { use, useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";

/** #325: średnia prędkość podróżna TIR do szacunku ETA (heurystyka). */
const AVG_TRUCK_KMH = 65;

function fmtEta(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m} min`;
  return `${h} h ${m.toString().padStart(2, "0")} min`;
}

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
  // #325: ETA — geokodowany cel + odległość w linii prostej od pozycji auta.
  const [eta, setEta] = useState<{ km: number; hours: number } | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetchOrderTracking(getBrowserSupabase(), token)
        .then((r) => {
          if (!alive) return;
          setRow(r);
          setState(r ? "ok" : "missing");
        })
        .catch(() => alive && setState("error"));
    load();
    const id = setInterval(load, 60_000); // auto-odświeżanie statusu i pozycji
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [token]);

  useEffect(() => {
    if (!row?.destination || row.truck_lat == null || row.truck_lng == null) {
      setEta(null);
      return;
    }
    let alive = true;
    geocode(row.destination, { limit: 1 })
      .then((hits) => {
        const hit = hits[0];
        if (!alive || !hit) return;
        // Odległość w linii prostej ×1.25 ≈ trasa drogowa; 65 km/h średnio.
        const km = Math.round(
          haversineKm(
            { lat: row.truck_lat as number, lng: row.truck_lng as number },
            { lat: hit.lat, lng: hit.lng },
          ) * 1.25,
        );
        setEta({ km, hours: km / AVG_TRUCK_KMH });
      })
      .catch(() => alive && setEta(null));
    return () => {
      alive = false;
    };
  }, [row?.destination, row?.truck_lat, row?.truck_lng]);

  const truckAgeMin =
    row?.truck_updated_at != null
      ? Math.max(0, Math.round((Date.now() - new Date(row.truck_updated_at).getTime()) / 60_000))
      : null;

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

            {row.truck_lat != null && row.truck_lng != null && !cancelled && (
              <div style={s.truckBox}>
                <div style={s.truckLine}>
                  🚛 Auto w drodze
                  {truckAgeMin != null &&
                    ` · pozycja ${truckAgeMin < 1 ? "sprzed chwili" : `sprzed ${truckAgeMin} min`}`}
                  {" · "}
                  <a
                    style={s.mapLink}
                    href={`https://www.openstreetmap.org/?mlat=${row.truck_lat}&mlon=${row.truck_lng}#map=8/${row.truck_lat}/${row.truck_lng}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    zobacz na mapie
                  </a>
                </div>
                {eta && (
                  <div style={s.etaLine}>
                    Szacowany przyjazd: <strong>za ~{fmtEta(eta.hours)}</strong>
                    <span style={s.etaDim}> (ok. {eta.km} km do celu)</span>
                  </div>
                )}
              </div>
            )}

            <p style={s.note}>
              Status potwierdzany przez kierowcę w aplikacji E-Logistic.
              {eta ? " Czas przyjazdu jest szacunkiem (średnie tempo TIR) — nie gwarancją." : ""}
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
  truckBox: {
    marginTop: 22,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 12,
    padding: "12px 14px",
    display: "grid",
    gap: 6,
  },
  truckLine: { color: "#fff", fontSize: 14, fontWeight: 600 },
  etaLine: { color: "#fff", fontSize: 15 },
  etaDim: { color: palette.smoke, fontSize: 13 },
  mapLink: { color: palette.red, textDecoration: "underline" },
};
