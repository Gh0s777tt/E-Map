"use client";

import { type DevStats, getActiveMembership, getDevStats, listRecentAudit } from "@e-logistic/api";
import { palette } from "@e-logistic/ui";
import { useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";

type Audit = { id: string; action: string; target: string | null; created_at: string };

const STAT_LABEL: Record<string, string> = {
  companies: "Firmy",
  profiles: "Użytkownicy",
  memberships: "Członkostwa",
  vehicles: "Pojazdy",
  fuel_logs: "Tankowania",
  adblue_logs: "AdBlue",
  trip_events: "Trip",
  fuel_cards: "Karty",
  map_reports: "Zgłoszenia",
  invites: "Zaproszenia",
};

export default function DevPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [stats, setStats] = useState<DevStats>({});
  const [audit, setAudit] = useState<Audit[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const sb = getBrowserSupabase();
        const m = await getActiveMembership(sb);
        if (m?.role !== "developer") {
          setAllowed(false);
          return;
        }
        setAllowed(true);
        setStats(await getDevStats(sb));
        setAudit((await listRecentAudit(sb)) as Audit[]);
      } catch {
        setAllowed(false);
      }
    })();
  }, []);

  return (
    <div style={{ maxWidth: 820 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Panel developera</h1>
      <p style={{ color: palette.smoke, marginTop: 4 }}>Diagnostyka platformy (rola developer).</p>

      {allowed === false && (
        <p style={{ color: palette.smoke, marginTop: 16 }}>
          Brak dostępu (wymagana rola developer).
        </p>
      )}

      {allowed && (
        <>
          <div style={{ display: "flex", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
            {Object.entries(stats).map(([k, v]) => (
              <div key={k} style={styles.stat}>
                <div style={{ color: palette.smoke, fontSize: 12 }}>{STAT_LABEL[k] ?? k}</div>
                <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: palette.red }}>
                  {v}
                </div>
              </div>
            ))}
          </div>

          <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32 }}>Ostatni audyt</h2>
          {audit.length === 0 ? (
            <p style={{ color: palette.smoke }}>Brak wpisów.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
              {audit.map((a) => (
                <div key={a.id} style={styles.row}>
                  <strong style={{ minWidth: 160 }}>{a.action}</strong>
                  <span style={{ color: palette.smoke, fontSize: 13, flex: 1 }}>
                    {a.target ?? "—"}
                  </span>
                  <span style={{ color: palette.smoke, fontSize: 12 }}>
                    {new Date(a.created_at).toLocaleString("pl-PL")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  stat: {
    minWidth: 130,
    padding: 16,
    borderRadius: 12,
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
  },
  row: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    padding: "10px 14px",
    borderRadius: 10,
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
  },
};
