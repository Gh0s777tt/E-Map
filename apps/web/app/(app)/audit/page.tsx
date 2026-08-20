"use client";

import { type AuditEntry, listAuditLog } from "@e-logistic/api";
import type { MessageKey } from "@e-logistic/i18n";
import { cssPalette as palette } from "@e-logistic/ui";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ListStatus } from "@/components/ListStatus";
import { useT } from "@/components/LocaleProvider";
import { PageHeader } from "@/components/ui";
import { getCachedMembership } from "@/lib/membership";
import { queryErrorMessage } from "@/lib/queryError";
import { queryKeys } from "@/lib/queryKeys";
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
  const [filter, setFilter] = useState("all");

  const actionLabel = (a: string) => {
    const key = ACTION_LABEL[a];
    return key ? t(key) : a;
  };

  // #310 (fala 2): dziennik audytu przez TanStack Query — 200 wpisów przy każdym wejściu
  // to najcięższy pojedynczy odczyt w ustawieniach, a treść zmienia się rzadko.
  const membership = useQuery({
    queryKey: queryKeys.membership(),
    queryFn: () => getCachedMembership(getBrowserSupabase()),
  });
  // `null` = jeszcze nie wiadomo. Świadomie `isSuccess`, a nie „nie trwa ładowanie":
  // gdy odczyt członkostwa PADNIE, użytkownik ma zobaczyć błąd z „Ponów", a nie
  // komunikat „brak dostępu" sugerujący, że to kwestia uprawnień.
  const allowed = membership.isSuccess ? membership.data?.role === "owner" : null;
  const companyId = membership.data?.companyId ?? null;

  const entriesQuery = useQuery({
    queryKey: queryKeys.auditLog(companyId),
    // Nie-właściciel dostaje ekran „brak dostępu" — nie ma po co pytać bazy.
    queryFn: (): Promise<AuditEntry[]> =>
      allowed && companyId
        ? listAuditLog(getBrowserSupabase(), companyId, { limit: 200 })
        : Promise.resolve([]),
    enabled: !membership.isPending,
    /*
     * Wyjątek od globalnych 30 s (`components/QueryProvider.tsx`): do `audit_log` pisze
     * BAZA przy akcjach z zupełnie innych ekranów — m.in. RPC odsłaniające PIN karty
     * paliwowej — więc żaden `invalidateQueries` stąd nie poleci. Właściciel, który
     * odsłania PIN i od razu wraca sprawdzić, czy odczyt został zapisany, zobaczyłby
     * dziennik bez tego wpisu i wyciągnął wniosek, że PIN-y NIE są audytowane. Ten
     * jeden ekran nie może pokazywać nieaktualnego stanu — od tego jest. Cache zostaje
     * (dane widać od razu, bez migotania), ale każde wejście odświeża je w tle.
     */
    staleTime: 0,
  });
  const entries = entriesQuery.data ?? [];
  const loading = membership.isPending || entriesQuery.isPending;
  const error = queryErrorMessage(membership.error ?? entriesQuery.error, t("audit.loadError"));
  /** „Ponów": błąd mógł pochodzić z odczytu członkostwa, więc ponawiamy oba zapytania. */
  const retry = () => {
    void membership.refetch();
    void entriesQuery.refetch();
  };

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
        onRetry={retry}
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
