/**
 * #291: Rozmowa w kanale (ogólny lub wątek) — realtime, zdjęcia (📷 → Storage),
 * push do odbiorców po wysłaniu; zarząd zmienia nazwę i członków kanału.
 * #368: wysyłka idzie przez outbox (offline-first) z dymkiem „wysyłanie…",
 * a wejście do rozmowy zeruje licznik nieprzeczytanych.
 */
import {
  addThreadMembers,
  type ChatMessage,
  type CompanyMember,
  chatPhotoUrl,
  getActiveMembership,
  listCompanyMembers,
  listMessages,
  listThreadMembers,
  removeThreadMember,
  renameThread,
  subscribeMessages,
  uploadChatPhotoBinary,
} from "@e-logistic/api";
import { palette } from "@e-logistic/ui";
import { decode } from "base64-arraybuffer";
import * as ImagePicker from "expo-image-picker";
import { Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../components/AuthProvider";
import { markChannelRead, markChannelReadThrottled, setOpenChatChannel } from "../lib/chatUnread";
import { tap, warn } from "../lib/haptics";
import { useT } from "../lib/i18n";
import {
  type ChatOutboxInput,
  enqueue,
  flushQueued,
  listOutbox,
  removeOutbox,
  subscribeOutbox,
} from "../lib/outbox";
import { getSupabase, supabaseConfigured } from "../lib/supabase";

/** Wiadomość czekająca w outboxie — dymek „wysyłanie…" zanim dotrze na serwer. */
interface PendingMessage {
  id: string;
  body: string;
  photoPath: string | null;
  createdAt: string;
  synced: boolean;
  failed: boolean;
}

/** Wiersz listy: potwierdzona wiadomość z serwera albo wpis z kolejki. */
type Row = { kind: "sent"; msg: ChatMessage } | { kind: "pending"; item: PendingMessage };

/** Zdjęcie w dymku — pobiera podpisany URL raz i cache'uje w stanie. */
function ChatImage({ path }: { path: string }) {
  const t = useT();
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    chatPhotoUrl(getSupabase(), path)
      .then(setUrl)
      .catch(() => {});
  }, [path]);
  if (!url)
    return <Text style={{ color: palette.smoke, fontSize: 12 }}>{t("m.chat.loadingPhoto")}</Text>;
  return <Image source={{ uri: url }} style={{ width: 200, height: 200, borderRadius: 12 }} />;
}

