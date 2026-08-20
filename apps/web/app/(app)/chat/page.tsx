"use client";

/**
 * #290/#291: Czat firmowy 2.0 — sidebar kanałów (Ogólny + nazwane wątki),
 * tworzenie kanałów z członkami (np. osobny per kierowca), zmiana nazwy,
 * zdjęcia w wiadomościach i powiadomienia do odbiorców po wysłaniu.
 * #368: liczniki nieprzeczytanych przy kanałach + oznaczanie przeczytania.
 */
import {
  addThreadMembers,
  type ChatMessage,
  type ChatThread,
  type CompanyMember,
  chatChannelKey,
  chatPhotoUrl,
  copyChatPhotoToThread,
  createThread,
  deleteMessage,
  deleteThread,
  editMessage,
  getCompanyChatTtl,
  listCompanyMembers,
  listMessages,
  listReactions,
  listThreadMembers,
  listThreads,
  type MessageReaction,
  removeThreadMember,
  renameThread,
  sendMessage,
  setChatTtl,
  setReaction,
  subscribeMessages,
  subscribeReactions,
  uploadChatPhotoBinary,
} from "@e-logistic/api";
import { type ChatViewer, mapLink, readChatLocation, TTL_OPTIONS } from "@e-logistic/core";
import { cssPalette as palette } from "@e-logistic/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import { useConfirm } from "@/components/ConfirmProvider";
import { useT } from "@/components/LocaleProvider";
import { useToast } from "@/components/Toast";
import { PageHeader } from "@/components/ui";
import {
  markChannelRead,
  markChannelReadThrottled,
  setOpenChatChannel,
  useChatUnread,
} from "@/lib/chatUnread";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { MessageBubble } from "./MessageBubble";

// #368: `companyId` jawnie w żądaniu — serwer nie może zgadywać firmy nadawcy
// (konto w dwóch firmach rozsyłało podgląd treści do niewłaściwej).
function notifyChat(threadId: string | null, preview: string, companyId?: string): void {
  (async () => {
    const { data } = await getBrowserSupabase().auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    await fetch("/api/chat/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ threadId, preview: preview.slice(0, 140), companyId }),
    });
  })().catch(() => {});
}

function ChatImg({ path }: { path: string }) {
  const t = useT();
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    chatPhotoUrl(getBrowserSupabase(), path)
      .then(setUrl)
      .catch(() => {});
  }, [path]);
  if (!url) return <span style={{ fontSize: 12 }}>📷 {t("chat.imgLoading")}</span>;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      {/* biome-ignore lint/performance/noImgElement: podpisany URL Storage, poza optymalizacją next/image */}
      <img src={url} alt={t("chat.imgAlt")} style={{ maxWidth: 240, borderRadius: 10 }} />
    </a>
  );
}

/** #368: licznik nieprzeczytanych przy kanale (nic nie renderuje przy zerze). */
function UnreadDot({ count }: { count: number }) {
  const t = useT();
  if (count <= 0) return null;
  return (
    <span style={s.unread} role="status" title={t("chat.unread")} aria-label={t("chat.unread")}>
      {count > 99 ? "99+" : count}
    </span>
  );
}

/** [#374] Pinezka w dymku — współrzędne + odnośnik do map. */
function LocationCard({ meta }: { meta: unknown }) {
  const t = useT();
  const loc = readChatLocation(meta);
  // Wadliwe `meta` (stary wpis, uszkodzone dane) nie może wywalić listy rozmowy.
  if (!loc) return <div>{t("chat.msg.location")}</div>;
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <div>📍 {loc.label ?? t("chat.msg.location")}</div>
      <a
        href={mapLink(loc, "web")}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "inherit", textDecoration: "underline", fontSize: 12 }}
      >
        {t("chat.location.open")} · {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
      </a>
    </div>
  );
}

