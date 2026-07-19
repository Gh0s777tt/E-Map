"use client";

import { type AuditEntry, listAuditLog } from "@e-logistic/api";
import type { MessageKey } from "@e-logistic/i18n";
import { cssPalette as palette } from "@e-logistic/ui";
import { useCallback, useEffect, useState } from "react";
import { ListStatus } from "@/components/ListStatus";
import { useT } from "@/components/LocaleProvider";
import { PageHeader } from "@/components/ui";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";

/** Kod akcji audytu → klucz i18n (reszta wyświetlana surowo). */
const ACTION_LABEL: Record<string, MessageKey> = {
  "fuel_card.read_pin": "audit.action.fuelCardReadPin",
  "fuel_card.set_pin": "audit.action.fuelCardSetPin",
  "invoice.create": "audit.action.invoiceCreate",
  "invoice.duplicate": "audit.action.invoiceDuplicate",
  "driver.save": "audit.action.driverSave",
  "driver.read_documents": "audit.action.driverReadDocuments",
  "driver.set_documents": "audit.action.driverSetDocuments",
};

export default function AuditPage() {
  const t = useT();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

  const actionLabel = (a: string) => {
    const key = ACTION_LABEL[a];
    return key ? t(key) : a;
  };

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
      setError(e instanceof Error ? e.message : t("audit.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  if (allowed === false) {
    return (
      <div style={{ maxWidth: 900 }}>
        <PageHeader title={t("audit.title")} />
        <p style={{ color: palette.smoke, marginTop: 16 }}>{t("audit.noAccess")}</p>
      </div>
    );
  }

  const actions = Array.from(new Set(entries.map((e) => e.action)));
  const shown = filter === "all" ? entries : entries.filter((e) => e.action === filter);

  return (
    <div style={{ maxWidth: 900 }}>
      <PageHeader title={t("audit.title")} subtitle={t("audit.subtitle")} />

      {entries.length > 0 && (
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={selectStyle}
          aria-label={t("audit.filterLabel")}
        >
          <option value="all">
            {t("audit.allActions")} ({entries.length})
          </option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {actionLabel(a)}
            </option>
          ))}
        </select>
      )}

      <ListStatus
        loading={loading}
        error={error}
        empty={!loading && entries.length === 0}
        emptyText={t("audit.empty")}
        onRetry={load}
      />

      {allowed && shown.length > 0 && (
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 6 }}>
          {shown.map((e) => (
            <div key={e.id} style={rowStyle} className="el-fade-in">
              <span style={{ color: palette.smoke, fontSize: 12, minWidth: 150 }}>
                {new Date(e.created_at).toLocaleString("pl-PL")}
              </span>
              <span style={{ fontWeight: 700, minWidth: 220 }}>{actionLabel(e.action)}</span>
              <span
                style={{ color: palette.smoke, fontSize: 13, flex: 1, fontFamily: "monospace" }}
                title={t("audit.targetTitle")}
              >
                {e.target ?? "—"}
              </span>
              <span
                style={{ color: palette.smoke, fontSize: 11, fontFamily: "monospace" }}
                title={t("audit.actorTitle")}
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
