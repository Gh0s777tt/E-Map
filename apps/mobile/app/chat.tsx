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
import { Card, ListRow, PrimaryButton, SectionTitle } from "../components/ui";
import { getSupabase, supabaseConfigured } from "../lib/supabase";

export default function ChatListScreen() {
  const router = useRouter();
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
      setErr("Nie udało się wczytać kanałów — sprawdź zasięg.");
    } finally {
      setLoading(false);
    }
  }, []);
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
      if (!m) throw new Error("Brak firmy.");
      const t = await createThread(sb, m.companyId, name.trim(), [...selected]);
      setCreating(false);
      setThreads((list) => [...list, t]);
      router.push({ pathname: "/chat-thread", params: { id: t.id, name: t.name } });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Nie udało się utworzyć kanału.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.content}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={load} tintColor={palette.red} />
      }
    >
      {err && <Text style={s.err}>{err}</Text>}

      <SectionTitle>Kanały</SectionTitle>
      <Card style={{ paddingVertical: 4 }}>
        <ListRow
          glyph="📢"
          title="Ogólny"
          subtitle="cała firma — wszyscy członkowie"
          onPress={() =>
            router.push({ pathname: "/chat-thread", params: { id: "", name: "Ogólny" } })
          }
          last={threads.length === 0}
        />
        {threads.map((t, i) => (
          <ListRow
            key={t.id}
            glyph="💬"
            title={t.name}
            subtitle="kanał prywatny"
            onPress={() =>
              router.push({ pathname: "/chat-thread", params: { id: t.id, name: t.name } })
            }
            last={i === threads.length - 1}
          />
        ))}
      </Card>

      {manage && (
        <View style={{ marginTop: 14 }}>
          <PrimaryButton label="➕ Nowy kanał" onPress={openCreate} />
          <Text style={s.hint}>
            Utwórz np. osobny kanał dla każdego kierowcy — widzi go tylko on i zarząd.
          </Text>
        </View>
      )}

      <Modal visible={creating} transparent animationType="slide">
        <View style={s.backdrop}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>Nowy kanał</Text>
            <TextInput
              style={s.input}
              value={name}
              onChangeText={setName}
              placeholder="Nazwa kanału (np. Jan — trasa DE)"
              placeholderTextColor={palette.smoke}
            />
            <Text style={s.sheetLabel}>Członkowie</Text>
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
              {members.length === 0 && (
                <Text style={s.hint}>Nie udało się pobrać członków (zasięg?).</Text>
              )}
            </ScrollView>
            <View style={s.sheetRow}>
              <Pressable style={s.cancel} onPress={() => setCreating(false)}>
                <Text style={s.cancelText}>Anuluj</Text>
              </Pressable>
              <Pressable
                style={[s.create, (!name.trim() || busy) && { opacity: 0.5 }]}
                onPress={submitCreate}
                disabled={!name.trim() || busy}
              >
                <Text style={s.createText}>{busy ? "Tworzę…" : "Utwórz"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
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
