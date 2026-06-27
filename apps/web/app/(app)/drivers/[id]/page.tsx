"use client";

import {
  type CompanyMember,
  type DriverRow,
  linkDriverUser,
  listCompanyMembers,
  listDrivers,
  listOrders,
  type Order,
} from "@e-logistic/api";
import { type ExpiryLevel, expiryStatus, round2 } from "@e-logistic/core";
import { cssPalette as palette } from "@e-logistic/ui";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ListStatus } from "@/components/ListStatus";
import { useT } from "@/components/LocaleProvider";
import { Badge, PageHeader } from "@/components/ui";
import { orderStatusLabel } from "@/lib/labels";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";

const EXPIRY_DOCS: { key: keyof DriverRow; label: string }[] = [
  { key: "license_expiry", label: "Prawo jazdy" },
  { key: "code95_expiry", label: "Kod 95" },
  { key: "medical_expiry", label: "Badania lekarskie" },
  { key: "psychotech_expiry", label: "Psychotechniczne" },
  { key: "adr_expiry", label: "ADR" },
];
const EXPIRY_COLOR: Record<ExpiryLevel, string> = {
  expired: palette.red,
  soon: "#f59e0b",
  ok: "#22c55e",
};

export default function DriverCardPage() {
  const t = useT();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [driver, setDriver] = useState<DriverRow | null>(null);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadErr(null);
    try {
      const sb = getBrowserSupabase();
      const m = await getCachedMembership(sb);
      if (!m) return;
      if (m.role !== "owner" && m.role !== "dispatcher") {
        setDenied(true);
        return;
      }
      setCompanyId(m.companyId);
      const [drivers, mem, ord] = await Promise.all([
        listDrivers(sb, m.companyId),
        listCompanyMembers(sb),
        listOrders(sb, m.companyId),
      ]);
      setDriver(drivers.find((d) => d.id === id) ?? null);
      setMembers(mem);
      setOrders(ord);
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Nie udało się pobrać kartoteki.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const today = new Date().toISOString().slice(0, 10);
  const drivers = useMemo(
    () => members.filter((mb) => mb.status === "active" && mb.role === "driver"),
    [members],
  );
  const myOrders = useMemo(
    () => (driver?.user_id ? orders.filter((o) => o.assigned_to === driver.user_id) : []),
    [orders, driver],
  );
  const stats = useMemo(() => {
    const delivered = myOrders.filter((o) => o.status === "delivered" || o.status === "invoiced");
    const revenueEur = round2(
      delivered.filter((o) => o.currency === "EUR").reduce((a, o) => a + (o.price ?? 0), 0),
    );
    return { total: myOrders.length, delivered: delivered.length, revenueEur };
  }, [myOrders]);

  async function changeLink(userId: string) {
    setMsg(null);
    try {
      await linkDriverUser(getBrowserSupabase(), id, companyId, userId || null);
      setMsg("✅ Zapisano powiązanie konta.");
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Błąd powiązania.");
    }
  }

  if (denied) {
    return (
      <div style={{ maxWidth: 820 }}>
        <PageHeader title="Karta kierowcy" subtitle="" />
        <p style={{ color: palette.red, marginTop: 16 }}>
          ⛔ Dostęp do kartoteki kierowców mają tylko właściciel/spedytor.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 820 }}>
      <div style={{ marginBottom: 8 }}>
        <Link href="/drivers" className="app-navlink" style={{ fontSize: 13 }}>
          ← Kierowcy
        </Link>
      </div>

      <ListStatus
        loading={loading}
        error={loadErr}
        empty={!loading && !driver}
        emptyText="Nie znaleziono kierowcy."
        onRetry={load}
      />

      {!loading && driver && (
        <>
          <PageHeader
            title={`${driver.last_name} ${driver.first_name}`.trim() || "Kierowca"}
            subtitle="Karta kierowcy: dokumenty i terminy, powiązane konto oraz historia zleceń."
          />

          {/* Dokumenty / terminy */}
          <h2 style={styles.h2}>Dokumenty i terminy</h2>
          <div style={styles.grid}>
            {EXPIRY_DOCS.map((doc) => {
              const date = driver[doc.key] as string | null;
              const st = date ? expiryStatus(date, today) : null;
              return (
                <div key={doc.key} style={styles.docCard}>
                  <div style={styles.dim}>{doc.label}</div>
                  <div style={{ fontWeight: 700 }}>{date ?? "— brak —"}</div>
                  {st && (
                    <Badge color={EXPIRY_COLOR[st.level]}>
                      {st.level === "expired"
                        ? `po terminie (${-st.daysLeft} dni)`
                        : st.level === "soon"
                          ? `za ${st.daysLeft} dni`
                          : "ważny"}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>

          {/* Uprawnienia */}
          <h2 style={styles.h2}>Uprawnienia</h2>
          <div style={{ ...styles.body, marginBottom: 4 }}>
            <span style={styles.dim}>Kategorie:</span>{" "}
            {driver.license_categories.length ? driver.license_categories.join(", ") : "—"}
          </div>
          <div style={styles.body}>
            {driver.qualifications.length ? (
              driver.qualifications.map((q) => (
                <span key={q} style={styles.tag}>
                  {q}
                </span>
              ))
            ) : (
              <span style={styles.dim}>Brak dodatkowych uprawnień.</span>
            )}
          </div>
          {driver.notes && <p style={{ ...styles.dim, marginTop: 8 }}>📝 {driver.notes}</p>}

          {/* Powiązane konto */}
          <h2 style={styles.h2}>Konto w aplikacji</h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <select
              style={styles.input}
              value={driver.user_id ?? ""}
              onChange={(e) => changeLink(e.target.value)}
            >
              <option value="">— niepowiązane —</option>
              {drivers.map((d) => (
                <option key={d.user_id} value={d.user_id}>
                  {d.email}
                </option>
              ))}
            </select>
            <span style={styles.dim}>
              Powiązanie łączy kartotekę z kontem (do historii zleceń).
            </span>
          </div>
          {msg && <p style={{ color: palette.smoke, fontSize: 13 }}>{msg}</p>}

          {/* Historia zleceń */}
          <h2 style={styles.h2}>Historia zleceń</h2>
          {!driver.user_id ? (
            <p style={styles.dim}>
              Powiąż konto, aby zobaczyć zlecenia przypisane do tego kierowcy.
            </p>
          ) : (
            <>
              <div style={styles.statsRow}>
                <Stat label="Zleceń" value={String(stats.total)} />
                <Stat label="Dostarczone" value={String(stats.delivered)} />
                <Stat label="Przychód (EUR)" value={`${stats.revenueEur} €`} accent="#22c55e" />
              </div>
              {myOrders.length === 0 ? (
                <p style={styles.dim}>Brak zleceń przypisanych do tego kierowcy.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                  {myOrders.slice(0, 15).map((o) => (
                    <div key={o.id} style={styles.orderRow}>
                      <strong style={{ minWidth: 110 }}>{o.reference_no || "(bez nr)"}</strong>
                      <Badge color={palette.smoke}>{orderStatusLabel(t, o.status)}</Badge>
                      <span style={styles.dim}>
                        {o.origin || "?"} → {o.destination || "?"}
                      </span>
                      <span style={{ flex: 1 }} />
                      {o.price != null && (
                        <span style={styles.dim}>
                          {o.price} {o.currency}
                        </span>
                      )}
                      {o.load_date && <span style={styles.dim}>{o.load_date}</span>}
                    </div>
                  ))}
                  {myOrders.length > 15 && (
                    <span style={styles.dim}>…i {myOrders.length - 15} więcej</span>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={styles.statCard}>
      <div style={{ fontSize: 12, color: palette.smoke }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: accent ?? palette.offWhite }}>
        {value}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  h2: { fontSize: 15, fontWeight: 700, marginTop: 24, marginBottom: 8 },
  grid: { display: "flex", gap: 12, flexWrap: "wrap" },
  docCard: {
    flex: 1,
    minWidth: 150,
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 10,
    padding: "10px 12px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  body: { display: "flex", gap: 8, flexWrap: "wrap", fontSize: 14, alignItems: "center" },
  dim: { color: palette.smoke, fontSize: 13 },
  tag: {
    background: palette.black,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 999,
    padding: "2px 10px",
    fontSize: 12,
  },
  input: {
    background: palette.black,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
    padding: "9px 12px",
    color: palette.offWhite,
    minWidth: 220,
  },
  statsRow: { display: "flex", gap: 12, flexWrap: "wrap" },
  statCard: {
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 10,
    padding: "10px 16px",
    minWidth: 120,
  },
  orderRow: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    padding: "8px 12px",
    borderRadius: 8,
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    fontSize: 14,
  },
};
