"use client";

import {
  generateExpiryNotifications,
  listNotifications,
  markNotificationsRead,
  type Notification,
} from "@e-logistic/api";
import { palette } from "@e-logistic/ui";
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

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      try {
        await markNotificationsRead(getBrowserSupabase());
        setItems((arr) =>
          arr.map((i) => ({ ...i, read_at: i.read_at ?? new Date().toISOString() })),
        );
      } catch {
        // ignoruj
      }
    }
  }

  return (
    <div style={{ position: "relative" }}>
      <button type="button" onClick={toggle} style={styles.bell}>
        🔔 Powiadomienia
        {unread > 0 && <span style={styles.badge}>{unread}</span>}
      </button>
      {open && (
        <div style={styles.panel}>
          {items.length === 0 ? (
            <div style={{ color: palette.smoke, fontSize: 13, padding: 12 }}>Brak powiadomień.</div>
          ) : (
            items.map((n) => (
              <div key={n.id} style={styles.item}>
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ color: SEV[n.severity] ?? palette.smoke }}>●</span>
                  <strong style={{ fontSize: 13 }}>{n.title}</strong>
                </div>
                {n.body && (
                  <div style={{ color: palette.smoke, fontSize: 12, marginTop: 2 }}>{n.body}</div>
                )}
              </div>
            ))
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
};
