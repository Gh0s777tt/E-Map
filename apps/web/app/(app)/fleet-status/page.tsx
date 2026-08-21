"use client";

import {
  type CompanyMember,
  listCompanyMembers,
  listOrdersAll,
  listTripEventsAll,
  listVehicles,
} from "@e-logistic/api";
import { buildFleetStatus, type FleetVehicleState, type OrderStatus } from "@e-logistic/core";
import { cssPalette as palette } from "@e-logistic/ui";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ListStatus } from "@/components/ListStatus";
import { useT } from "@/components/LocaleProvider";
import { Badge, Button, PageHeader, SetupNotice } from "@/components/ui";
import { tripActionLabel } from "@/lib/labels";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { useFleet } from "@/lib/useFleet";

type OrderRaw = {
  vehicle_id: string | null;
  status: string;
  reference_no: string | null;
  origin: string | null;
  destination: string | null;
  assigned_to: string | null;
  load_date: string | null;
  unload_date: string | null;
};
type TripRaw = {
  vehicle_id: string;
  action: string;
  location: string | null;
  country: string | null;
  created_at: string;
};

const STATE_COLOR: Record<FleetVehicleState, string> = {
  driving: "#f59e0b",
  planned: "#3b82f6",
  idle: palette.smoke,
};

/**
 * Stan pojazdu bierze się WYŁĄCZNIE z tych dwóch statusów (`buildFleetStatus`),
 * więc zawężenie idzie do bazy: zamiast całej historii firmy schodzi tyle zleceń,
 * ile jest w tej chwili w robocie. Bez tego pobranie kompletu znaczyłoby ściąganie
 * kilkunastu tysięcy zamkniętych zleceń, żeby odczytać z nich zero informacji.
 */
const ACTIVE_STATUSES: OrderStatus[] = ["in_progress", "assigned"];

/**
 * Okno, z którego bierzemy „ostatnie zdarzenie" pojazdu.
 *
 * Dotąd stało tu `limit: 1000` — czyli okno czasowe, tylko niejawne i o długości
 * zależnej od wielkości floty: przy 20 ciągnikach obejmowało tygodnie, przy 300
 * kilka godzin, i to bez żadnego sygnału. Jawne 14 dni jest krótsze dla małej firmy,
 * ale przewidywalne dla każdej, a ekran odpowiada na pytanie „co się dzieje TERAZ";
 * zdarzenie sprzed miesiąca i tak nie opisuje bieżącego stanu pojazdu.
 */
const EVENTS_WINDOW_DAYS = 14;