export default function ChatThreadScreen() {
  const params = useLocalSearchParams<{ id?: string; name?: string }>();
  const threadId = params.id ? String(params.id) : null;
  const t = useT();
  const [title, setTitle] = useState(params.name ? String(params.name) : t("m.chat.general"));
  const { session } = useAuth();
  const me = session?.user?.id;
  const myLabel = session?.user?.email ?? t("m.chat.me");

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState<PendingMessage[]>([]);
  const [text, setText] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [manage, setManage] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const listRef = useRef<FlatList<Row>>(null);
  // Panel zarządzania kanałem
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [threadMemberIds, setThreadMemberIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!supabaseConfigured) return;
    let cleanup: (() => void) | undefined;
    let alive = true;
    (async () => {
      try {
        const sb = getSupabase();
        const m = await getActiveMembership(sb);
        if (!m || !alive) return;
        setCompanyId(m.companyId);
        setManage(m.role === "owner" || m.role === "dispatcher");
        setMessages(await listMessages(sb, m.companyId, { threadId }));
        cleanup = subscribeMessages(sb, m.companyId, (msg) => {
          if ((msg.thread_id ?? null) !== threadId) return;
          setMessages((list) => (list.some((x) => x.id === msg.id) ? list : [...list, msg]));
          // #368/#369: rozmowa jest otwarta — czytamy na bieżąco, ale znacznik
          // zapisujemy ZDŁAWIONY. Zapis do bazy na KAŻDĄ wiadomość u każdego
          // patrzącego był zbędny (RLS liczy `created_at > last_read_at`);
          // zaległy zapis domyka `setOpenChatChannel(null, false)` przy wyjściu.
          if (msg.sender_id !== me) markChannelReadThrottled(threadId, m.companyId);
        });
      } catch {
        if (alive) setErr(t("m.chat.loadFail"));
      }
    })();
    return () => {
      alive = false;
      cleanup?.();
    };
  }, [threadId, me, t]);

  // #368: otwarty wątek nie liczy się do badge'a — zgłaszamy go magazynowi
  // liczników i od razu oznaczamy jako przeczytany.
  useEffect(() => {
    if (!companyId) return;
    setOpenChatChannel(threadId, true);
    markChannelRead(threadId, companyId);
    return () => {
      setOpenChatChannel(null, false);
    };
  }, [companyId, threadId]);

  // #368: dymki z kolejki offline (ten wątek) — odświeżane przy każdej zmianie outboxu.
  // `userId` filtrujemy jak w `syncItem` (współdzielony telefon): kierowca B nie
  // może zobaczyć ani skasować wiadomości kierowcy A czekającej w kolejce.
  const refreshPending = useCallback(async () => {
    const items = await listOutbox("chat");
    setPending(
      items
        .filter((it) => {
          const input = it.input as ChatOutboxInput;
          return (
            (input.threadId ?? null) === threadId &&
            (!companyId || input.companyId === companyId) &&
            (!it.userId || it.userId === me)
          );
        })
        .map((it) => {
          const input = it.input as ChatOutboxInput;
          return {
            id: it.id,
            body: input.body,
            photoPath: input.photoPath ?? null,
            createdAt: it.createdAt,
            synced: it.status === "synced",
            failed: it.status === "error",
          };
        })
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    );
  }, [threadId, companyId, me]);

  useEffect(() => {
    void refreshPending();
    return subscribeOutbox(() => {
      void refreshPending();
    });
  }, [refreshPending]);

  // Sprzątanie kolejki: wpis potwierdzony przez serwer (jest już w `messages`)
  // albo zsynchronizowany dawno temu nie ma po co zajmować outboxu i podbijać
  // paska „czeka na wysyłkę". Świeżo zsynchronizowane (<60 s) zostawiamy, żeby
  // dymek nie mrugnął, zanim realtime dostarczy prawdziwą wiadomość.
  useEffect(() => {
    const ids = new Set(messages.map((m) => m.id));
    for (const p of pending) {
      if (!p.synced) continue;
      const stale = Date.now() - new Date(p.createdAt).getTime() > 60_000;
      if (ids.has(p.id) || stale) void removeOutbox(p.id);
    }
  }, [messages, pending]);

  const send = useCallback(async () => {
    const body = text.trim();
    if (!body || !companyId || busy) return;
    setBusy(true);
    setErr(null);
    try {
      // #368: wiadomość ląduje NAJPIERW w outboxie (lokalnie, natychmiast) —
      // bez zasięgu nic nie ginie, a `enqueue` sam odpala próbę wysyłki w tle.
      // Dymek „wysyłanie…" pochodzi z kolejki; potwierdzoną treść przynosi realtime.
      const input: ChatOutboxInput = { companyId, threadId, body, senderLabel: myLabel };
      await enqueue("chat", input, new Date().toISOString());
      tap();
      setText("");
    } catch {
      warn();
      setErr(t("m.chat.sendFail"));
    } finally {
      setBusy(false);
    }
  }, [text, companyId, busy, myLabel, threadId, t]);

  async function sendPhoto() {
    if (!companyId || photoBusy) return;
    setPhotoBusy(true);
    setErr(null);
    try {
      const res = await ImagePicker.launchCameraAsync({ quality: 0.5, base64: true });
      const asset = res.assets?.[0];
      if (res.canceled || !asset?.base64) return;
      // Sam upload do Storage WYMAGA zasięgu (nie trzymamy zdjęć w AsyncStorage).
      // Gdy się uda — wiadomość leci już przez outbox, więc chwilowy brak sieci
      // przy samym INSERT-cie nie gubi zdjęcia.
      // #369: `threadId` ląduje w ścieżce Storage i to on wyznacza krąg odbiorców
      // (RLS 0088) — bez niego załącznik z rozmowy 1:1 widziałaby cała firma.
      const path = await uploadChatPhotoBinary(getSupabase(), companyId, decode(asset.base64), {
        mime: asset.mimeType ?? "image/jpeg",
        threadId,
      });
      const input: ChatOutboxInput = {
        companyId,
        threadId,
        body: t("m.chat.photo"),
        senderLabel: myLabel,
        photoPath: path,
      };
      await enqueue("chat", input, new Date().toISOString());
    } catch {
      setErr(t("m.chat.photoNeedsNetwork"));
    } finally {
      setPhotoBusy(false);
    }
  }

  async function openSettings() {
    if (!threadId) return;
    setNameDraft(title);
    setSettingsOpen(true);
    try {
      const sb = getSupabase();
      const [all, ids] = await Promise.all([
        listCompanyMembers(sb),
        listThreadMembers(sb, threadId),
      ]);
      setMembers(all.filter((m) => m.status === "active"));
      setThreadMemberIds(new Set(ids));
    } catch {
      setMembers([]);
    }
  }

  async function toggleMember(userId: string) {
    if (!threadId) return;
    const sb = getSupabase();
    const on = threadMemberIds.has(userId);
    try {
      if (on) await removeThreadMember(sb, threadId, userId);
      else await addThreadMembers(sb, threadId, [userId]);
      setThreadMemberIds((set) => {
        const next = new Set(set);
        if (on) next.delete(userId);
        else next.add(userId);
        return next;
      });
    } catch {
      setErr(t("m.chat.membersChangeFail"));
    }
  }

  async function saveName() {
    if (!threadId || !nameDraft.trim()) return;
    try {
      await renameThread(getSupabase(), threadId, nameDraft.trim());
      setTitle(nameDraft.trim());
      setSettingsOpen(false);
    } catch {
      setErr(t("m.chat.renameFail"));
    }
  }

  // Widok = potwierdzone wiadomości + wpisy z kolejki, których serwer jeszcze nie
  // odesłał (klucz to ten sam UUID, więc po dostarczeniu dymek nie dubluje się).
  const confirmed = new Set(messages.map((m) => m.id));
  const rows: Row[] = [
    ...messages.map((msg): Row => ({ kind: "sent", msg })),
    ...pending.filter((p) => !confirmed.has(p.id)).map((item): Row => ({ kind: "pending", item })),
  ];

  return (
    <KeyboardAvoidingView
      style={s.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <Stack.Screen
        options={{
          title,
          headerRight:
            manage && threadId
              ? () => (
                  <Pressable onPress={openSettings} hitSlop={10}>
                    <Text style={{ color: palette.red, fontSize: 17 }}>⚙︎</Text>
                  </Pressable>
                )
              : undefined,
        }}
      />
      <FlatList
        ref={listRef}
        data={rows}
        keyExtractor={(r) => (r.kind === "sent" ? r.msg.id : r.item.id)}
        contentContainerStyle={s.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={<Text style={s.empty}>{err ?? t("m.chat.empty")}</Text>}
        renderItem={({ item: row }) => {
          // #368: dymek z kolejki — zawsze własny, ze statusem zamiast godziny.
          if (row.kind === "pending") {
            const p = row.item;
            return (
              <Pressable style={[s.bubbleRow, s.bubbleRowMine]} onPress={() => flushQueued()}>
                <View style={[s.bubble, s.bubbleMine, s.bubblePending]}>
                  {p.photoPath ? (
                    <ChatImage path={p.photoPath} />
                  ) : (
                    <Text style={s.bodyMine}>{p.body}</Text>
                  )}
                  <Text style={[s.time, s.timeMine]}>
                    {p.failed ? t("m.chat.retryQueued") : t("m.chat.sending")}
                  </Text>
                </View>
              </Pressable>
            );
          }
          const item = row.msg;
          const mine = item.sender_id === me;
          return (
            <View style={[s.bubbleRow, mine && s.bubbleRowMine]}>
              <View style={[s.bubble, mine ? s.bubbleMine : s.bubbleOther]}>
                {!mine && (
                  <Text style={s.sender} numberOfLines={1}>
                    {item.sender_label || t("m.chat.member")}
                  </Text>
                )}
                {item.photo_path ? (
                  <ChatImage path={item.photo_path} />
                ) : (
                  <Text style={mine ? s.bodyMine : s.body}>{item.body}</Text>
                )}
                <Text style={[s.time, mine && s.timeMine]}>{item.created_at.slice(11, 16)}</Text>
              </View>
            </View>
          );
        }}
      />
      {err && messages.length > 0 && <Text style={s.err}>{err}</Text>}
      <View style={s.composer}>
        <Pressable style={s.photo} onPress={sendPhoto} disabled={photoBusy}>
          <Text style={s.photoText}>{photoBusy ? "…" : "📷"}</Text>
        </Pressable>
        <TextInput
          style={s.input}
          value={text}
          onChangeText={setText}
          placeholder={t("m.chat.messagePh")}
          placeholderTextColor={palette.smoke}
          multiline
        />
        <Pressable
          style={[s.send, (!text.trim() || busy) && { opacity: 0.5 }]}
          onPress={send}
          disabled={!text.trim() || busy}
        >
          <Text style={s.sendText}>➤</Text>
        </Pressable>
      </View>

      <Modal visible={settingsOpen} transparent animationType="slide">
        <View style={s.backdrop}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>{t("m.chat.settings")}</Text>
            <Text style={s.sheetLabel}>{t("m.chat.name")}</Text>
            <View style={s.nameRow}>
              <TextInput
                style={[s.inputSheet, { flex: 1 }]}
                value={nameDraft}
                onChangeText={setNameDraft}
              />
              <Pressable style={s.saveName} onPress={saveName}>
                <Text style={s.saveNameText}>{t("m.chat.save")}</Text>
              </Pressable>
            </View>
            <Text style={s.sheetLabel}>{t("m.chat.membersToggle")}</Text>
            <ScrollView style={{ maxHeight: 240 }}>
              {members.map((m) => {
                const on = threadMemberIds.has(m.user_id);
                return (
                  <Pressable
                    key={m.user_id}
                    style={s.memberRow}
                    onPress={() => toggleMember(m.user_id)}
                  >
                    <View style={[s.check, on && s.checkOn]}>
                      {on && <Text style={s.checkTick}>✓</Text>}
                    </View>
                    <Text style={s.memberText} numberOfLines={1}>
                      {m.email} · {m.role}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable style={s.close} onPress={() => setSettingsOpen(false)}>
              <Text style={s.closeText}>{t("m.chat.close")}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.black },
  list: { padding: 16, gap: 10, flexGrow: 1 },
  empty: { color: palette.smoke, textAlign: "center", marginTop: 40, lineHeight: 20 },
  err: { color: palette.red, fontSize: 12, textAlign: "center", marginBottom: 4 },
  bubbleRow: { flexDirection: "row", justifyContent: "flex-start" },
  bubbleRowMine: { justifyContent: "flex-end" },
  bubble: { maxWidth: "82%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9, gap: 2 },
  bubbleOther: {
    backgroundColor: palette.nearBlack,
    borderColor: palette.graphite,
    borderWidth: 1,
    borderBottomLeftRadius: 6,
  },
  bubbleMine: { backgroundColor: palette.red, borderBottomRightRadius: 6 },
  /** #368: dymek jeszcze niedostarczony — przygaszony, dotknięcie ponawia wysyłkę. */
  bubblePending: { opacity: 0.6 },
  sender: { color: palette.red, fontSize: 11, fontWeight: "700" },
  body: { color: palette.offWhite, fontSize: 15, lineHeight: 20 },
  bodyMine: { color: palette.white, fontSize: 15, lineHeight: 20 },
  time: { color: palette.smoke, fontSize: 10, alignSelf: "flex-end" },
  timeMine: { color: "#ffffffaa" },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: palette.graphite,
    backgroundColor: "#111111",
  },
  photo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderColor: palette.graphite,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  photoText: { fontSize: 18 },
  input: {
    flex: 1,
    backgroundColor: palette.nearBlack,
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: palette.offWhite,
    fontSize: 15,
    maxHeight: 110,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.red,
    alignItems: "center",
    justifyContent: "center",
  },
  sendText: { color: palette.white, fontSize: 18, fontWeight: "800" },
  backdrop: { flex: 1, backgroundColor: "#000000cc", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: palette.nearBlack,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 10,
  },
  sheetTitle: { color: palette.offWhite, fontSize: 20, fontWeight: "800" },
  sheetLabel: { color: palette.smoke, fontSize: 13, fontWeight: "600" },
  nameRow: { flexDirection: "row", gap: 8 },
  inputSheet: {
    backgroundColor: palette.black,
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: palette.offWhite,
  },
  saveName: {
    backgroundColor: palette.red,
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  saveNameText: { color: palette.white, fontWeight: "700" },
  memberRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9 },
  check: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: palette.graphite,
    alignItems: "center",
    justifyContent: "center",
  },
  checkOn: { backgroundColor: palette.red, borderColor: palette.red },
  checkTick: { color: palette.white, fontWeight: "800" },
  memberText: { color: palette.offWhite, fontSize: 14, flex: 1 },
  close: {
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 4,
  },
  closeText: { color: palette.offWhite, fontWeight: "700" },
});
