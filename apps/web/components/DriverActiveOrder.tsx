"use client";

import { listMyOrders, type Order } from "@e-logistic/api";
import type { OrderStatus } from "@e-logistic/core";
import { cssPalette as palette } from "@e-logistic/ui";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useT } from "@/components/LocaleProvider";
import { orderStatusLabel } from "@/lib/labels";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";

const STATUS_COLOR: Record<string, string> = {
  assigned: "#3b82f6",
  in_progress: "#f59e0b",
  delivered: "#22c55e",
};

/**
 * Pulpit kierowcy: pokazuje aktywne (w trakcie) lub najbliższe (przypisane) zlecenie
 * zalogowanego kierowcy + skrót do „Moje zlecenia". Widoczne tylko dla roli driver.
 */
export function DriverActiveOrder() {
  const t = useT();
  const [show, setShow] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const sb = getBrowserSupabase();
        const m = await getCachedMembership(sb);
        if (m?.role !== "driver") return;
        setShow(true);
        setOrders(await listMyOrders(sb));
      } catch {
        // brak dostępu → ukryj
      }
    })();
  }, []);

  if (!show) return null;

  const active =
    orders.find((o) => o.status === "in_progress") ?? orders.find((o) => o.status === "assigned");
  const upcoming = orders.filter(
    (o) => o.id !== active?.id && (o.status === "assigned" || o.status === "in_progress"),
  ).length;

  return (
    <div style={styles.card}>
      <div style={{ fontWeight: 800, marginBottom: 10 }}>🚚 Twoje zlecenie</div>
      {active ? (
        <Link href="/my-orders" style={styles.order}>
          <strong style={{ minWidth: 110 }}>{active.reference_no || "(bez numeru)"}</strong>
          <span
            style={{ ...styles.badge, background: STATUS_COLOR[active.status] ?? palette.smoke }}
          >
            {orderStatusLabel(t, active.status as OrderStatus)}
          </span>
          <span style={styles.dim}>
            📍 {active.origin || "?"} → {active.destination || "?"}
          </span>
          <span style={{ flex: 1 }} />
          {active.load_date && <span style={styles.dim}>zał. {active.load_date}</span>}
          <span style={{ color: palette.red, fontWeight: 700, fontSize: 13 }}>Otwórz →</span>
        </Link>
      ) : (
        <p style={styles.dim}>
          Brak aktywnego zlecenia.{" "}
          <Link href="/my-orders" style={{ color: palette.red }}>
            Moje zlecenia →
          </Link>
        </p>
      )}
      {upcoming > 0 && (
        <div style={{ color: palette.smoke, fontSize: 12, marginTop: 8 }}>
          …i {upcoming} kolejnych przypisanych —{" "}
          <Link href="/my-orders" style={{ color: palette.red }}>
            zobacz wszystkie
          </Link>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    background: palette.nearBlack,
    border: `1px solid ${palette.red}`,
  },
  order: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
    padding: "10px 12px",
    borderRadius: 10,
    background: palette.black,
    border: `1px solid ${palette.graphite}`,
    color: palette.offWhite,
    textDecoration: "none",
  },
  badge: {
    color: palette.white,
    borderRadius: 999,
    padding: "2px 10px",
    fontSize: 12,
    fontWeight: 700,
  },
  dim: { color: palette.smoke, fontSize: 13 },
};
