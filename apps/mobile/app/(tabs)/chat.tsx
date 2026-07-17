/**
 * #291: Czat 2.0 — lista kanałów: Ogólny (cała firma) + nazwane wątki.
 * Zarząd tworzy kanały (nazwa + członkowie z listy firmy), np. osobny
 * kanał per kierowca. Kierowca widzi kanały, do których należy.
 */
import {
  type ChatThread,
  type CompanyMember,
  createThread,
  getActiveMembership,
  listCompanyMembers,
  listThreads,
} from "@e-logistic/api";
import { palette } from "@e-logistic/ui";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AppHeader } from "../../components/AppHeader";
import { Card, ListRow, PrimaryButton, SectionTitle, wide } from "../../components/ui";
import { useT } from "../../lib/i18n";
import { getSupabase, supabaseConfigured } from "../../lib/supabase";

export default function ChatListScreen() {
  const router = useRouter();
  const t = useT();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [manage, setManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  // Tworzenie kanału (zarząd)
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!supabaseConfigured) {
      setLoading(false);
      return;
    }
    try {
      const sb = getSupabase();
      const m = await getActiveMembership(sb);
      if (!m) return;
      setManage(m.role === "owner" || m.role === "dispatcher");
      setThreads(await listThreads(sb, m.companyId));
      setErr(null);
    } catch {
      setErr(t("m.chat.loadChannelsFail"));
    } finally {
      setLoading(false);
    }
  }, [t]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function openCreate() {
    setCreating(true);
    setName("");
    setSelected(new Set());
    try {
      setMembers((await listCompanyMembers(getSupabase())).filter((m) => m.status === "active"));
    } catch {
      setMembers([]);
    }
  }

  async function submitCreate() {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      const sb = getSupabase();
      const m = await getActiveMembership(sb);
      if (!m) throw new Error(t("m.chat.noCompany"));
      const th = await createThread(sb, m.companyId, name.trim(), [...selected]);
      setCreating(false);
      setThreads((list) => [...list, th]);
      router.push({ pathname: "/chat-thread", params: { id: th.id, name: th.name } });
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("m.chat.createFail"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={s.screen}>
      <AppHeader subtitle={t("m.screen.chat")} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.content, wide]}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={palette.red} />
        }
      >
        {err && <Text style={s.err}>{err}</Text>}

        <SectionTitle>{t("m.chat.channels")}</SectionTitle>
        <Card style={{ paddingVertical: 4 }}>
          <ListRow
            glyph="📢"
            title={t("m.chat.general")}
            subtitle={t("m.chat.generalSub")}
            onPress={() =>
              router.push({
                pathname: "/chat-thread",
                params: { id: "", name: t("m.chat.general") },
              })
            }
            last={threads.length === 0}
          />
          {threads.map((th, i) => (
            <ListRow
              key={th.id}
              glyph="💬"
              title={th.name}
              subtitle={t("m.chat.privateSub")}
              onPress={() =>
                router.push({ pathname: "/chat-thread", params: { id: th.id, name: th.name } })
              }
              last={i === threads.length - 1}
            />
          ))}
        </Card>

        {manage && (
          <View style={{ marginTop: 14 }}>
            <PrimaryButton label={t("m.chat.new")} onPress={openCreate} />
            <Text style={s.hint}>{t("m.chat.newHint")}</Text>
          </View>
        )}

        <Modal visible={creating} transparent animationType="slide">
          <View style={s.backdrop}>
            <View style={s.sheet}>
              <Text style={s.sheetTitle}>{t("m.chat.newTitle")}</Text>
              <TextInput
                style={s.input}
                value={name}
                onChangeText={setName}
                placeholder={t("m.chat.namePh")}
                placeholderTextColor={palette.smoke}
              />
              <Text style={s.sheetLabel}>{t("m.chat.members")}</Text>
              <ScrollView style={{ maxHeight: 260 }}>
                {members.map((m) => {
                  const on = selected.has(m.user_id);
                  return (
                    <Pressable
                      key={m.user_id}
                      style={s.memberRow}
                      onPress={() =>
                        setSelected((set) => {
                          const next = new Set(set);
                          if (on) next.delete(m.user_id);
                          else next.add(m.user_id);
                          return next;
                        })
                      }
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
                {members.length === 0 && <Text style={s.hint}>{t("m.chat.membersFail")}</Text>}
              </ScrollView>
              <View style={s.sheetRow}>
                <Pressable style={s.cancel} onPress={() => setCreating(false)}>
                  <Text style={s.cancelText}>{t("m.chat.cancel")}</Text>
                </Pressable>
                <Pressable
                  style={[s.create, (!name.trim() || busy) && { opacity: 0.5 }]}
                  onPress={submitCreate}
                  disabled={!name.trim() || busy}
                >
                  <Text style={s.createText}>
                    {busy ? t("m.chat.creating") : t("m.chat.create")}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.black },
  content: { padding: 16, paddingBottom: 32 },
  err: { color: palette.red, fontSize: 13, marginBottom: 8 },
  hint: { color: palette.smoke, fontSize: 12, marginTop: 8, textAlign: "center", lineHeight: 17 },
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
  input: {
    backgroundColor: palette.black,
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: palette.offWhite,
    fontSize: 16,
  },
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
  sheetRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  cancel: {
    flex: 1,
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 13,
    alignItems: "center",
  },
  cancelText: { color: palette.offWhite, fontWeight: "700" },
  create: {
    flex: 1,
    backgroundColor: palette.red,
    borderRadius: 999,
    paddingVertical: 13,
    alignItems: "center",
  },
  createText: { color: palette.white, fontWeight: "700" },
});
