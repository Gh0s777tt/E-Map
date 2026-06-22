"use client";

import { listDrivers, listInvoices, listOrders, listVehicles } from "@e-logistic/api";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@e-logistic/core";
import { palette } from "@e-logistic/ui";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";

type Hit = { icon: string; type: string; label: string; sub: string; href: string };

const MAX = 20;

/**
 * Globalna wyszukiwarka (Ctrl/⌘+K) — skok do pojazdu, kierowcy, zlecenia, faktury.
 * Indeks pobierany leniwie przy pierwszym otwarciu; filtr po stronie klienta.
 */
export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState<Hit[] | null>(null);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Skrót klawiszowy Ctrl/⌘+K (przełącza), Esc zamyka.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    const openEvt = () => setOpen(true);
    window.addEventListener("elog:search-open", openEvt);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("elog:search-open", openEvt);
    };
  }, []);

  const buildIndex = useCallback(async () => {
    const sb = getBrowserSupabase();
    const m = await getCachedMembership(sb);
    if (!m) {
      setIndex([]);
      return;
    }
    const hits: Hit[] = [];
    const safe = async (fn: () => Promise<void>) => {
      try {
        await fn();
      } catch {
        // pomiń źródło bez dostępu
      }
    };
    await Promise.all([
      safe(async () => {
        const vs = await listVehicles(sb, m.companyId);
        for (const v of vs as {
          id: string;
          registration: string;
          make: string | null;
          model: string | null;
        }[]) {
          hits.push({
            icon: "🚚",
            type: "Pojazd",
            label: v.registration,
            sub: [v.make, v.model].filter(Boolean).join(" "),
            href: `/vehicles/${v.id}`,
          });
        }
      }),
      safe(async () => {
        const ds = await listDrivers(sb, m.companyId);
        for (const d of ds) {
          hits.push({
            icon: "👤",
            type: "Kierowca",
            label: `${d.last_name} ${d.first_name}`.trim() || "Kierowca",
            sub: d.license_categories.join(", "),
            href: `/drivers/${d.id}`,
          });
        }
      }),
      safe(async () => {
        const os = await listOrders(sb, m.companyId);
        for (const o of os) {
          hits.push({
            icon: "📦",
            type: "Zlecenie",
            label: o.reference_no || "(bez numeru)",
            sub: `${o.origin || "?"} → ${o.destination || "?"} · ${ORDER_STATUS_LABELS[o.status as OrderStatus] ?? o.status}`,
            href: "/orders",
          });
        }
      }),
      safe(async () => {
        const inv = await listInvoices(sb, m.companyId);
        for (const i of inv) {
          hits.push({
            icon: "🧾",
            type: "Faktura",
            label: i.number,
            sub: `${i.buyer_name ?? "—"} · ${i.gross} ${i.currency}`,
            href: "/invoices",
          });
        }
      }),
    ]);
    setIndex(hits);
  }, []);

  // Po otwarciu: zbuduj indeks (raz) i ustaw focus.
  useEffect(() => {
    if (!open) return;
    if (index === null) buildIndex();
    setSel(0);
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [open, index, buildIndex]);

  const ql = q.trim().toLowerCase();
  const results = !ql
    ? (index ?? []).slice(0, MAX)
    : (index ?? [])
        .filter((h) => `${h.label} ${h.sub} ${h.type}`.toLowerCase().includes(ql))
        .slice(0, MAX);

  function go(h: Hit) {
    setOpen(false);
    setQ("");
    router.push(h.href);
  }

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((s) => Math.min(s + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const h = results[sel];
      if (h) go(h);
    }
  }

  return (
    <>
      <button
        type="button"
        className="app-search-trigger"
        onClick={() => setOpen(true)}
        aria-label="Szukaj"
      >
        🔍 Szukaj…
        <span className="app-search-kbd">Ctrl K</span>
      </button>

      {open && (
        <div style={styles.overlay}>
          <button
            type="button"
            aria-label="Zamknij wyszukiwarkę"
            style={styles.backdrop}
            onClick={() => setOpen(false)}
          />
          <div style={styles.panel}>
            <input
              ref={inputRef}
              style={styles.input}
              placeholder="Szukaj: pojazd, kierowca, zlecenie, faktura…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setSel(0);
              }}
              onKeyDown={onInputKey}
            />
            <div style={styles.results}>
              {index === null ? (
                <div style={styles.empty}>Ładowanie…</div>
              ) : results.length === 0 ? (
                <div style={styles.empty}>{ql ? "Brak wyników." : "Zacznij pisać…"}</div>
              ) : (
                results.map((h, i) => (
                  <button
                    type="button"
                    key={`${h.type}-${h.href}-${h.label}-${h.sub}`}
                    style={i === sel ? { ...styles.row, ...styles.rowSel } : styles.row}
                    onMouseEnter={() => setSel(i)}
                    onClick={() => go(h)}
                  >
                    <span style={{ width: 24 }}>{h.icon}</span>
                    <span style={{ color: palette.smoke, minWidth: 70, fontSize: 12 }}>
                      {h.type}
                    </span>
                    <strong>{h.label}</strong>
                    <span style={{ flex: 1 }} />
                    <span style={{ color: palette.smoke, fontSize: 12 }}>{h.sub}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    zIndex: 100,
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    paddingTop: "12vh",
  },
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "transparent",
    border: "none",
    cursor: "default",
    padding: 0,
  },
  panel: {
    position: "relative",
    width: "min(640px, 92vw)",
    background: palette.coal,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 12,
    overflow: "hidden",
    boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
  },
  input: {
    width: "100%",
    background: palette.black,
    border: "none",
    borderBottom: `1px solid ${palette.graphite}`,
    color: palette.offWhite,
    fontSize: 16,
    padding: "16px 18px",
    outline: "none",
  },
  results: { maxHeight: "50vh", overflowY: "auto", display: "flex", flexDirection: "column" },
  row: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    padding: "10px 16px",
    background: "transparent",
    border: "none",
    color: palette.offWhite,
    cursor: "pointer",
    textAlign: "left",
    fontSize: 14,
  },
  rowSel: { background: palette.nearBlack },
  empty: { color: palette.smoke, fontSize: 13, padding: "16px 18px" },
};
