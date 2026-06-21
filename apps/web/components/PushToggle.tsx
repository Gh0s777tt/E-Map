"use client";

import { deletePushSubscription, savePushSubscription } from "@e-logistic/api";
import { palette } from "@e-logistic/ui";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

/** Konwersja klucza VAPID (base64url) na bufor wymagany przez PushManager. */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const buffer = new ArrayBuffer(raw.length);
  const out = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type State = "loading" | "unsupported" | "unconfigured" | "off" | "on";

export function PushToggle() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [canSend, setCanSend] = useState(false);

  const refresh = useCallback(async () => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      setState("unsupported");
      return;
    }
    if (!VAPID_PUBLIC_KEY) {
      setState("unconfigured");
      return;
    }
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    } catch {
      setState("off");
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Wysyłka testowa do całej firmy dostępna tylko dla owner/dispatcher (endpoint też to egzekwuje).
  useEffect(() => {
    getCachedMembership(getBrowserSupabase())
      .then((m) => setCanSend(m?.role === "owner" || m?.role === "dispatcher"))
      .catch(() => {});
  }, []);

  async function sendTest() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "E-Logistic — test",
          body: "Powiadomienia push działają ✅",
          url: "/dashboard",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { sent?: number; error?: string };
      if (!res.ok) {
        setMsg(data.error ?? "Nie udało się wysłać.");
        return;
      }
      setMsg(`✅ Wysłano testowe powiadomienie do ${data.sent ?? 0} urządzeń firmy.`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Błąd wysyłki.");
    } finally {
      setBusy(false);
    }
  }

  async function enable() {
    setBusy(true);
    setMsg(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setMsg("Brak zgody na powiadomienia w przeglądarce.");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      const sb = getBrowserSupabase();
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) {
        setMsg("Zaloguj się, aby włączyć powiadomienia.");
        return;
      }
      const m = await getCachedMembership(sb).catch(() => null);
      const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        setMsg("Nie udało się utworzyć subskrypcji.");
        return;
      }
      await savePushSubscription(
        sb,
        { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } },
        { userId: user.id, companyId: m?.companyId ?? null, userAgent: navigator.userAgent },
      );
      setState("on");
      setMsg("✅ Powiadomienia push włączone na tym urządzeniu.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Błąd włączania powiadomień.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setMsg(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await deletePushSubscription(getBrowserSupabase(), sub.endpoint).catch(() => {});
        await sub.unsubscribe();
      }
      setState("off");
      setMsg("Powiadomienia push wyłączone na tym urządzeniu.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Błąd wyłączania.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={styles.card}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <strong style={{ fontSize: 16 }}>Powiadomienia push (przeglądarka/OS)</strong>
        <span
          style={{
            fontSize: 12,
            padding: "2px 8px",
            borderRadius: 999,
            background: state === "on" ? "#16331c" : palette.coal,
            color: state === "on" ? "#22c55e" : palette.smoke,
            border: `1px solid ${state === "on" ? "#22c55e" : palette.graphite}`,
          }}
        >
          {state === "on" ? "Aktywne" : "Wyłączone"}
        </span>
      </div>
      <p style={{ color: palette.smoke, fontSize: 13, margin: 0 }}>
        Alerty o przeładowaniu, wygasających terminach (przegląd/OC/karta) i nowych usterkach —
        nawet gdy aplikacja jest zamknięta.
      </p>

      {state === "loading" && <p style={{ color: palette.smoke }}>Sprawdzam…</p>}
      {state === "unsupported" && (
        <p style={{ color: palette.smoke, fontSize: 13 }}>
          Ta przeglądarka nie obsługuje Web Push.
        </p>
      )}
      {state === "unconfigured" && (
        <p style={{ color: palette.smoke, fontSize: 13 }}>
          Push nie jest jeszcze skonfigurowany na serwerze (brak klucza VAPID). Patrz{" "}
          <code style={{ color: palette.offWhite }}>DEPLOY.md → Powiadomienia push</code>.
        </p>
      )}
      {state === "off" && (
        <Button onClick={enable} disabled={busy}>
          Włącz powiadomienia
        </Button>
      )}
      {state === "on" && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {canSend && (
            <Button onClick={sendTest} disabled={busy}>
              Wyślij testowe powiadomienie
            </Button>
          )}
          <Button variant="danger" onClick={disable} disabled={busy}>
            Wyłącz na tym urządzeniu
          </Button>
        </div>
      )}
      {msg && <p style={{ color: palette.smoke, fontSize: 14, marginTop: 4 }}>{msg}</p>}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    marginTop: 20,
    padding: 20,
    borderRadius: 12,
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    display: "flex",
    flexDirection: "column",
    gap: 14,
    maxWidth: 420,
  },
  primary: {
    background: palette.red,
    color: palette.white,
    border: "none",
    borderRadius: 8,
    padding: "11px 16px",
    fontWeight: 700,
    cursor: "pointer",
    alignSelf: "flex-start",
  },
  danger: {
    background: "transparent",
    color: palette.red,
    border: `1px solid ${palette.red}`,
    borderRadius: 8,
    padding: "10px 16px",
    cursor: "pointer",
    alignSelf: "flex-start",
  },
};
