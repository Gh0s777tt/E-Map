/**
 * #291: Rozmowa w kanale (ogólny lub wątek) — realtime, zdjęcia (📷 → Storage),
 * push do odbiorców po wysłaniu; zarząd zmienia nazwę i członków kanału.
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
  sendMessage,
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
import { notifyChat } from "../lib/chatNotify";
import { tap, warn } from "../lib/haptics";
import { useT } from "../lib/i18n";
import { getSupabase, supabaseConfigured } from "../lib/supabase";

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
  const [text, setText] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [manage, setManage] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);
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
        });
      } catch {
        if (alive) setErr(t("m.chat.loadFail"));
      }
    })();
    return () => {
      alive = false;
      cleanup?.();
    };
  }, [threadId, t]);

  const send = useCallback(async () => {
    const body = text.trim();
    if (!body || !companyId || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const msg = await sendMessage(getSupabase(), companyId, body, myLabel, { threadId });
      tap();
      setMessages((list) => (list.some((x) => x.id === msg.id) ? list : [...list, msg]));
      setText("");
      notifyChat(threadId, body);
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
      const sb = getSupabase();
      const path = await uploadChatPhotoBinary(sb, companyId, decode(asset.base64), {
        mime: asset.mimeType ?? "image/jpeg",
      });
      const msg = await sendMessage(sb, companyId, t("m.chat.photo"), myLabel, {
        threadId,
        photoPath: path,
      });
      setMessages((list) => (list.some((x) => x.id === msg.id) ? list : [...list, msg]));
      notifyChat(threadId, t("m.chat.photo"));
    } catch {
      setErr(t("m.chat.photoFail"));
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
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={s.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={<Text style={s.empty}>{err ?? t("m.chat.empty")}</Text>}
        renderItem={({ item }) => {
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
