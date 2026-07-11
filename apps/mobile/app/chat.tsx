/**
 * #290: Czat z dyspozytorem (mockup 14) — wspólny kanał firmy, realtime.
 * Moje dymki po prawej (czerwone), reszta po lewej z etykietą nadawcy.
 */
import {
  type ChatMessage,
  getActiveMembership,
  listMessages,
  sendMessage,
  subscribeMessages,
} from "@e-logistic/api";
import { palette } from "@e-logistic/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../components/AuthProvider";
import { getSupabase, supabaseConfigured } from "../lib/supabase";

export default function ChatScreen() {
  const { session } = useAuth();
  const me = session?.user?.id;
  const myLabel = session?.user?.email ?? "ja";
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

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
        setMessages(await listMessages(sb, m.companyId));
        cleanup = subscribeMessages(sb, m.companyId, (msg) => {
          setMessages((list) => (list.some((x) => x.id === msg.id) ? list : [...list, msg]));
        });
      } catch {
        if (alive) setErr("Nie udało się wczytać czatu — sprawdź zasięg.");
      }
    })();
    return () => {
      alive = false;
      cleanup?.();
    };
  }, []);

  const send = useCallback(async () => {
    const body = text.trim();
    if (!body || !companyId || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const msg = await sendMessage(getSupabase(), companyId, body, myLabel);
      setMessages((list) => (list.some((x) => x.id === msg.id) ? list : [...list, msg]));
      setText("");
    } catch {
      setErr("Nie wysłano — spróbuj ponownie przy zasięgu.");
    } finally {
      setBusy(false);
    }
  }, [text, companyId, busy, myLabel]);

  return (
    <KeyboardAvoidingView
      style={s.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={s.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <Text style={s.empty}>
            {err ?? "Napisz pierwszą wiadomość — dyspozytor i właściciel widzą ten kanał."}
          </Text>
        }
        renderItem={({ item }) => {
          const mine = item.sender_id === me;
          return (
            <View style={[s.bubbleRow, mine && s.bubbleRowMine]}>
              <View style={[s.bubble, mine ? s.bubbleMine : s.bubbleOther]}>
                {!mine && (
                  <Text style={s.sender} numberOfLines={1}>
                    {item.sender_label || "członek firmy"}
                  </Text>
                )}
                <Text style={mine ? s.bodyMine : s.body}>{item.body}</Text>
                <Text style={[s.time, mine && s.timeMine]}>{item.created_at.slice(11, 16)}</Text>
              </View>
            </View>
          );
        }}
      />
      {err && messages.length > 0 && <Text style={s.err}>{err}</Text>}
      <View style={s.composer}>
        <TextInput
          style={s.input}
          value={text}
          onChangeText={setText}
          placeholder="Wiadomość do dyspozytora…"
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
});
