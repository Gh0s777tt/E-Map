"use client";

import {
  type Company,
  getCompany,
  listMyOrders,
  type Order,
  setOrderStatus,
} from "@e-logistic/api";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@e-logistic/core";
import { palette } from "@e-logistic/ui";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CmrDoc } from "@/components/CmrDoc";
import { ListStatus } from "@/components/ListStatus";
import { Badge, Button, PageHeader } from "@/components/ui";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { useFleet } from "@/lib/useFleet";

const STATUS_COLOR: Record<OrderStatus, string> = {
  new: palette.smoke,
  assigned: "#3b82f6",
  in_progress: "#f59e0b",
  delivered: "#22c55e",
  invoiced: "#a855f7",
  cancelled: palette.red,
};

export default function MyOrdersPage() {
  const { vehicles } = useFleet();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [cmrOrder, setCmrOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadErr(null);
    try {
      const sb = getBrowserSupabase();
      const m = await getCachedMembership(sb);
      if (!m) {
        setOrders([]);
        return;
      }
      const [ord, comp] = await Promise.all([listMyOrders(sb), getCompany(sb, m.companyId)]);
      setOrders(ord);
      setCompany(comp);
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Nie udało się pobrać zleceń.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const regOf = (id: string | null) =>
    id ? (vehicles.find((v) => v.id === id)?.registration ?? "—") : "—";

  function showOnMap(o: Order) {
    const p = new URLSearchParams();
    if (o.origin) p.set("from", o.origin);
    if (o.destination) p.set("to", o.destination);
    router.push(`/map?${p.toString()}`);
  }

  async function advance(o: Order, status: OrderStatus) {
    setMsg(null);
    try {
      await setOrderStatus(getBrowserSupabase(), o.id, status);
      setMsg(`✅ Status: ${ORDER_STATUS_LABELS[status]}`);
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Błąd zmiany statusu.");
    }
  }

  if (cmrOrder) {
    return (
      <CmrDoc
        order={cmrOrder}
        company={company}
        vehicleReg={regOf(cmrOrder.vehicle_id)}
        onBack={() => setCmrOrder(null)}
      />
    );
  }

  return (
    <div style={{ maxWidth: 820 }}>
      <PageHeader
        title="Moje zlecenia"
        subtitle="Zlecenia przypisane do Ciebie. Oznacz „W trakcie” po podjęciu i „Dostarczone” po rozładunku; wydrukuj list przewozowy CMR."
      />

      <ListStatus
        loading={loading}
        error={loadErr}
        empty={orders.length === 0}
        emptyText="Brak przypisanych zleceń."
        onRetry={load}
      />

      {msg && <p style={{ color: palette.smoke, fontSize: 14 }}>{msg}</p>}

      {!loading && !loadErr && orders.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          {orders.map((o) => (
            <div key={o.id} style={styles.card}>
              <div style={styles.cardHead}>
                <strong>{o.reference_no || "(bez numeru)"}</strong>
                <Badge color={STATUS_COLOR[o.status]}>{ORDER_STATUS_LABELS[o.status]}</Badge>
              </div>
              <div style={styles.cardBody}>
                {(o.origin || o.destination) && (
                  <span>
                    📍 {o.origin || "?"} → {o.destination || "?"}
                  </span>
                )}
                {o.cargo && <span style={styles.dim}>📦 {o.cargo}</span>}
                {o.weight_kg != null && <span style={styles.dim}>{o.weight_kg} kg</span>}
                {o.vehicle_id && <span style={styles.dim}>🚚 {regOf(o.vehicle_id)}</span>}
                {o.load_date && <span style={styles.dim}>zał. {o.load_date}</span>}
                {o.unload_date && <span style={styles.dim}>rozł. {o.unload_date}</span>}
              </div>
              <div style={styles.cardActions}>
                <Button variant="ghost" onClick={() => setCmrOrder(o)}>
                  📄 CMR
                </Button>
                {(o.origin || o.destination) && (
                  <Button variant="ghost" onClick={() => showOnMap(o)}>
                    🗺️ Mapa
                  </Button>
                )}
                <span style={{ flex: 1 }} />
                {(o.status === "new" || o.status === "assigned") && (
                  <Button onClick={() => advance(o, "in_progress")}>▶️ W trakcie</Button>
                )}
                {o.status === "in_progress" && (
                  <Button onClick={() => advance(o, "delivered")}>✅ Dostarczone</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    borderRadius: 10,
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    padding: "12px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  cardHead: { display: "flex", gap: 10, alignItems: "center" },
  cardBody: { display: "flex", gap: 14, flexWrap: "wrap", fontSize: 14 },
  cardActions: { display: "flex", gap: 8, alignItems: "center" },
  dim: { color: palette.smoke, fontSize: 13 },
};
