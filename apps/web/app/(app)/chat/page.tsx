"use client";

/**
 * #290/#291: Czat firmowy 2.0 — sidebar kanałów (Ogólny + nazwane wątki),
 * tworzenie kanałów z członkami (np. osobny per kierowca), zmiana nazwy,
 * zdjęcia w wiadomościach i push (Expo) do odbiorców po wysłaniu.
 */
import {
  addThreadMembers,
  type ChatMessage,
  type ChatThread,
  type CompanyMember,
  chatPhotoUrl,
  createThread,
  listCompanyMembers,
  listMessages,
  listThreadMembers,
  listThreads,
  removeThreadMember,
  renameThread,
  sendMessage,
  subscribeMessages,
  uploadChatPhotoBinary,
} from "@e-logistic/api";
import { cssPalette as palette } from "@e-logistic/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/ui";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";

function notifyChat(threadId: string | null, preview: string): void {
  (async () => {
    const { data } = await getBrowserSupabase().auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    await fetch("/api/chat/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ threadId, preview: preview.slice(0, 140) }),
    });
  })().catch(() => {});
}

function ChatImg({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    chatPhotoUrl(getBrowserSupabase(), path)
      .then(setUrl)
      .catch(() => {});
  }, [path]);
  if (!url) return <span style={{ fontSize: 12 }}>📷 wczytywanie…</span>;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      {/* biome-ignore lint/performance/noImgElement: podpisany URL Storage, poza optymalizacją next/image */}
      <img src={url} alt="Zdjęcie z czatu" style={{ maxWidth: 240, borderRadius: 10 }} />
    </a>
  );
}

