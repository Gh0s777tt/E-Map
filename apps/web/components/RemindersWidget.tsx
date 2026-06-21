"use client";

import { listVehiclesExpiry } from "@e-logistic/api";
import { type ExpiryLevel, expiryStatus } from "@e-logistic/core";
import { palette } from "@e-logistic/ui";
import { useEffect, useState } from "react";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";

type Reminder = {
  key: string;
  vehicle: string;
  kind: string;
  date: string;
  daysLeft: number;
  level: ExpiryLevel;
};

const FIELDS: { col: "inspection_expiry" | "insurance_expiry" | "leasing_end"; label: string }[] = [
  { col: "inspection_expiry", label: "Przegląd" },
  { col: "insurance_expiry", label: "OC" },
  { col: "leasing_end", label: "Leasing" },
];

export function RemindersWidget() {
  const [items, setItems] = useState<Reminder[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const sb = getBrowserSupabase();
        const m = await getCachedMembership(sb);
        if (!m) return;
        const vehicles = await listVehiclesExpiry(sb, m.companyId);
        const today = new Date().toISOString().slice(0, 10);
        const out: Reminder[] = [];
        for (const v of vehicles) {
          for (const f of FIELDS) {
            const date = v[f.col];
            if (!date) continue;
            const st = expiryStatus(date, today);
            if (st.level === "ok") continue;
            out.push({
              key: `${v.id}-${f.col}`,
              vehicle: v.registration,
              kind: f.label,
              date,
              daysLeft: st.daysLeft,
              level: st.level,
            });
          }
        }
        out.sort((a, b) => a.daysLeft - b.daysLeft);
        setItems(out);
      } catch {
        // offline → brak widżetu
      }
    })();
  }, []);

  if (items.length === 0) return null;

  return (
    <div style={styles.card}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>⏰ Przypomnienia (dokumenty pojazdów)</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((r) => {
          const color = r.level === "expired" ? palette.red : palette.warning;
          const text =
            r.level === "expired" ? `po terminie (${-r.daysLeft} dni)` : `za ${r.daysLeft} dni`;
          return (
            <div key={r.key} style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <strong style={{ minWidth: 90 }}>{r.vehicle}</strong>
              <span style={{ color: palette.smoke, minWidth: 70 }}>{r.kind}</span>
              <span style={{ color: palette.smoke, fontSize: 13 }}>{r.date}</span>
              <span style={{ flex: 1 }} />
              <span style={{ color, fontWeight: 700, fontSize: 13 }}>{text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
  },
};
