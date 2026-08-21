"use client";

import {
  latestOdometers,
  listDamageClaims,
  listDefectsAll,
  listDocumentsAll,
  listDrivers,
  listFuelCardsSafe,
  listInvoicesAll,
  listServiceTasksAll,
  listVehiclesExpiry,
} from "@e-logistic/api";
import {
  type DefectStatus,
  type ExpiryLevel,
  expiryStatus,
  invoicePaymentStatus,
  maskedCardLabel,
  serviceStatus,
} from "@e-logistic/core";
import type { MessageKey } from "@e-logistic/i18n";
import { cssPalette as palette } from "@e-logistic/ui";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useT } from "@/components/LocaleProvider";
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
  /** #368: własna etykieta stanu (np. „otwarta") zamiast domyślnej po terminie/wkrótce. */
  statusLabel?: string;
};

// #369: etykiety pól trzymamy jako klucze i18n — tłumaczone dopiero przy budowie listy.
const VEH_FIELDS = [
  { col: "inspection_expiry", labelKey: "attention.veh.inspection" },
  { col: "insurance_expiry", labelKey: "attention.veh.insurance" },
  { col: "leasing_end", labelKey: "attention.veh.leasing" },
] as const;

const DRV_FIELDS = [
  { col: "license_expiry", labelKey: "attention.drv.license" },
  { col: "code95_expiry", labelKey: "attention.drv.code95" },
  { col: "medical_expiry", labelKey: "attention.drv.medical" },
  { col: "psychotech_expiry", labelKey: "attention.drv.psych" },
  { col: "adr_expiry", labelKey: "attention.drv.adr" },
] as const;

const MAX_SHOWN = 15;

/** #368: usterki uznawane za krytyczne — tak samo klasyfikuje je cron w lib/alerts.ts. */
function isCriticalDefect(severity: string, dashboardLight: boolean): boolean {
  return severity === "high" || dashboardLight;
}

/** Statusy usterki, które wciąż czekają na reakcję — zawężenie idzie do BAZY. */
const OPEN_DEFECT_STATUSES: DefectStatus[] = ["open", "in_progress"];

/**
 * Zbiorczy panel „Co wymaga uwagi" — liczony na żywo (niezależnie od crona).
 * Agreguje terminy: dokumenty pojazdów (przegląd/OC/leasing), karty paliwowe,
 * serwis wg przebiegu (km), dokumenty z sejfu oraz otwarte usterki pojazdów.
 * Pokazuje tylko pozycje wymagające reakcji (po terminie / wkrótce / otwarte),
 * posortowane wg pilności.
 */
