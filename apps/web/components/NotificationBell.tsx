"use client";

import {
  generateExpiryNotifications,
  listNotifications,
  markNotificationRead,
  markNotificationsRead,
  type Notification,
} from "@e-logistic/api";
import { cssPalette as palette } from "@e-logistic/ui";
import { useCallback, useEffect, useState } from "react";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";

const SEV: Record<string, string> = {
  info: palette.smoke,
  warning: "#f59e0b",
  danger: palette.red,
};

export function NotificationBell() {
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [onlyUnread, setOnlyUnread] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setItems(await listNotifications(getBrowserSupabase()));
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    const sb = getBrowserSupabase();
    let channel: { unsubscribe: () => void } | null = null;
    (async () => {
      try {
        const {
          data: { user },
        } = await sb.auth.getUser();
        if (!user) return;
        // Best-effort: dogeneruj powiadomienia o terminach (tylko owner/dispatcher).
        try {
          const m = await getCachedMembership(sb);
          if (m && (m.role === "owner" || m.role === "dispatcher")) {
            await generateExpiryNotifications(sb, m.companyId);
          }
        } catch {
          // ignoruj
        }
        await refresh();
        channel = sb
          .channel("notifications")
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "notifications",
              filter: `user_id=eq.${user.id}`,
            },
            () => refresh(),
          )
          .subscribe();
      } catch {
        // offline / brak sesji
      }
    })();
    return () => channel?.unsubscribe();
  }, [refresh]);

  const unread = items.filter((i) => !i.read_at).length;
  const shown = onlyUnread ? items.filter((i) => !i.read_at) : items;

  const now = () => new Date().toISOString();

  async function markOne(id: string) {
    setItems((arr) => arr.map((i) => (i.id === id ? { ...i, read_at: i.read_at ?? now() } : i)));
    try {
      await markNotificationRead(getBrowserSupabase(), id);
    } catch {
      // ignoruj (UI już zaktualizowane optymistycznie)
    }
  }

  async function markAll() {
    setItems((arr) => arr.map((i) => ({ ...i, read_at: i.read_at ?? now() })));
    try {
      await markNotificationsRead(getBrowserSupabase());
    } catch {
      // ignoruj
    }
  }

  return (
    <div style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen((o) => !o)} style={styles.bell}>
        🔔 Powiadomienia
        {unread > 0 && <span style={styles.badge}>{unread}</span>}
      </button>
      {open && (
        <div style={styles.panel}>
          <div style={styles.head}>
            <button
              type="button"
              style={styles.headBtn}
              onClick={() => setOnlyUnread((v) => !v)}
              aria-pressed={onlyUnread}
            >
              {onlyUnread ? "☑ Tylko nieprzeczytane" : "☐ Tylko nieprzeczytane"}
            </button>
            <span style={{ flex: 1 }} />
            {unread > 0 && (
              <button type="button" style={styles.headBtn} onClick={markAll}>
                Oznacz wszystkie
              </button>
            )}
          </div>
          {shown.length === 0 ? (
            <div style={{ color: palette.smoke, fontSize: 13, padding: 12 }}>
              {onlyUnread ? "Brak nieprzeczytanych." : "Brak powiadomień."}
            </div>
          ) : (
            shown.map((n) => {
              const isUnread = !n.read_at;
              return (
                <div key={n.id} style={{ ...styles.item, opacity: isUnread ? 1 : 0.55 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ color: SEV[n.severity] ?? palette.smoke }}>
                      {isUnread ? "●" : "○"}
                    </span>
                    <strong style={{ fontSize: 13 }}>{n.title}</strong>
                    <span style={{ flex: 1 }} />
                    {isUnread && (
                      <button
                        type="button"
                        style={styles.markBtn}
                        onClick={() => markOne(n.id)}
                        title="Oznacz jako przeczytane"
                      >
                        ✓
                      </button>
                    )}
                  </div>
                  {n.body && (
                    <div style={{ color: palette.smoke, fontSize: 12, marginTop: 2 }}>{n.body}</div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bell: {
    position: "relative",
    width: "100%",
    textAlign: "left",
    background: palette.black,
    color: palette.offWhite,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
    padding: "8px 12px",
    cursor: "pointer",
    fontSize: 13,
  },
  badge: {
    position: "absolute",
    right: 8,
    top: 6,
    background: palette.red,
    color: "#fff",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    padding: "0 6px",
  },
  panel: {
    position: "absolute",
    bottom: "calc(100% + 6px)",
    left: 0,
    right: 0,
    maxHeight: 320,
    overflowY: "auto",
    background: palette.coal,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
    zIndex: 20,
  },
  item: {
    padding: "10px 12px",
    borderBottom: `1px solid ${palette.graphite}`,
  },
  head: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    borderBottom: `1px solid ${palette.graphite}`,
    position: "sticky",
    top: 0,
    background: palette.coal,
  },
  headBtn: {
    background: "transparent",
    border: "none",
    color: palette.smoke,
    cursor: "pointer",
    fontSize: 12,
    padding: 0,
  },
  markBtn: {
    background: "transparent",
    border: `1px solid ${palette.graphite}`,
    color: "#22c55e",
    cursor: "pointer",
    borderRadius: 6,
    fontSize: 12,
    padding: "0 6px",
  },
};
