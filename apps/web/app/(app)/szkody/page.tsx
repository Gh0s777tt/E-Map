"use client";

import {
  type DamageClaim,
  deleteDamageClaim,
  insertDamageClaim,
  listDamageClaims,
  setDamageClaimStatus,
} from "@e-logistic/api";
import {
  DAMAGE_KIND_LABELS,
  DAMAGE_KINDS,
  DAMAGE_STATUS_LABELS,
  DAMAGE_STATUSES,
  type DamageKind,
  type DamageStatus,
  summarizeDamageClaims,
} from "@e-logistic/core";
import { palette } from "@e-logistic/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useConfirm } from "@/components/ConfirmProvider";
import * as f from "@/components/formStyles";
import { ListStatus } from "@/components/ListStatus";
import { Button, PageHeader } from "@/components/ui";
import { csvDateStamp, downloadCsv } from "@/lib/csv";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { useFleet } from "@/lib/useFleet";

const STATUS_COLOR: Record<DamageStatus, string> = {
  reported: palette.red,
  in_progress: "#f59e0b",
  repaired: "#3b82f6",
  closed: "#22c55e",
  rejected: palette.smoke,
};

export default function DamageClaimsPage() {
  const confirm = useConfirm();
  const { vehicles } = useFleet();
  const [claims, setClaims] = useState<DamageClaim[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [vehicleId, setVehicleId] = useState("");
  const [driver, setDriver] = useState("");
  const [claimDate, setClaimDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [kind, setKind] = useState<DamageKind>("collision");
  const [status, setStatus] = useState<DamageStatus>("reported");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("");
  const [currency, setCurrency] = useState("PLN");
  const [insurer, setInsurer] = useState("");
  const [claimNumber, setClaimNumber] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const sb = getBrowserSupabase();
      const m = await getCachedMembership(sb);
      if (!m) return;
      setCanManage(m.role === "owner" || m.role === "dispatcher");
      setCompanyId(m.companyId);
      setClaims(await listDamageClaims(sb, m.companyId));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Nie udało się pobrać szkód.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const regOf = (id: string | null) =>
    id ? (vehicles.find((v) => v.id === id)?.registration ?? "—") : "—";
  const summary = useMemo(
    () =>
      summarizeDamageClaims(
        claims.map((c) => ({ status: c.status, cost: c.cost, currency: c.currency })),
      ),
    [claims],
  );

  async function save() {
    if (!companyId) return;
    setErr(null);
    try {
      await insertDamageClaim(
        getBrowserSupabase(),
        {
          vehicleId: vehicleId || null,
          driverName: driver,
          claimDate,
          kind,
          status,
          description,
          cost: cost ? Number(cost) : null,
          currency,
          insurer,
          claimNumber,
        },
        companyId,
      );
      setDescription("");
      setCost("");
      setInsurer("");
      setClaimNumber("");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Błąd zapisu szkody.");
    }
  }

  async function changeStatus(id: string, s: DamageStatus) {
    try {
      await setDamageClaimStatus(getBrowserSupabase(), id, s);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Błąd zmiany statusu.");
    }
  }

  async function remove(c: DamageClaim) {
    if (!(await confirm("Usunąć tę szkodę z rejestru?"))) return;
    try {
      await deleteDamageClaim(getBrowserSupabase(), c.id);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Błąd usuwania.");
    }
  }

  function exportCsv() {
    const headers = [
      "Data",
      "Pojazd",
      "Kierowca",
      "Rodzaj",
      "Status",
      "Koszt",
      "Waluta",
      "Ubezpieczyciel",
      "Nr szkody",
      "Opis",
    ];
    const rows = claims.map((c) => [
      c.claim_date,
      regOf(c.vehicle_id),
      c.driver_name ?? "",
      DAMAGE_KIND_LABELS[c.kind],
      DAMAGE_STATUS_LABELS[c.status],
      c.cost ?? "",
      c.currency,
      c.insurer ?? "",
      c.claim_number ?? "",
      c.description ?? "",
    ]);
    downloadCsv(`szkody_${csvDateStamp()}.csv`, headers, rows);
  }

  return (
    <div style={{ maxWidth: 980 }}>
      <PageHeader
        title="Rejestr szkód / OC"
        subtitle="Zgłoszenia szkód pojazdów: rodzaj, status, koszt, ubezpieczyciel i numer szkody."
      />

      {canManage && (
        <div style={f.formWrap}>
          <div style={f.grid}>
            <label style={f.field}>
              <span style={f.label}>Pojazd</span>
              <select
                style={f.input}
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
              >
                <option value="">— bez pojazdu —</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registration}
                  </option>
                ))}
              </select>
            </label>
            <label style={f.field}>
              <span style={f.label}>Data szkody</span>
              <input
                style={f.input}
                type="date"
                value={claimDate}
                onChange={(e) => setClaimDate(e.target.value)}
              />
            </label>
          </div>
          <div style={f.grid}>
            <label style={f.field}>
              <span style={f.label}>Rodzaj</span>
              <select
                style={f.input}
                value={kind}
                onChange={(e) => setKind(e.target.value as DamageKind)}
              >
                {DAMAGE_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {DAMAGE_KIND_LABELS[k]}
                  </option>
                ))}
              </select>
            </label>
            <label style={f.field}>
              <span style={f.label}>Status</span>
              <select
                style={f.input}
                value={status}
                onChange={(e) => setStatus(e.target.value as DamageStatus)}
              >
                {DAMAGE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {DAMAGE_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div style={f.grid}>
            <label style={f.field}>
              <span style={f.label}>Koszt</span>
              <input
                style={f.input}
                type="number"
                min={0}
                step="0.01"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="kwota"
              />
            </label>
            <label style={f.field}>
              <span style={f.label}>Waluta</span>
              <input
                style={f.input}
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              />
            </label>
            <label style={f.field}>
              <span style={f.label}>Kierowca</span>
              <input
                style={f.input}
                value={driver}
                onChange={(e) => setDriver(e.target.value)}
                placeholder="opcjonalnie"
              />
            </label>
          </div>
          <div style={f.grid}>
            <label style={f.field}>
              <span style={f.label}>Ubezpieczyciel</span>
              <input
                style={f.input}
                value={insurer}
                onChange={(e) => setInsurer(e.target.value)}
                placeholder="opcjonalnie"
              />
            </label>
            <label style={f.field}>
              <span style={f.label}>Nr szkody</span>
              <input
                style={f.input}
                value={claimNumber}
                onChange={(e) => setClaimNumber(e.target.value)}
                placeholder="opcjonalnie"
              />
            </label>
          </div>
          <label style={f.field}>
            <span style={f.label}>Opis</span>
            <input
              style={f.input}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="okoliczności, zakres uszkodzeń…"
            />
          </label>
          <div>
            <Button onClick={save}>➕ Dodaj szkodę</Button>
          </div>
          {err && <p style={{ color: palette.red, fontSize: 13 }}>{err}</p>}
        </div>
      )}

      {summary.total > 0 && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 20 }}>
          <Stat label="Szkody łącznie" value={String(summary.total)} />
          <Stat
            label="Otwarte"
            value={String(summary.open)}
            accent={summary.open > 0 ? palette.red : "#22c55e"}
          />
          {summary.costByCurrency.map((c) => (
            <Stat
              key={c.currency}
              label={`Koszt (${c.currency})`}
              value={`${c.amount} ${c.currency}`}
            />
          ))}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", marginTop: 24, marginBottom: 8 }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Rejestr</h2>
        <span style={{ flex: 1 }} />
        <Button variant="ghost" onClick={exportCsv} disabled={claims.length === 0}>
          ⬇️ CSV
        </Button>
      </div>

      <ListStatus
        loading={loading}
        error={err}
        empty={!loading && claims.length === 0}
        emptyText="Brak szkód w rejestrze."
        onRetry={load}
      />

      {!loading && claims.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {claims.map((c) => (
            <div key={c.id} style={f.card}>
              <div style={f.listRow}>
                <span style={{ width: 100, fontWeight: 700 }}>{c.claim_date}</span>
                <span style={{ ...f.cell, width: 100 }}>🚚 {regOf(c.vehicle_id)}</span>
                <span style={{ ...f.cell, width: 130 }}>{DAMAGE_KIND_LABELS[c.kind]}</span>
                <span style={{ width: 120, fontWeight: 700, color: STATUS_COLOR[c.status] }}>
                  {c.cost != null ? `${c.cost} ${c.currency}` : "—"}
                </span>
                <span style={{ flex: 1 }} />
                {canManage ? (
                  <select
                    style={{ ...f.input, width: 150, borderColor: STATUS_COLOR[c.status] }}
                    value={c.status}
                    onChange={(e) => changeStatus(c.id, e.target.value as DamageStatus)}
                  >
                    {DAMAGE_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {DAMAGE_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span style={{ color: STATUS_COLOR[c.status], fontWeight: 700 }}>
                    {DAMAGE_STATUS_LABELS[c.status]}
                  </span>
                )}
                {canManage && (
                  <Button variant="danger" onClick={() => remove(c)}>
                    🗑️
                  </Button>
                )}
              </div>
              {(c.description || c.insurer || c.claim_number || c.driver_name) && (
                <div style={{ ...f.meta, padding: "0 14px 10px" }}>
                  {c.driver_name && <>👤 {c.driver_name} · </>}
                  {c.insurer && <>🛡️ {c.insurer} · </>}
                  {c.claim_number && <>nr {c.claim_number} · </>}
                  {c.description}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={statStyle}>
      <div style={{ fontSize: 12, color: palette.smoke }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: accent ?? palette.offWhite }}>
        {value}
      </div>
    </div>
  );
}

const statStyle: React.CSSProperties = {
  background: palette.nearBlack,
  border: `1px solid ${palette.graphite}`,
  borderRadius: 10,
  padding: "10px 16px",
  minWidth: 120,
};