export function AttentionPanel() {
  const [items, setItems] = useState<Item[]>([]);
  const [ready, setReady] = useState(false);
  /**
   * Zbiory, których nie udało się pobrać w KOMPLECIE — brak pozycji z nich NIE jest
   * tu potwierdzony.
   *
   * Ten panel jest jedynym miejscem, gdzie zaległa faktura, mijający termin dokumentu
   * i otwarta usterka same się zgłaszają; nikt nie wchodzi na /invoices, żeby sprawdzić,
   * czy czegoś nie przeoczył. Milczenie panelu wygląda wtedy dokładnie tak samo jak
   * milczenie przy firmie, u której naprawdę nic nie zalega — i to milczenie było jedyną
   * informacją, jaką dawał.
   *
   * Lista, a nie flaga „faktury", bo baner nazywający po imieniu JEDEN zbiór z trzech
   * zamienia ciszę o pozostałych w pozorne potwierdzenie ich kompletności.
   */
  const [incompleteSets, setIncompleteSets] = useState<MessageKey[]>([]);
  const t = useT();

  useEffect(() => {
    (async () => {
      try {
        const sb = getBrowserSupabase();
        const m = await getCachedMembership(sb);
        // Panel zarządczy (terminy floty/faktur) — tylko owner/dispatcher.
        if (!m || (m.role !== "owner" && m.role !== "dispatcher")) return;
        /*
         * KAŻDE zapytanie ma własny `.catch(() => null)`, a `null` mówi „nie wiemy".
         *
         * Bez tego odrzucenie jednego zapytania przewracało całe `Promise.all` do bloku
         * `catch` na dole, a ten ukrywa panel w CAŁOŚCI — czyli awaria sieci na czwartej
         * stronie faktur dawała pulpit wyglądający jak u firmy, u której nic nie zalega.
         * Milczenie tego panelu jest jego jedyną „dobrą" odpowiedzią, więc nie wolno go
         * wydać z powodu, którego użytkownik nie zobaczy: nieudany zbiór wchodzi do
         * `incompleteSets` dokładnie na tych samych prawach co zbiór obcięty.
         */
        const [vehs, cards, tasks, odo, docs, invs, drvs, claims, defects] = await Promise.all([
          listVehiclesExpiry(sb, m.companyId).catch(() => null),
          listFuelCardsSafe(sb, m.companyId).catch(() => null),
          // STRONAMI i zawężone w BAZIE do zadań śledzonych przebiegiem: panel i tak
          // odrzuca resztę (bez `interval_km` i `last_done_km` `serviceStatus` zwraca
          // `kmLeft: null`), a to właśnie one wypełniały sufit `api.max_rows` zamiast
          // zadań, które mają tu coś do powiedzenia.
          listServiceTasksAll(sb, m.companyId, { kmTracked: true }).catch(() => null),
          latestOdometers(sb, m.companyId).catch(() => null),
          // Tylko dokumenty Z terminem — reszta sejfu (skany CMR, faktury) nie ma tu
          // czego wnieść, a stanowi jego większość.
          listDocumentsAll(sb, m.companyId, { withExpiry: true }).catch(() => null),
          listInvoicesAll(sb, m.companyId).catch(() => null),
          listDrivers(sb, m.companyId).catch(() => null),
          listDamageClaims(sb, m.companyId).catch(() => null),
          listDefectsAll(sb, { statuses: OPEN_DEFECT_STATUSES }).catch(() => null),
        ]);
        /*
         * Znacznik ustawiany OD RAZU po pobraniu, przed pętlami budującymi pozycje.
         * Dotąd stał w ich środku: wyjątek przy dowolnej z nich (a przelatujemy tu
         * pojazdy, karty, plan serwisowy i dokumenty) gubił flagę razem z panelem.
         */
        const niepelne: MessageKey[] = [];
        if (vehs === null) niepelne.push("attention.set.vehicles");
        if (cards === null) niepelne.push("attention.set.cards");
        if (tasks === null || !tasks.complete) niepelne.push("attention.set.service");
        // Przebiegi: brak licznika pojazdu nie daje pustego wiersza, tylko poziom „ok"
        // z `serviceStatus` — czyli przekroczony serwis znika bez śladu.
        if (odo === null || !odo.complete) niepelne.push("attention.set.odometers");
        if (docs === null || !docs.complete) niepelne.push("attention.set.documents");
        if (invs === null || !invs.complete) niepelne.push("attention.set.invoices");
        if (drvs === null) niepelne.push("attention.set.drivers");
        if (claims === null) niepelne.push("attention.set.damages");
        if (defects === null || !defects.complete) niepelne.push("attention.set.defects");
        setIncompleteSets(niepelne);
        const today = new Date().toISOString().slice(0, 10);
        const regOf = new Map((vehs ?? []).map((v) => [v.id, v.registration]));
        const out: Item[] = [];

        for (const v of vehs ?? []) {
          for (const f of VEH_FIELDS) {
            const date = v[f.col];
            if (!date) continue;
            const st = expiryStatus(date, today);
            if (st.level === "ok") continue;
            out.push({
              key: `veh-${v.id}-${f.col}`,
              icon: "🚚",
              category: t("attention.cat.vehicle"),
              title: `${v.registration} · ${t(f.labelKey)}`,
              detail: date,
              level: st.level,
              urgency: st.daysLeft,
              href: "/vehicles",
            });
          }
        }

        for (const c of cards ?? []) {
          if (!c.valid_until) continue;
          const st = expiryStatus(c.valid_until, today);
          if (st.level === "ok") continue;
          out.push({
            key: `card-${c.id}`,
            icon: "💳",
            category: t("attention.cat.card"),
            title: maskedCardLabel(
              String(c.provider ?? t("attention.cat.card")),
              c.card_number_masked,
            ),
            detail: c.valid_until,
            level: st.level,
            urgency: st.daysLeft,
            href: "/cards",
          });
        }

        // Uwaga: zmienna pętli to `task`, bo `t` to funkcja tłumacząca.
        for (const task of tasks?.rows ?? []) {
          const cur = odo?.byVehicle[task.vehicle_id] ?? null;
          const st = serviceStatus(cur, task.last_done_km, task.interval_km);
          if (st.level === "ok" || st.kmLeft == null) continue;
          out.push({
            key: `svc-${task.id}`,
            icon: "🔧",
            category: t("attention.cat.service"),
            title: `${regOf.get(task.vehicle_id) ?? "—"} · ${task.name}`,
            detail:
              st.kmLeft < 0
                ? `${t("attention.svc.overBy")} ${-st.kmLeft} km`
                : `${t("attention.svc.inKm")} ${st.kmLeft} km`,
            level: st.level,
            urgency: st.kmLeft / 100,
            href: "/service",
          });
        }

        for (const d of docs?.rows ?? []) {
          if (!d.expiry_date) continue;
          const st = expiryStatus(d.expiry_date, today);
          if (st.level === "ok") continue;
          out.push({
            key: `doc-${d.id}`,
            icon: "📄",
            category: t("attention.cat.document"),
            title: d.name,
            detail: d.expiry_date,
            level: st.level,
            urgency: st.daysLeft,
            href: "/documents",
          });
        }

        for (const inv of invs?.rows ?? []) {
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
            category: t("attention.cat.invoice"),
            title: `${inv.number} · ${inv.buyer_name ?? "—"}`,
            detail: `${t("attention.inv.duePrefix")} ${inv.due_date} · ${inv.gross} ${inv.currency}`,
            level: "expired",
            urgency: days,
            href: "/invoices",
          });
        }

        for (const c of claims ?? []) {
          if (c.status !== "reported" && c.status !== "in_progress") continue;
          const daysSince = Math.round((Date.parse(today) - Date.parse(c.claim_date)) / 86_400_000);
          out.push({
            key: `dmg-${c.id}`,
            icon: "🛠️",
            category: t("attention.cat.damage"),
            // #369: etykiety rodzaju i statusu szkody przez i18n — stałe z `core`
            // są wyłącznie polskie, więc panel po angielsku pokazywał „Kolizja / wypadek".
            title: `${c.vehicle_id ? (regOf.get(c.vehicle_id) ?? "—") : "—"} · ${t(`damage.kind.${c.kind}` as MessageKey)}`,
            detail: `${t(`damage.status.${c.status}` as MessageKey)}${c.cost != null ? ` · ${c.cost} ${c.currency}` : ""}`,
            level: c.status === "reported" ? "expired" : "soon",
            urgency: -daysSince,
            href: "/damages",
            statusLabel: t("attention.status.open"),
          });
        }

        // #368: usterki zgłoszone z telefonu — widoczne od razu, bez wchodzenia w Raporty.
        // Statusy odsiane już w zapytaniu, więc tu nie ma czego filtrować powtórnie.
        for (const d of defects?.rows ?? []) {
          const critical = isCriticalDefect(d.severity, d.dashboard_light);
          const daysSince = Math.round(
            (Date.parse(today) - Date.parse(d.created_at.slice(0, 10))) / 86_400_000,
          );
          out.push({
            key: `def-${d.id}`,
            icon: "🔩",
            category: t("attention.cat.defect"),
            // 💡 = zapalona kontrolka na desce (ta sama ikona co na liście w Raportach).
            title: `${regOf.get(d.vehicle_id) ?? "—"} · ${d.part}${d.dashboard_light ? " 💡" : ""}`,
            detail: d.description.length > 80 ? `${d.description.slice(0, 80)}…` : d.description,
            level: critical ? "expired" : "soon",
            urgency: -daysSince,
            href: "/reports",
            statusLabel:
              d.status === "open" ? t("attention.status.reported") : t("attention.status.inRepair"),
          });
        }

        for (const d of drvs ?? []) {
          const name = `${d.last_name} ${d.first_name}`.trim() || t("attention.cat.driver");
          for (const fld of DRV_FIELDS) {
            const date = d[fld.col];
            if (!date) continue;
            const st = expiryStatus(date, today);
            if (st.level === "ok") continue;
            out.push({
              key: `drv-${d.id}-${fld.col}`,
              icon: "🪪",
              category: t("attention.cat.driver"),
              title: `${name} · ${t(fld.labelKey)}`,
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
    // `t` w zależnościach: zmiana języka przebudowuje etykiety pozycji.
  }, [t]);

  // Panel znika przy pustej liście, ale NIE wtedy, gdy któregoś zbioru nie udało się
  // pobrać w komplecie: schowanie go w tym stanie jest równoznaczne z zapewnieniem „nic
  // nie wymaga uwagi", którego akurat nie mamy podstaw dawać.
  if (!ready || (items.length === 0 && incompleteSets.length === 0)) return null;

  const expired = items.filter((i) => i.level === "expired").length;
  const soon = items.length - expired;
  const shown = items.slice(0, MAX_SHOWN);

  return (
    <div style={styles.card}>
      <div style={styles.head}>
        <span style={{ fontWeight: 800 }}>⚠️ {t("attention.title")}</span>
        {expired > 0 && (
          <span style={styles.pillRed}>{`${expired} ${t("attention.overdue")}`}</span>
        )}
        {soon > 0 && <span style={styles.pillWarn}>{`${soon} ${t("attention.soon")}`}</span>}
      </div>
      {incompleteSets.length > 0 && (
        <div style={styles.incomplete}>
          ⚠️{" "}
          {t("attention.incomplete").replace(
            "{sets}",
            incompleteSets.map((key) => t(key)).join(", "),
          )}
        </div>
      )}
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
                {it.statusLabel ??
                  (it.level === "expired" ? t("attention.overdue") : t("attention.soon"))}
              </span>
            </Link>
          );
        })}
      </div>
      {items.length > MAX_SHOWN && (
        <div style={{ color: palette.smoke, fontSize: 12, marginTop: 8 }}>
          {`${t("attention.morePrefix")} ${items.length - MAX_SHOWN} ${t("attention.moreSuffix")}`}
        </div>
      )}
    </div>
  );
}

function rank(l: Level): number {
  return l === "expired" ? 0 : 1;
}

const styles: Record<string, React.CSSProperties> = {
  /** Nad listą pozycji, bo dotyczy tego, czego na liście NIE MA. */
  incomplete: {
    border: `1px solid ${palette.warning}`,
    borderRadius: 8,
    padding: "8px 10px",
    marginBottom: 8,
    color: palette.offWhite,
    fontSize: 12,
    lineHeight: 1.5,
  },
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
