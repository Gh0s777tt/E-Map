"use client";

import { type DevStats, getActiveMembership, getDevStats } from "@e-logistic/api";
import { palette } from "@e-logistic/ui";
import { useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";

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
      } catch {
        setAllowed(false);
      }
    })();
  }, []);

  return (
    <div style={{ maxWidth: 820 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Panel developera</h1>
      <p style={{ color: palette.smoke, marginTop: 4 }}>
        Diagnostyka platformy — wyłącznie zagregowane liczniki. Developer nie ma dostępu do danych
        firm, kierowców ani danych wrażliwych.
      </p>

      {allowed === false && (
        <p style={{ color: palette.smoke, marginTop: 16 }}>
          Brak dostępu (wymagana rola developer).
        </p>
      )}

      {allowed && (
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
};