export default function ChatPage() {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThread, setActiveThread] = useState<ChatThread | null>(null); // null = Ogólny
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [me, setMe] = useState<string | null>(null);
  const [myLabel, setMyLabel] = useState("");
  const [manage, setManage] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // panel tworzenia / edycji
  const [creating, setCreating] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingMembers, setEditingMembers] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const threadId = activeThread?.id ?? null;
  // Filtr aktywnego wątku dla realtime trzymany w refie — subskrypcja jest jedna
  // per firma (niżej) i nie odtwarza się przy przełączeniu kanału (audyt N15).
  const threadIdRef = useRef<string | null>(threadId);

  // Init: firma, rola, kanały, subskrypcja realtime (jedna na firmę).
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
        setManage(m.role === "owner" || m.role === "dispatcher");
        setCompanyId(m.companyId);
        setThreads(await listThreads(sb, m.companyId));
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message : "Nie udało się wczytać czatu.");
      }
    })();
    return () => {
      alive = false;
      cleanup?.();
    };
  }, []);

  // Wiadomości aktywnego kanału — lekki reload przy zmianie firmy/wątku
  // (bez zrywania połączenia WSS; realtime subskrybuje osobny efekt niżej).
  useEffect(() => {
    if (!companyId) return;
    threadIdRef.current = threadId;
    let alive = true;
    (async () => {
      try {
        const msgs = await listMessages(getBrowserSupabase(), companyId, { threadId });
        if (alive) setMessages(msgs);
      } catch {
        if (alive) setErr("Nie udało się wczytać wiadomości.");
      }
    })();
    return () => {
      alive = false;
    };
  }, [companyId, threadId]);

  // Realtime: jedna subskrypcja per firma (kanał firmowy, filtr company_id).
  // Przełączenie wątku NIE odtwarza połączenia — handler filtruje po refie (N15).
  useEffect(() => {
    if (!companyId) return;
    return subscribeMessages(getBrowserSupabase(), companyId, (msg) => {
      if ((msg.thread_id ?? null) !== threadIdRef.current) return;
      setMessages((list) => (list.some((x) => x.id === msg.id) ? list : [...list, msg]));
    });
  }, [companyId]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll przy każdej nowej wiadomości
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = useCallback(async () => {
    const body = text.trim();
    if (!body || !companyId) return;
    try {
      const msg = await sendMessage(getBrowserSupabase(), companyId, body, myLabel, { threadId });
      setMessages((list) => (list.some((x) => x.id === msg.id) ? list : [...list, msg]));
      setText("");
      notifyChat(threadId, body);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Nie wysłano wiadomości.");
    }
  }, [text, companyId, myLabel, threadId]);

  async function sendFile(file: File) {
    if (!companyId) return;
    try {
      const sb = getBrowserSupabase();
      const path = await uploadChatPhotoBinary(sb, companyId, await file.arrayBuffer(), {
        mime: file.type || "image/jpeg",
      });
      const msg = await sendMessage(sb, companyId, "📷 Zdjęcie", myLabel, {
        threadId,
        photoPath: path,
      });
      setMessages((list) => (list.some((x) => x.id === msg.id) ? list : [...list, msg]));
      notifyChat(threadId, "📷 Zdjęcie");
    } catch {
      setErr("Nie udało się wysłać zdjęcia.");
    }
  }

  async function loadMembersFor(thread: ChatThread | null) {
    const sb = getBrowserSupabase();
    const all = (await listCompanyMembers(sb).catch(() => [])).filter((m) => m.status === "active");
    setMembers(all);
    if (thread) setSelected(new Set(await listThreadMembers(sb, thread.id).catch(() => [])));
    else setSelected(new Set());
  }

  async function submitCreate() {
    if (!companyId || !nameDraft.trim()) return;
    try {
      const t = await createThread(getBrowserSupabase(), companyId, nameDraft.trim(), [
        ...selected,
      ]);
      setThreads((list) => [...list, t]);
      setCreating(false);
      setActiveThread(t);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Nie udało się utworzyć kanału.");
    }
  }

  async function saveRename() {
    if (!activeThread || !nameDraft.trim()) return;
    try {
      await renameThread(getBrowserSupabase(), activeThread.id, nameDraft.trim());
      setThreads((list) =>
        list.map((t) => (t.id === activeThread.id ? { ...t, name: nameDraft.trim() } : t)),
      );
      setActiveThread((t) => (t ? { ...t, name: nameDraft.trim() } : t));
      setEditingMembers(false);
    } catch {
      setErr("Nie udało się zmienić nazwy.");
    }
  }

  async function toggleMember(userId: string) {
    if (!activeThread) return;
    const sb = getBrowserSupabase();
    const on = selected.has(userId);
    try {
      if (on) await removeThreadMember(sb, activeThread.id, userId);
      else await addThreadMembers(sb, activeThread.id, [userId]);
      setSelected((set) => {
        const next = new Set(set);
        if (on) next.delete(userId);
        else next.add(userId);
        return next;
      });
    } catch {
      setErr("Nie udało się zmienić członków.");
    }
  }

  return (
    <div style={s.page}>
      <PageHeader
        title="Czat firmowy"
        subtitle="Kanały rozmów z kierowcami — na żywo, ze zdjęciami i powiadomieniami push"
      />
      {err && <p style={s.err}>{err}</p>}

      <div style={s.layout}>
        {/* Sidebar kanałów */}
        <aside style={s.sidebar}>
          <button
            type="button"
            style={{ ...s.channel, ...(threadId === null ? s.channelOn : {}) }}
            onClick={() => setActiveThread(null)}
          >
            📢 Ogólny
          </button>
          {threads.map((t) => (
            <button
              key={t.id}
              type="button"
              style={{ ...s.channel, ...(threadId === t.id ? s.channelOn : {}) }}
              onClick={() => setActiveThread(t)}
            >
              💬 {t.name}
            </button>
          ))}
          {manage && (
            <button
              type="button"
              style={s.newChannel}
              onClick={async () => {
                setCreating(true);
                setEditingMembers(false);
                setNameDraft("");
                await loadMembersFor(null);
              }}
            >
              ➕ Nowy kanał
            </button>
          )}
          {manage && activeThread && (
            <button
              type="button"
              style={s.newChannel}
              onClick={async () => {
                setEditingMembers(true);
                setCreating(false);
                setNameDraft(activeThread.name);
                await loadMembersFor(activeThread);
              }}
            >
              ⚙︎ Ustawienia kanału
            </button>
          )}
        </aside>

        {/* Rozmowa */}
        <section style={s.main}>
          {(creating || editingMembers) && (
            <div style={s.panel}>
              <strong style={{ color: palette.offWhite }}>
                {creating ? "Nowy kanał" : `Ustawienia: ${activeThread?.name}`}
              </strong>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  style={s.inputSmall}
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  placeholder="Nazwa kanału (np. Jan — trasa DE)"
                />
                <button
                  type="button"
                  style={s.sendBtn}
                  onClick={creating ? submitCreate : saveRename}
                  disabled={!nameDraft.trim()}
                >
                  {creating ? "Utwórz" : "Zapisz nazwę"}
                </button>
                <button
                  type="button"
                  style={s.ghostBtn}
                  onClick={() => {
                    setCreating(false);
                    setEditingMembers(false);
                  }}
                >
                  Zamknij
                </button>
              </div>
              <div style={s.memberGrid}>
                {members.map((m) => {
                  const on = selected.has(m.user_id);
                  return (
                    <label key={m.user_id} style={s.memberItem}>
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() =>
                          creating
                            ? setSelected((set) => {
                                const next = new Set(set);
                                if (on) next.delete(m.user_id);
                                else next.add(m.user_id);
                                return next;
                              })
                            : toggleMember(m.user_id)
                        }
                      />
                      <span style={{ color: palette.offWhite, fontSize: 13 }}>
                        {m.email} · {m.role}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div style={s.thread}>
            {messages.length === 0 && (
              <p style={s.empty}>Brak wiadomości — napisz pierwszą poniżej.</p>
            )}
            {messages.map((m) => {
              const mine = m.sender_id === me;
              return (
                <div
                  key={m.id}
                  style={{ ...s.row, justifyContent: mine ? "flex-end" : "flex-start" }}
                >
                  <div style={{ ...s.bubble, ...(mine ? s.bubbleMine : s.bubbleOther) }}>
                    {!mine && <div style={s.sender}>{m.sender_label || "członek firmy"}</div>}
                    {m.photo_path ? <ChatImg path={m.photo_path} /> : <div>{m.body}</div>}
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
            <label style={s.attach}>
              📷
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) sendFile(f);
                  e.target.value = "";
                }}
              />
            </label>
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
              placeholder={`Wiadomość — ${activeThread ? activeThread.name : "kanał ogólny"}… (Enter wysyła)`}
              rows={2}
            />
            <button type="button" style={s.sendBtn} onClick={send} disabled={!text.trim()}>
              Wyślij ➤
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { display: "flex", flexDirection: "column", height: "calc(100vh - 140px)" },
  err: { color: palette.danger, fontSize: 13 },
  layout: { display: "flex", gap: 16, flex: 1, minHeight: 0 },
  sidebar: {
    width: 220,
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    gap: 6,
    overflowY: "auto",
  },
  channel: {
    textAlign: "left",
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    color: palette.offWhite,
    borderRadius: 12,
    padding: "10px 12px",
    cursor: "pointer",
    fontSize: 14,
  },
  channelOn: { borderColor: palette.red, background: "#1d0a0b", fontWeight: 700 },
  newChannel: {
    textAlign: "left",
    background: "transparent",
    border: `1px dashed ${palette.graphite}`,
    color: palette.smoke,
    borderRadius: 12,
    padding: "10px 12px",
    cursor: "pointer",
    fontSize: 13,
  },
  main: { flex: 1, display: "flex", flexDirection: "column", minWidth: 0 },
  panel: {
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 12,
    padding: 12,
    display: "grid",
    gap: 10,
    marginBottom: 10,
  },
  memberGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: 6,
  },
  memberItem: { display: "flex", alignItems: "center", gap: 8 },
  inputSmall: {
    flex: 1,
    background: palette.black,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 10,
    color: palette.offWhite,
    padding: "8px 12px",
    fontSize: 14,
  },
  ghostBtn: {
    background: "transparent",
    border: `1px solid ${palette.graphite}`,
    color: palette.offWhite,
    borderRadius: 999,
    padding: "8px 16px",
    cursor: "pointer",
  },
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
  attach: {
    border: `1px solid ${palette.graphite}`,
    borderRadius: 12,
    padding: "10px 12px",
    cursor: "pointer",
    fontSize: 16,
  },
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
  sendBtn: {
    background: palette.red,
    color: "#fff",
    border: "none",
    borderRadius: 999,
    padding: "12px 22px",
    fontWeight: 700,
    cursor: "pointer",
  },
};