export default function ChatPage() {
  const t = useT();
  const toast = useToast();
  const confirm = useConfirm();
  const unread = useChatUnread();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThread, setActiveThread] = useState<ChatThread | null>(null); // null = Ogólny
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [me, setMe] = useState<string | null>(null);
  const [myLabel, setMyLabel] = useState("");
  const [manage, setManage] = useState(false);
  const [role, setRole] = useState<ChatViewer["role"]>("driver");
  // [#374] Reakcje wczytujemy jednym zapytaniem na widok, nie per dymek.
  const [reactions, setReactions] = useState<MessageReaction[]>([]);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [forwarding, setForwarding] = useState<ChatMessage | null>(null);
  // [#376] Ustawienie znikania kanału OGÓLNEGO mieszka w `companies`, nie
  // w wątku — bez tego panel zawsze pokazywał „wyłączone", niezależnie od stanu.
  const [companyTtl, setCompanyTtl] = useState<number | null>(null);
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
  // Własne id w refie — handler realtime powstaje raz (zależność [companyId]).
  const meRef = useRef<string | null>(null);

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
        meRef.current = userData.user?.id ?? null;
        setMyLabel(userData.user?.email ?? "panel");
        setManage(m.role === "owner" || m.role === "dispatcher");
        setRole(m.role as ChatViewer["role"]);
        setCompanyId(m.companyId);
        setThreads(await listThreads(sb, m.companyId));
        setCompanyTtl(await getCompanyChatTtl(sb, m.companyId).catch(() => null));
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message : t("chat.loadError"));
      }
    })();
    return () => {
      alive = false;
      cleanup?.();
    };
  }, [t]);

  // Wiadomości aktywnego kanału — lekki reload przy zmianie firmy/wątku
  // (bez zrywania połączenia WSS; realtime subskrybuje osobny efekt niżej).
  useEffect(() => {
    if (!companyId) return;
    threadIdRef.current = threadId;
    let alive = true;
    (async () => {
      try {
        const sb = getBrowserSupabase();
        const msgs = await listMessages(sb, companyId, { threadId });
        if (!alive) return;
        setMessages(msgs);
        // [#374] Reakcje jednym zapytaniem dla całego widoku — per dymek
        // oznaczałoby setki zapytań przy dłuższej rozmowie.
        setReactions(
          await listReactions(
            sb,
            msgs.map((m) => m.id),
          ),
        );
      } catch {
        if (alive) setErr(t("chat.messagesLoadError"));
      }
    })();
    return () => {
      alive = false;
    };
  }, [companyId, threadId, t]);

  // Realtime: jedna subskrypcja per firma (kanał firmowy, filtr company_id).
  // Przełączenie wątku NIE odtwarza połączenia — handler filtruje po refie (N15).
  useEffect(() => {
    if (!companyId) return;
    return subscribeMessages(
      getBrowserSupabase(),
      companyId,
      (msg) => {
        if ((msg.thread_id ?? null) !== threadIdRef.current) return;
        setMessages((list) => (list.some((x) => x.id === msg.id) ? list : [...list, msg]));
        // #368/#369: otwarty kanał czytamy na bieżąco, ale znacznik zapisujemy
        // ZDŁAWIONY — zapis do bazy na KAŻDĄ wiadomość u każdego patrzącego był
        // zbędny (RLS liczy `created_at > last_read_at`, więc wystarczy jeden zapis
        // „na koniec"; domyka go `setOpenChatChannel(null, false)` przy wyjściu).
        if (msg.sender_id !== meRef.current)
          markChannelReadThrottled(threadIdRef.current, companyId);
      },
      // [#374] UPDATE niesie edycję ORAZ miękkie usunięcie — podmieniamy
      // w miejscu, a dymek sam decyduje, czy pokazać treść, czy ślad po niej.
      (msg) => {
        if ((msg.thread_id ?? null) !== threadIdRef.current) return;
        setMessages((list) => list.map((x) => (x.id === msg.id ? msg : x)));
      },
    );
  }, [companyId]);

  // [#376] Reakcje na żywo. Bez tej subskrypcji reakcja innej osoby pojawiała
  // się dopiero po przeładowaniu rozmowy, mimo że tabela była w publikacji.
  useEffect(() => {
    if (!companyId) return;
    return subscribeReactions(getBrowserSupabase(), (r, event) => {
      setReactions((list) => {
        const without = list.filter(
          (x) => !(x.message_id === r.message_id && x.user_id === r.user_id && x.emoji === r.emoji),
        );
        return event === "INSERT" ? [...without, r] : without;
      });
    });
  }, [companyId]);

  // #368: kanał otwarty na ekranie nie liczy się do badge'a — zgłaszamy go do
  // wspólnego magazynu i od razu oznaczamy jako przeczytany.
  useEffect(() => {
    if (!companyId) return;
    setOpenChatChannel(threadId, true);
    markChannelRead(threadId, companyId);
    return () => {
      setOpenChatChannel(null, false);
    };
  }, [companyId, threadId]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll przy każdej nowej wiadomości
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── [#374] Akcje na wiadomościach ────────────────────────────────────
  // Wszystkie aktualizują stan lokalnie od razu, a realtime i tak przyniesie
  // ten sam wiersz — dzięki temu klikający widzi efekt bez czekania na sieć.

  const onDelete = useCallback(
    async (id: string) => {
      const ok = await confirm(t("chat.msg.deleteConfirm"), { danger: true });
      if (!ok) return;
      try {
        await deleteMessage(getBrowserSupabase(), id);
        setMessages((list) =>
          list.map((x) => (x.id === id ? { ...x, deleted_at: new Date().toISOString() } : x)),
        );
      } catch (e) {
        toast(e instanceof Error ? e.message : t("chat.loadError"), "error");
      }
    },
    [confirm, t, toast],
  );

  const onEdit = useCallback(
    async (id: string, body: string) => {
      try {
        const updated = await editMessage(getBrowserSupabase(), id, body);
        setMessages((list) => list.map((x) => (x.id === id ? updated : x)));
      } catch (e) {
        toast(e instanceof Error ? e.message : t("chat.loadError"), "error");
      }
    },
    [t, toast],
  );

  const onReact = useCallback(
    async (id: string, emoji: string, on: boolean) => {
      if (!me) return;
      // Optymistycznie: pasek reakcji ma zareagować natychmiast, bo to gest
      // o charakterze „kliknij i zapomnij".
      setReactions((rs) =>
        on
          ? [...rs, { message_id: id, user_id: me, emoji }]
          : rs.filter((r) => !(r.message_id === id && r.user_id === me && r.emoji === emoji)),
      );
      try {
        await setReaction(getBrowserSupabase(), id, emoji, on);
      } catch (e) {
        toast(e instanceof Error ? e.message : t("chat.loadError"), "error");
      }
    },
    [me, t, toast],
  );

  const onCopy = useCallback(
    async (text2: string) => {
      try {
        await navigator.clipboard.writeText(text2);
        toast(t("chat.msg.copied"), "success");
      } catch {
        // Schowek bywa zablokowany (brak HTTPS, odmowa uprawnień) — mówimy
        // o tym wprost zamiast udawać, że skopiowano.
        toast(t("chat.loadError"), "error");
      }
    },
    [t, toast],
  );

  /** [#374] Przekazanie: fizyczna KOPIA w docelowym kanale, nie referencja. */
  const onForwardTo = useCallback(
    async (msg: ChatMessage, targetThreadId: string | null) => {
      if (!companyId) return;
      try {
        const sb = getBrowserSupabase();
        // [#376] Załącznik trzeba SKOPIOWAĆ do folderu wątku docelowego.
        // Zachowanie ścieżki źródłowej sprawiało, że odbiorca nie mógł podpisać
        // URL-a (polityka 0088 bramkuje po wątku w nazwie pliku), a przekazanie
        // z kanału ogólnego do rozmowy prywatnej zostawiało plik czytelny
        // dla całej firmy.
        const photoPath = msg.photo_path
          ? await copyChatPhotoToThread(sb, msg.photo_path, companyId, targetThreadId)
          : null;
        await sendMessage(sb, companyId, msg.body, myLabel, {
          threadId: targetThreadId,
          photoPath,
          kind: msg.kind,
          meta: msg.meta,
        });
        setForwarding(null);
        toast(t("chat.forward.done"), "success");
      } catch (e) {
        toast(e instanceof Error ? e.message : t("chat.loadError"), "error");
      }
    },
    [companyId, myLabel, t, toast],
  );

  /** [#374] Usunięcie kanału — funkcja i polityka RLS istniały, brakowało UI. */
  const onDeleteThread = useCallback(async () => {
    if (!activeThread) return;
    const ok = await confirm(t("chat.thread.deleteConfirm"), { danger: true });
    if (!ok) return;
    try {
      await deleteThread(getBrowserSupabase(), activeThread.id);
      setThreads((list) => list.filter((x) => x.id !== activeThread.id));
      setActiveThread(null);
    } catch (e) {
      toast(e instanceof Error ? e.message : t("chat.loadError"), "error");
    }
  }, [activeThread, confirm, t, toast]);

  /** [#374] Znikanie wiadomości dla kanału. `null` wyłącza. */
  const onSetTtl = useCallback(
    async (seconds: number | null) => {
      if (!companyId) return;
      try {
        await setChatTtl(getBrowserSupabase(), { companyId, threadId }, seconds);
        if (activeThread) {
          setThreads((list) =>
            list.map((x) =>
              x.id === activeThread.id ? { ...x, ephemeral_ttl_seconds: seconds } : x,
            ),
          );
        } else {
          setCompanyTtl(seconds);
        }
      } catch (e) {
        toast(e instanceof Error ? e.message : t("chat.loadError"), "error");
      }
    },
    [companyId, threadId, activeThread, t, toast],
  );

  /**
   * [#374] Wysłanie własnej lokalizacji jako wiadomości.
   *
   * Świadomie JEDNORAZOWY zrzut pozycji, nie śledzenie na żywo: udostępnianie
   * ciągłe to zupełnie inna kategoria danych (i zgód) — mieszkają w osobnym
   * przełączniku w Ustawieniach, z własną podstawą prawną.
   */
  const sendLocation = useCallback(() => {
    if (!companyId) return;
    if (!navigator.geolocation) {
      toast(t("chat.location.unavailable"), "error");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const msg = await sendMessage(getBrowserSupabase(), companyId, "", myLabel, {
            threadId,
            kind: "location",
            meta: { lat: pos.coords.latitude, lng: pos.coords.longitude },
            replyToId: replyTo?.id ?? null,
          });
          setMessages((list) => (list.some((x) => x.id === msg.id) ? list : [...list, msg]));
          setReplyTo(null);
        } catch (e) {
          toast(e instanceof Error ? e.message : t("chat.location.unavailable"), "error");
        }
      },
      // Odmowa zgody albo brak sygnału GPS — mówimy o tym wprost, zamiast
      // zostawiać użytkownika z przyciskiem, który „nic nie robi".
      () => toast(t("chat.location.unavailable"), "error"),
      { enableHighAccuracy: true, timeout: 12_000 },
    );
  }, [companyId, myLabel, threadId, replyTo, t, toast]);

  const send = useCallback(async () => {
    const body = text.trim();
    if (!body || !companyId) return;
    try {
      const msg = await sendMessage(getBrowserSupabase(), companyId, body, myLabel, {
        threadId,
        replyToId: replyTo?.id ?? null,
      });
      setMessages((list) => (list.some((x) => x.id === msg.id) ? list : [...list, msg]));
      setText("");
      setReplyTo(null);
      notifyChat(threadId, body, companyId);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("chat.sendError"));
    }
  }, [text, companyId, myLabel, threadId, replyTo, t]);

  async function sendFile(file: File) {
    if (!companyId) return;
    try {
      const sb = getBrowserSupabase();
      // #369: `threadId` wchodzi do ścieżki w Storage — to on decyduje, kto
      // odczyta załącznik (RLS 0088). Musi być ten sam wątek co w wiadomości.
      const path = await uploadChatPhotoBinary(sb, companyId, await file.arrayBuffer(), {
        mime: file.type || "image/jpeg",
        threadId,
      });
      const msg = await sendMessage(sb, companyId, t("chat.photoMessage"), myLabel, {
        threadId,
        photoPath: path,
      });
      setMessages((list) => (list.some((x) => x.id === msg.id) ? list : [...list, msg]));
      notifyChat(threadId, t("chat.photoMessage"), companyId);
    } catch {
      setErr(t("chat.photoSendError"));
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
      const thread = await createThread(getBrowserSupabase(), companyId, nameDraft.trim(), [
        ...selected,
      ]);
      setThreads((list) => [...list, thread]);
      setCreating(false);
      setActiveThread(thread);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("chat.createError"));
    }
  }

  async function saveRename() {
    if (!activeThread || !nameDraft.trim()) return;
    try {
      await renameThread(getBrowserSupabase(), activeThread.id, nameDraft.trim());
      setThreads((list) =>
        list.map((th) => (th.id === activeThread.id ? { ...th, name: nameDraft.trim() } : th)),
      );
      setActiveThread((th) => (th ? { ...th, name: nameDraft.trim() } : th));
      setEditingMembers(false);
    } catch {
      setErr(t("chat.renameError"));
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
      setErr(t("chat.membersError"));
    }
  }

  return (
    <div style={s.page}>
      <PageHeader title={t("chat.title")} subtitle={t("chat.subtitle")} />
      {err && <p style={s.err}>{err}</p>}

      <div style={s.layout}>
        {/* Sidebar kanałów */}
        <aside style={s.sidebar}>
          <button
            type="button"
            style={{ ...s.channel, ...(threadId === null ? s.channelOn : {}) }}
            onClick={() => setActiveThread(null)}
          >
            <span style={s.channelLabel}>📢 {t("chat.general")}</span>
            <UnreadDot count={unread.byChannel[chatChannelKey(null)] ?? 0} />
          </button>
          {threads.map((th) => (
            <button
              key={th.id}
              type="button"
              style={{ ...s.channel, ...(threadId === th.id ? s.channelOn : {}) }}
              onClick={() => setActiveThread(th)}
            >
              <span style={s.channelLabel}>💬 {th.name}</span>
              <UnreadDot count={unread.byChannel[chatChannelKey(th.id)] ?? 0} />
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
              ➕ {t("chat.newChannel")}
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
              ⚙︎ {t("chat.channelSettings")}
            </button>
          )}
        </aside>

        {/* Rozmowa */}
        <section style={s.main}>
          {(creating || editingMembers) && (
            <div style={s.panel}>
              <strong style={{ color: palette.offWhite }}>
                {creating
                  ? t("chat.newChannel")
                  : `${t("chat.settingsPrefix")} ${activeThread?.name}`}
              </strong>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  style={s.inputSmall}
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  placeholder={t("chat.namePlaceholder")}
                />
                <button
                  type="button"
                  style={s.sendBtn}
                  onClick={creating ? submitCreate : saveRename}
                  disabled={!nameDraft.trim()}
                >
                  {creating ? t("chat.create") : t("chat.saveName")}
                </button>
                <button
                  type="button"
                  style={s.ghostBtn}
                  onClick={() => {
                    setCreating(false);
                    setEditingMembers(false);
                  }}
                >
                  {t("chat.close")}
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

          {/* [#374] Ustawienia kanału dla zarządu: znikanie i usunięcie kanału.
              Usunięcie kanału miało funkcję i politykę RLS od migracji 0067,
              ale ŻADEN interfejs jej nie wywoływał — martwy kod przez trzy wydania. */}
          {manage && (
            <div style={s.panel}>
              <strong style={{ fontSize: 13 }}>{t("chat.ttl.title")}</strong>
              <div style={s.ttlRow}>
                {TTL_OPTIONS.map((o) => {
                  const current = activeThread
                    ? (activeThread.ephemeral_ttl_seconds ?? null)
                    : companyTtl;
                  const on = current === o.seconds;
                  return (
                    <button
                      key={String(o.seconds)}
                      type="button"
                      style={{ ...s.ttlChip, ...(on ? s.ttlChipOn : null) }}
                      onClick={() => onSetTtl(o.seconds)}
                    >
                      {t(o.labelKey as Parameters<typeof t>[0])}
                    </button>
                  );
                })}
              </div>
              {/* Uczciwość wobec użytkownika: znikanie nie cofa tego, co już poszło
                  pushem na telefon. Mówimy o tym w interfejsie, nie tylko w kodzie. */}
              <p style={s.ttlHint}>{t("chat.ttl.hint")}</p>
              {activeThread && (
                <button type="button" style={s.dangerBtn} onClick={onDeleteThread}>
                  🗑️ {t("chat.thread.delete")}
                </button>
              )}
            </div>
          )}

          <div style={s.thread}>
            {messages.length === 0 && <p style={s.empty}>{t("chat.empty")}</p>}
            {messages.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                repliedTo={messages.find((x) => x.id === m.reply_to_id) ?? null}
                reactions={reactions}
                viewer={{ userId: me ?? "", role }}
                onEdit={onEdit}
                onDelete={onDelete}
                onReply={setReplyTo}
                onForward={setForwarding}
                onReact={onReact}
                onCopy={onCopy}
              >
                {m.kind === "location" ? (
                  <LocationCard meta={m.meta} />
                ) : m.photo_path ? (
                  <ChatImg path={m.photo_path} />
                ) : (
                  <div>{m.body}</div>
                )}
              </MessageBubble>
            ))}
            <div ref={endRef} />
          </div>

          {/* [#374] Pasek cytatu — widoczny stan „odpowiadam na", z wyjściem. */}
          {replyTo && (
            <div style={s.replyBar}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ fontSize: 12 }}>{replyTo.sender_label || "—"}</strong>
                <div style={s.replyText}>{replyTo.body || t("chat.msg.photo")}</div>
              </div>
              <button
                type="button"
                style={s.replyClose}
                aria-label={t("chat.reply.cancel")}
                onClick={() => setReplyTo(null)}
              >
                ✕
              </button>
            </div>
          )}

          {/* [#374] Przekazanie: wybór kanału docelowego. Tworzy KOPIĘ, nie referencję —
              inaczej usunięcie oryginału opróżniłoby wiadomość w drugim kanale. */}
          {forwarding && (
            <div style={s.forwardBar}>
              <strong style={{ fontSize: 12 }}>{t("chat.forward.title")}</strong>
              <div style={s.forwardList}>
                <button
                  type="button"
                  style={s.forwardItem}
                  onClick={() => onForwardTo(forwarding, null)}
                >
                  {t("chat.general")}
                </button>
                {threads.map((th) => (
                  <button
                    key={th.id}
                    type="button"
                    style={s.forwardItem}
                    onClick={() => onForwardTo(forwarding, th.id)}
                  >
                    {th.name}
                  </button>
                ))}
              </div>
              <button type="button" style={s.replyClose} onClick={() => setForwarding(null)}>
                ✕
              </button>
            </div>
          )}

          <div style={s.composer}>
            {/* [#374] Jednorazowy zrzut pozycji jako wiadomość. Śledzenie ciągłe
                to osobna kategoria danych i mieszka w przełączniku w Ustawieniach. */}
            <button
              type="button"
              style={s.attach}
              onClick={sendLocation}
              title={t("chat.location.send")}
              aria-label={t("chat.location.send")}
            >
              📍
            </button>
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
              placeholder={`${t("chat.messagePlaceholderPrefix")} ${activeThread ? activeThread.name : t("chat.generalChannel")}… ${t("chat.enterSends")}`}
              rows={2}
            />
            <button type="button" style={s.sendBtn} onClick={send} disabled={!text.trim()}>
              {t("chat.send")} ➤
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  replyBar: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px",
    borderLeft: `3px solid ${palette.red}`,
    background: "#141414",
    borderRadius: 8,
    marginBottom: 6,
  },
  replyText: {
    fontSize: 12,
    color: palette.smoke,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  replyClose: {
    background: "transparent",
    border: "none",
    color: palette.smoke,
    cursor: "pointer",
    fontSize: 14,
  },
  forwardBar: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px",
    background: "#141414",
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
    marginBottom: 6,
    flexWrap: "wrap",
  },
  forwardList: { display: "flex", gap: 6, flexWrap: "wrap", flex: 1 },
  forwardItem: {
    background: palette.graphite,
    color: palette.offWhite,
    border: "none",
    borderRadius: 999,
    padding: "4px 10px",
    fontSize: 12,
    cursor: "pointer",
  },
  ttlRow: { display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 },
  ttlChip: {
    background: "transparent",
    border: `1px solid ${palette.graphite}`,
    color: palette.smoke,
    borderRadius: 999,
    padding: "3px 10px",
    fontSize: 12,
    cursor: "pointer",
  },
  ttlChipOn: { background: palette.red, color: "#fff", borderColor: palette.red },
  ttlHint: { fontSize: 11, color: palette.smoke, lineHeight: 1.5, marginTop: 4 },
  dangerBtn: {
    background: "transparent",
    border: `1px solid ${palette.red}`,
    color: palette.red,
    borderRadius: 8,
    padding: "5px 10px",
    fontSize: 12,
    cursor: "pointer",
    marginTop: 8,
  },
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
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  channelLabel: { flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" },
  unread: {
    background: palette.red,
    color: "#fff",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    padding: "1px 6px",
    minWidth: 18,
    textAlign: "center",
    flexShrink: 0,
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