export default function FleetStatusPage() {
  const t = useT();
  const { source } = useFleet();
  const router = useRouter();
  const [vehicles, setVehicles] = useState<{ id: string; registration: string }[]>([]);
  const [orders, setOrders] = useState<OrderRaw[]>([]);
  const [trips, setTrips] = useState<TripRaw[]>([]);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  /** Któryś ze zbiorów urwał się na sufit pobrania — patrz baner niżej. */
  const [incomplete, setIncomplete] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadErr(null);
    setIncomplete(false);
    try {
      const sb = getBrowserSupabase();
      const m = await getCachedMembership(sb);
      if (!m) {
        setVehicles([]);
        return;
      }
      const manage = m.role === "owner" || m.role === "dispatcher";
      const eventsFrom = new Date(Date.now() - EVENTS_WINDOW_DAYS * 86_400_000).toISOString();
      const [vs, ordPaged, trPaged, mem] = await Promise.all([
        listVehicles(sb, m.companyId),
        listOrdersAll(sb, m.companyId, { statuses: ACTIVE_STATUSES }),
        listTripEventsAll(sb, { from: eventsFrom }),
        manage ? listCompanyMembers(sb) : Promise.resolve([]),
      ]);
      // Ucięte zlecenia to nie kosmetyka: pojazd z aktywną trasą, której zlecenie
      // nie dojechało, pokazuje się jako WOLNY — czyli ekran kłamie o operacyjnym
      // fakcie, a nie tylko gubi ozdobnik.
      setIncomplete(!ordPaged.complete || !trPaged.complete);
      setVehicles(
        (vs as { id: string; registration: string }[]).map((v) => ({
          id: v.id,
          registration: v.registration,
        })),
      );
      setOrders(ordPaged.rows as OrderRaw[]);
      setTrips(trPaged.rows as TripRaw[]);
      setMembers(mem);
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Nie udało się pobrać statusu floty.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const emailOf = (uid: string | null) =>
    uid ? (members.find((mb) => mb.user_id === uid)?.email ?? null) : null;

  const rows = useMemo(
    () =>
      buildFleetStatus({
        vehicles,
        orders: orders.map((o) => ({
          vehicleId: o.vehicle_id,
          status: o.status,
          referenceNo: o.reference_no,
          origin: o.origin,
          destination: o.destination,
          assignedTo: o.assigned_to,
          loadDate: o.load_date,
          unloadDate: o.unload_date,
        })),
        events: trips.map((t) => ({
          vehicleId: t.vehicle_id,
          action: t.action,
          location: t.location,
          country: t.country,
          createdAt: t.created_at,
        })),
      }),
    [vehicles, orders, trips],
  );

  const counts = useMemo(() => {
    const c = { driving: 0, planned: 0, idle: 0 };
    for (const r of rows) c[r.state]++;
    return c;
  }, [rows]);

  function showOnMap(origin: string | null, destination: string | null) {
    const p = new URLSearchParams();
    if (origin) p.set("from", origin);
    if (destination) p.set("to", destination);
    router.push(`/map?${p.toString()}`);
  }

  return (
    <div style={{ maxWidth: 920 }}>
      <PageHeader
        title="Status floty"
        subtitle="Co robi każdy pojazd teraz: w trasie (aktywne zlecenie), zaplanowane czy wolny — z ostatnim zdarzeniem trasy."
      />

      <SetupNotice source={source} noVehicles="Dodaj pojazd, aby zobaczyć status floty." />

      <div style={styles.controls} className="no-print">
        <Badge color={STATE_COLOR.driving}>W trasie: {counts.driving}</Badge>
        <Badge color={STATE_COLOR.planned}>Zaplanowane: {counts.planned}</Badge>
        <Badge color={STATE_COLOR.idle}>Wolne: {counts.idle}</Badge>
        <span style={{ flex: 1 }} />
        <Button variant="ghost" onClick={load}>
          🔄 Odśwież
        </Button>
      </div>

      {/* Baner nad listą, bo unieważnia stan KAŻDEGO wiersza naraz — nie da się
          wskazać, którym pojazdom zabrakło danych. Przez katalog, nie na sztywno:
          podpis, którego dyspozytor nie czyta w swoim języku, przed niczym nie ostrzega
          — a to jedyne zdanie mające go powstrzymać przed rozdysponowaniem floty. */}
      {!loading && !loadErr && incomplete && <div style={styles.warn}>{t("fleet.incomplete")}</div>}

      <ListStatus
        loading={loading}
        error={loadErr}
        empty={!loading && vehicles.length === 0}
        emptyText="Brak pojazdów."
        onRetry={load}
      />

      {!loading && !loadErr && rows.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          {rows.map((r) => (
            <div key={r.vehicleId} style={styles.card}>
              <div style={styles.head}>
                <strong style={{ fontSize: 16 }}>{r.registration}</strong>
                <Badge color={STATE_COLOR[r.state]}>{t(`fleet.state.${r.state}`)}</Badge>
                <span style={{ flex: 1 }} />
                {r.order && (r.order.origin || r.order.destination) && (
                  <Button
                    variant="ghost"
                    onClick={() => showOnMap(r.order?.origin ?? null, r.order?.destination ?? null)}
                  >
                    🗺️ Mapa
                  </Button>
                )}
              </div>

              {r.order ? (
                <div style={styles.body}>
                  <span>
                    📍 {r.order.origin || "?"} → {r.order.destination || "?"}
                  </span>
                  {r.order.referenceNo && <span style={styles.dim}>#{r.order.referenceNo}</span>}
                  {emailOf(r.order.assignedTo) && (
                    <span style={styles.dim}>👤 {emailOf(r.order.assignedTo)}</span>
                  )}
                  {r.order.loadDate && <span style={styles.dim}>zał. {r.order.loadDate}</span>}
                  {r.order.unloadDate && <span style={styles.dim}>rozł. {r.order.unloadDate}</span>}
                </div>
              ) : (
                <div style={{ ...styles.dim, fontSize: 13 }}>Brak aktywnego zlecenia.</div>
              )}

              {r.lastEvent ? (
                <div style={{ ...styles.dim, fontSize: 12 }}>
                  Ostatnio: {tripActionLabel(t, r.lastEvent.action)}
                  {r.lastEvent.location ? ` · ${r.lastEvent.location}` : ""}
                  {r.lastEvent.country ? ` (${r.lastEvent.country})` : ""} ·{" "}
                  {r.lastEvent.createdAt.slice(0, 16).replace("T", " ")}
                </div>
              ) : (
                /* Pojazd wracający z trzytygodniowego postoju serwisowego wygląda inaczej
                   niż taki, który nigdy nie raportował — a bez tego podpisu wiersz po
                   prostu milczał i okno pobrania czytało się jak brak danych w bazie. */
                <div style={{ ...styles.dim, fontSize: 12 }}>
                  {t("fleet.noEvents").replace("{days}", String(EVENTS_WINDOW_DAYS))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  /** Ostrzeżenie o niepełnym zbiorze — ten sam styl co na /monthly i /vehicles/[id]. */
  warn: {
    border: `1px solid ${palette.warning}`,
    borderRadius: 10,
    padding: "10px 14px",
    marginTop: 12,
    color: palette.offWhite,
    fontSize: 13,
    lineHeight: 1.5,
    background: palette.nearBlack,
  },
  controls: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 16 },
  card: {
    borderRadius: 10,
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    padding: "12px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  head: { display: "flex", gap: 10, alignItems: "center" },
  body: { display: "flex", gap: 14, flexWrap: "wrap", fontSize: 14 },
  dim: { color: palette.smoke, fontSize: 13 },
};
