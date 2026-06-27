"use client";

import {
  latestOdometers,
  listDamageClaims,
  listDocuments,
  listDrivers,
  listFuelCardsSafe,
  listInvoices,
  listServiceTasks,
  listVehiclesExpiry,
} from "@e-logistic/api";
import {
  DAMAGE_KIND_LABELS,
  DAMAGE_STATUS_LABELS,
  type ExpiryLevel,
  expiryStatus,
  invoicePaymentStatus,
  serviceStatus,
} from "@e-logistic/core";
import { cssPalette as palette } from "@e-logistic/ui";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";

type Level = Exclude<ExpiryLevel, "ok">;

type Item = {
  key: string;
  icon: string;
  category: string;
  title: string;
  detail: string;
  level: Level;
  /** Im niżej, tym pilniej (dni do terminu; po terminie = ujemne; serwis: km/100). */
  urgency: number;
  href: string;
};

const VEH_FIELDS = [
  { col: "inspection_expiry", label: "Przegląd" },
  { col: "insurance_expiry", label: "OC" },
  { col: "leasing_end", label: "Leasing" },
] as const;

const DRV_FIELDS = [
  { col: "license_expiry", label: "Prawo jazdy" },
  { col: "code95_expiry", label: "Kod 95" },
  { col: "medical_expiry", label: "Badania lekarskie" },
  { col: "psychotech_expiry", label: "Psychotechniczne" },
  { col: "adr_expiry", label: "ADR" },
] as const;

const MAX_SHOWN = 15;

/**
 * Zbiorczy panel „Co wymaga uwagi" — liczony na żywo (niezależnie od crona).
 * Agreguje terminy: dokumenty pojazdów (przegląd/OC/leasing), karty paliwowe,
 * serwis wg przebiegu (km) oraz dokumenty z sejfu. Pokazuje tylko pozycje
 * wymagające reakcji (po terminie / wkrótce), posortowane wg pilności.
 */
