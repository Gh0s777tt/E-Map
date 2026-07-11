"use client";

/**
 * #290: Czat firmowy (dyspozytor/właściciel ↔ kierowcy) — wspólny kanał,
 * realtime INSERT. Odpowiednik ekranu Czat w aplikacji kierowcy.
 */
import { type ChatMessage, listMessages, sendMessage, subscribeMessages } from "@e-logistic/api";
import { cssPalette as palette } from "@e-logistic/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/ui";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [me, setMe] = useState<string | null>(null);
  const [myLabel, setMyLabel] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let alive = true;
    (async () => {
      try {
        const sb = getBrowserSupabase();
        const [{ data: userData }, m] = await Promise.all([
          sb.auth.getUser(),
          getCachedMembership(sb),
        ]);
        if (!m || !alive) return;
        setMe(userData.user?.id ?? null);
        setMyLabel(userData.user?.email ?? "panel");
        setCompanyId(m.companyId);
        setMessages(await listMessages(sb, m.companyId));
        cleanup = subscribeMessages(sb, m.companyId, (msg) => {
          setMessages((list) => (list.some((x) => x.id === msg.id) ? list : [...list, msg]));
        });
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message : "Nie udało się wczytać czatu.");
      }
    })();
    return () => {
      alive = false;
      cleanup?.();
    };
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll ma się odpalać przy każdej nowej wiadomości
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = useCallback(async () => {
    const body = text.trim();
    if (!body || !companyId) return;
    try {
      const msg = await sendMessage(getBrowserSupabase(), companyId, body, myLabel);
      setMessages((list) => (list.some((x) => x.id === msg.id) ? list : [...list, msg]));
      setText("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Nie wysłano wiadomości.");
    }
  }, [text, companyId, myLabel]);

  return (
    <div style={s.page}>
      <PageHeader
        title="Czat firmowy"
        subtitle="Wspólny kanał z kierowcami — wiadomości docierają na żywo do aplikacji"
      />
      {err && <p style={s.err}>{err}</p>}

      <div style={s.thread}>
        {messages.length === 0 && !err && (
          <p style={s.empty}>Brak wiadomości — napisz pierwszą poniżej.</p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === me;
          return (
            <div key={m.id} style={{ ...s.row, justifyContent: mine ? "flex-end" : "flex-start" }}>
              <div style={{ ...s.bubble, ...(mine ? s.bubbleMine : s.bubbleOther) }}>
                {!mine && <div style={s.sender}>{m.sender_label || "członek firmy"}</div>}
                <div>{m.body}</div>
                <div style={{ ...s.time, color: mine ? "#ffffffaa" : palette.smoke }}>
                  {m.created_at.slice(11, 16)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div style={s.composer}>
        <textarea
          style={s.input}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Wiadomość do kierowców… (Enter wysyła)"
          rows={2}
        />
        <button type="button" style={s.send} onClick={send} disabled={!text.trim()}>
          Wyślij ➤
        </button>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { display: "flex", flexDirection: "column", height: "calc(100vh - 140px)" },
  err: { color: palette.danger, fontSize: 13 },
  thread: {
    flex: 1,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: "12px 4px",
  },
  empty: { color: palette.smoke, textAlign: "center", marginTop: 40 },
  row: { display: "flex" },
  bubble: {
    maxWidth: "70%",
    borderRadius: 16,
    padding: "9px 14px",
    fontSize: 14.5,
    lineHeight: 1.45,
    display: "grid",
    gap: 2,
  },
  bubbleOther: {
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    color: palette.offWhite,
    borderBottomLeftRadius: 6,
  },
  bubbleMine: { background: palette.red, color: "#fff", borderBottomRightRadius: 6 },
  sender: { color: palette.red, fontSize: 11, fontWeight: 700 },
  time: { fontSize: 10, justifySelf: "end" },
  composer: { display: "flex", gap: 10, paddingTop: 12, alignItems: "flex-end" },
  input: {
    flex: 1,
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 14,
    color: palette.offWhite,
    padding: "10px 14px",
    fontSize: 14.5,
    resize: "none",
    fontFamily: "inherit",
  },
  send: {
    background: palette.red,
    color: "#fff",
    border: "none",
    borderRadius: 999,
    padding: "12px 22px",
    fontWeight: 700,
    cursor: "pointer",
  },
};
