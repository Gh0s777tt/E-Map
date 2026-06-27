"use client";

import { type AuditEntry, listAuditLog } from "@e-logistic/api";
import { cssPalette as palette } from "@e-logistic/ui";
import { useCallback, useEffect, useState } from "react";
import { ListStatus } from "@/components/ListStatus";
import { PageHeader } from "@/components/ui";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";

/** Czytelne etykiety znanych akcji audytu (reszta wyświetlana surowo). */
const ACTION_LABEL: Record<string, string> = {
  "fuel_card.read_pin": "🔓 Odczyt PIN karty",
  "fuel_card.set_pin": "🔑 Ustawienie PIN karty",
  "invoice.create": "🧾 Wystawienie faktury",
  "invoice.duplicate": "📄 Duplikat faktury",
  "driver.save": "🧑‍✈️ Zapis kierowcy",
  "driver.read_documents": "🔓 Odczyt dokumentów kierowcy",
  "driver.set_documents": "🔒 Zapis dokumentów kierowcy",
};

export default function AuditPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sb = getBrowserSupabase();
      const m = await getCachedMembership(sb);
      if (m?.role !== "owner") {
        setAllowed(false);
        return;
      }
      setAllowed(true);
      setEntries(await listAuditLog(sb, m.companyId, { limit: 200 }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd ładowania.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (allowed === false) {
    return (
      <div style={{ maxWidth: 900 }}>
        <PageHeader title="Dziennik audytu" />
        <p style={{ color: palette.smoke, marginTop: 16 }}>
          Brak dostępu — dziennik audytu widzi wyłącznie właściciel firmy.
        </p>
      </div>
    );
  }

  const actions = Array.from(new Set(entries.map((e) => e.action)));
  const shown = filter === "all" ? entries : entries.filter((e) => e.action === filter);

  return (
    <div style={{ maxWidth: 900 }}>
      <PageHeader
        title="Dziennik audytu"
        subtitle="Dostępy do danych wrażliwych (PIN kart, dane kierowców) i akcje krytyczne. Widoczny tylko dla właściciela."
      />

      {entries.length > 0 && (
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={selectStyle}
          aria-label="Filtr akcji"
        >
          <option value="all">Wszystkie akcje ({entries.length})</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {ACTION_LABEL[a] ?? a}
            </option>
          ))}
        </select>
      )}

      <ListStatus
        loading={loading}
        error={error}
        empty={!loading && entries.length === 0}
        emptyText="Brak wpisów audytu."
        onRetry={load}
      />

      {allowed && shown.length > 0 && (
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 6 }}>
          {shown.map((e) => (
            <div key={e.id} style={rowStyle} className="el-fade-in">
              <span style={{ color: palette.smoke, fontSize: 12, minWidth: 150 }}>
                {new Date(e.created_at).toLocaleString("pl-PL")}
              </span>
              <span style={{ fontWeight: 700, minWidth: 220 }}>
                {ACTION_LABEL[e.action] ?? e.action}
              </span>
              <span
                style={{ color: palette.smoke, fontSize: 13, flex: 1, fontFamily: "monospace" }}
                title="Cel akcji"
              >
                {e.target ?? "—"}
              </span>
              <span
                style={{ color: palette.smoke, fontSize: 11, fontFamily: "monospace" }}
                title="ID użytkownika (actor)"
              >
                {e.actor_id ? `${e.actor_id.slice(0, 8)}…` : "—"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  marginTop: 16,
  background: palette.black,
  border: `1px solid ${palette.graphite}`,
  borderRadius: 8,
  padding: "8px 12px",
  color: palette.offWhite,
};
const rowStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "center",
  padding: "10px 14px",
  borderRadius: 8,
  background: palette.nearBlack,
  border: `1px solid ${palette.graphite}`,
};