export function AttentionPanel() {
  const [items, setItems] = useState<Item[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const sb = getBrowserSupabase();
        const m = await getCachedMembership(sb);
        // Panel zarządczy (terminy floty/faktur) — tylko owner/dispatcher.
        if (!m || (m.role !== "owner" && m.role !== "dispatcher")) return;
        const [vehs, cards, tasks, odo, docs, invs, drvs, claims] = await Promise.all([
          listVehiclesExpiry(sb, m.companyId),
          listFuelCardsSafe(sb, m.companyId),
          listServiceTasks(sb, m.companyId),
          latestOdometers(sb, m.companyId),
          listDocuments(sb, m.companyId),
          listInvoices(sb, m.companyId),
          listDrivers(sb, m.companyId).catch(() => []),
          listDamageClaims(sb, m.companyId).catch(() => []),
        ]);
        const today = new Date().toISOString().slice(0, 10);
        const regOf = new Map(vehs.map((v) => [v.id, v.registration]));
        const out: Item[] = [];

        for (const v of vehs) {
          for (const f of VEH_FIELDS) {
            const date = v[f.col];
            if (!date) continue;
            const st = expiryStatus(date, today);
            if (st.level === "ok") continue;
            out.push({
              key: `veh-${v.id}-${f.col}`,
              icon: "🚚",
              category: "Pojazd",
              title: `${v.registration} · ${f.label}`,
              detail: date,
              level: st.level,
              urgency: st.daysLeft,
              href: "/vehicles",
            });
          }
        }

        for (const c of cards) {
          if (!c.valid_until) continue;
          const st = expiryStatus(c.valid_until, today);
          if (st.level === "ok") continue;
          out.push({
            key: `card-${c.id}`,
            icon: "💳",
            category: "Karta",
            title:
              `${String(c.provider ?? "Karta").toUpperCase()} ${c.card_number_masked ?? ""}`.trim(),
            detail: c.valid_until,
            level: st.level,
            urgency: st.daysLeft,
            href: "/cards",
          });
        }

        for (const t of tasks) {
          const cur = odo[t.vehicle_id] ?? null;
          const st = serviceStatus(cur, t.last_done_km, t.interval_km);
          if (st.level === "ok" || st.kmLeft == null) continue;
          out.push({
            key: `svc-${t.id}`,
            icon: "🔧",
            category: "Serwis",
            title: `${regOf.get(t.vehicle_id) ?? "—"} · ${t.name}`,
            detail: st.kmLeft < 0 ? `przekroczono o ${-st.kmLeft} km` : `za ${st.kmLeft} km`,
            level: st.level,
            urgency: st.kmLeft / 100,
            href: "/service",
          });
        }

        for (const d of docs) {
          if (!d.expiry_date) continue;
          const st = expiryStatus(d.expiry_date, today);
          if (st.level === "ok") continue;
          out.push({
            key: `doc-${d.id}`,
            icon: "📄",
            category: "Dokument",
            title: d.name,
            detail: d.expiry_date,
            level: st.level,
            urgency: st.daysLeft,
            href: "/documents",
          });
        }

        for (const inv of invs) {
          const pay = invoicePaymentStatus({
            paidAt: inv.paid_at,
            dueDate: inv.due_date,
            status: inv.status,
            todayISO: today,
          });
          if (pay !== "overdue") continue;
          const days = inv.due_date
            ? Math.round((Date.parse(inv.due_date) - Date.parse(today)) / 86_400_000)
            : 0;
          out.push({
            key: `inv-${inv.id}`,
            icon: "🧾",
            category: "Faktura",
            title: `${inv.number} · ${inv.buyer_name ?? "—"}`,
            detail: `termin ${inv.due_date} · ${inv.gross} ${inv.currency}`,
            level: "expired",
            urgency: days,
            href: "/invoices",
          });
        }

        for (const c of claims) {
          if (c.status !== "reported" && c.status !== "in_progress") continue;
          const daysSince = Math.round((Date.parse(today) - Date.parse(c.claim_date)) / 86_400_000);
          out.push({
            key: `dmg-${c.id}`,
            icon: "🛠️",
            category: "Szkoda",
            title: `${c.vehicle_id ? (regOf.get(c.vehicle_id) ?? "—") : "—"} · ${DAMAGE_KIND_LABELS[c.kind]}`,
            detail: `${DAMAGE_STATUS_LABELS[c.status]}${c.cost != null ? ` · ${c.cost} ${c.currency}` : ""}`,
            level: c.status === "reported" ? "expired" : "soon",
            urgency: -daysSince,
            href: "/damages",
          });
        }

        for (const d of drvs) {
          const name = `${d.last_name} ${d.first_name}`.trim() || "Kierowca";
          for (const fld of DRV_FIELDS) {
            const date = d[fld.col];
            if (!date) continue;
            const st = expiryStatus(date, today);
            if (st.level === "ok") continue;
            out.push({
              key: `drv-${d.id}-${fld.col}`,
              icon: "🪪",
              category: "Kierowca",
              title: `${name} · ${fld.label}`,
              detail: date,
              level: st.level,
              urgency: st.daysLeft,
              href: "/drivers",
            });
          }
        }

        out.sort((a, b) => rank(a.level) - rank(b.level) || a.urgency - b.urgency);
        setItems(out);
      } catch {
        // offline / brak dostępu → ukryj panel
      } finally {
        setReady(true);
      }
    })();
  }, []);

  if (!ready || items.length === 0) return null;

  const expired = items.filter((i) => i.level === "expired").length;
  const soon = items.length - expired;
  const shown = items.slice(0, MAX_SHOWN);

  return (
    <div style={styles.card}>
      <div style={styles.head}>
        <span style={{ fontWeight: 800 }}>⚠️ Co wymaga uwagi</span>
        {expired > 0 && <span style={styles.pillRed}>{expired} po terminie</span>}
        {soon > 0 && <span style={styles.pillWarn}>{soon} wkrótce</span>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {shown.map((it) => {
          const color = it.level === "expired" ? palette.red : palette.warning;
          return (
            <Link key={it.key} href={it.href} style={styles.row}>
              <span style={{ width: 22 }}>{it.icon}</span>
              <span style={{ color: palette.smoke, minWidth: 72, fontSize: 12 }}>
                {it.category}
              </span>
              <strong style={{ flex: 1, minWidth: 120 }}>{it.title}</strong>
              <span style={{ color: palette.smoke, fontSize: 12 }}>{it.detail}</span>
              <span
                style={{ color, fontWeight: 700, fontSize: 13, minWidth: 110, textAlign: "right" }}
              >
                {it.category === "Szkoda"
                  ? "otwarta"
                  : it.level === "expired"
                    ? "po terminie"
                    : "wkrótce"}
              </span>
            </Link>
          );
        })}
      </div>
      {items.length > MAX_SHOWN && (
        <div style={{ color: palette.smoke, fontSize: 12, marginTop: 8 }}>
          …i {items.length - MAX_SHOWN} więcej
        </div>
      )}
    </div>
  );
}

function rank(l: Level): number {
  return l === "expired" ? 0 : 1;
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
  },
  head: { display: "flex", gap: 10, alignItems: "center", marginBottom: 10 },
  pillRed: {
    background: palette.red,
    color: palette.white,
    borderRadius: 999,
    padding: "2px 10px",
    fontSize: 12,
    fontWeight: 700,
  },
  pillWarn: {
    background: "transparent",
    color: palette.warning,
    border: `1px solid ${palette.warning}`,
    borderRadius: 999,
    padding: "2px 10px",
    fontSize: 12,
    fontWeight: 700,
  },
  row: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    padding: "7px 8px",
    borderRadius: 8,
    color: palette.offWhite,
    textDecoration: "none",
  },
};
