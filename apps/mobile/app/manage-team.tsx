/**
 * Parytet zarządzania (fala 7, #351): zespół i uprawnienia z telefonu — właściciel
 * widzi członków firmy, zmienia rolę (dyspozytor/kierowca) i ustawia matrycę
 * uprawnień per moduł (brak/podgląd/edycja) oraz generuje link zaproszenia (Udostępnij).
 * Odpowiednik panelu web „Zespół". Zapis wysyła PEŁNĄ matrycę (jak web) — nie kasuje
 * uprawnień pominiętych modułów. Wiersz właściciela zablokowany (bez samo-degradacji).
 */
import {
  type CompanyMember,
  createInvite,
  getActiveMembership,
  listCompanyMembers,
  updateMember,
} from "@e-logistic/api";
import {
  APP_MODULES,
  type AppModule,
  DEFAULT_MODULES,
  effectivePermission,
  type MemberPermissions,
  PERMISSION_LEVELS,
  type PermissionLevel,
  type Role,
} from "@e-logistic/core";
import type { MobileMessageKey } from "@e-logistic/i18n";
import { palette } from "@e-logistic/ui";
import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { Card, PrimaryButton, SectionTitle, wide } from "../components/ui";
import { success, warn } from "../lib/haptics";
import { useT } from "../lib/i18n";
import { getSupabase, supabaseConfigured } from "../lib/supabase";

const WEB_BASE = "https://e-logistic-one.vercel.app";
/** Role przypisywalne z aplikacji (owner/developer poza UI). */
const ASSIGNABLE_ROLES: Role[] = ["dispatcher", "driver"];

type Editing = {
  userId: string;
  email: string;
  role: Role;
  perms: Record<AppModule, PermissionLevel>;
};

/**
 * Matryca do edycji. Dla MENEDŻERA (owner/dyspozytor) `effectivePermission`
 * zawsze zwraca „edit", więc zasianie z niej matrycy dałoby po democji do
 * kierowcy pełny dostęp (w tym do PIN-ów kart) — dlatego menedżerowi zasiewamy
 * BEZPIECZNE domyślne kierowcy, a kierowcy jego rzeczywistą matrycę.
 */
function initPerms(m: CompanyMember): Record<AppModule, PermissionLevel> {
  const out = {} as Record<AppModule, PermissionLevel>;
  const isManager = m.role === "owner" || m.role === "dispatcher";
  const driverDefaults = DEFAULT_MODULES.driver ?? [];
  for (const mod of APP_MODULES) {
    out[mod] = isManager
      ? driverDefaults.includes(mod)
        ? "edit"
        : "none"
      : effectivePermission(m.role, m.modules, m.permissions, mod);
  }
  return out;
}

export default function ManageTeamScreen() {
  const t = useT();
  // Etykiety ról/modułów/poziomów przez i18n (nie stałe PL z core) — parytet języków.
  const roleLabel = (r: Role) => t(`m.mteam.role.${r}` as MobileMessageKey);
  const modLabel = (m: AppModule) => t(`m.mmod.${m}` as MobileMessageKey);
  const permLabel = (p: PermissionLevel) => t(`m.perm.${p}` as MobileMessageKey);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [inviteRole, setInviteRole] = useState<Role>("driver");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabaseConfigured) return;
    try {
      const sb = getSupabase();
      const m = await getActiveMembership(sb);
      if (!m) return;
      setCompanyId(m.companyId);
      setIsOwner(m.role === "owner");
      setMsg(null);
      setMembers(await listCompanyMembers(sb));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : t("m.mteam.loadError"));
    }
  }, [t]);
  useEffect(() => {
    load();
  }, [load]);

  const openEdit = (m: CompanyMember) => {
    setMsg(null);
    setEditing({ userId: m.user_id, email: m.email, role: m.role, perms: initPerms(m) });
  };
  const closeEdit = () => {
    setMsg(null);
    setEditing(null);
  };
  const cyclePerm = (mod: AppModule) =>
    setEditing((e) => {
      if (!e) return e;
      const cur = e.perms[mod];
      const next =
        PERMISSION_LEVELS[(PERMISSION_LEVELS.indexOf(cur) + 1) % PERMISSION_LEVELS.length];
      return { ...e, perms: { ...e.perms, [mod]: next } };
    });

  async function save() {
    if (!editing || !companyId || busy) return;
    setBusy(true);
    try {
      // Pełna matryca (jak web): modules = moduły ≥ podgląd; permissions = komplet.
      const permissions: MemberPermissions = { ...editing.perms };
      const modules = APP_MODULES.filter((m) => (editing.perms[m] ?? "none") !== "none");
      await updateMember(getSupabase(), companyId, editing.userId, {
        role: editing.role,
        modules,
        permissions,
      });
      success();
      closeEdit();
      await load();
    } catch (e) {
      warn();
      setMsg(e instanceof Error ? e.message : t("m.mteam.saveError"));
    } finally {
      setBusy(false);
    }
  }

  async function invite() {
    if (!companyId || busy) return;
    setBusy(true);
    try {
      const token = await createInvite(getSupabase(), { role: inviteRole });
      const url = `${WEB_BASE}/join?token=${token}`;
      success();
      await Share.share({ message: t("m.mteam.inviteShare", { url }) });
    } catch (e) {
      warn();
      Alert.alert(t("m.mteam.saveError"), e instanceof Error ? e.message : "");
    } finally {
      setBusy(false);
    }
  }

  // ── Edycja członka ────────────────────────────────────────────────────────
  if (editing) {
    const showMatrix = editing.role === "driver";
    return (
      <ScrollView
        style={s.screen}
        contentContainerStyle={[s.content, wide]}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={{ gap: 12 }}>
          <SectionTitle>{editing.email}</SectionTitle>

          <Text style={s.lbl}>{t("m.mteam.role")}</Text>
          <View style={s.chips}>
            {ASSIGNABLE_ROLES.map((r) => (
              <Pressable
                key={r}
                style={[s.chip, editing.role === r && s.chipOn]}
                onPress={() => setEditing((e) => (e ? { ...e, role: r } : e))}
              >
                <Text style={[s.chipText, editing.role === r && { color: palette.white }]}>
                  {roleLabel(r)}
                </Text>
              </Pressable>
            ))}
          </View>

          {showMatrix ? (
            <>
              <Text style={s.section}>{t("m.mteam.permissions")}</Text>
              {APP_MODULES.map((mod) => {
                const lvl = editing.perms[mod];
                const color =
                  lvl === "edit" ? palette.red : lvl === "view" ? "#f59e0b" : palette.graphite;
                return (
                  <Pressable key={mod} style={s.permRow} onPress={() => cyclePerm(mod)}>
                    <Text style={s.permName}>{modLabel(mod)}</Text>
                    <View style={[s.permBadge, { borderColor: color }]}>
                      <Text style={[s.permBadgeText, { color }]}>{permLabel(lvl)}</Text>
                    </View>
                  </Pressable>
                );
              })}
              <Text style={s.hint}>{t("m.mteam.permHint")}</Text>
            </>
          ) : (
            <Text style={s.hint}>{t("m.mteam.managerNote")}</Text>
          )}

          {msg && <Text style={s.err}>{msg}</Text>}
          <PrimaryButton label={busy ? "…" : t("m.manage.save")} onPress={save} />
          <Pressable onPress={closeEdit}>
            <Text style={s.cancel}>{t("m.manage.cancel")}</Text>
          </Pressable>
        </Card>
      </ScrollView>
    );
  }

  // ── Lista członków ────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={[s.content, wide]}
      keyboardShouldPersistTaps="handled"
    >
      {isOwner && (
        <Card style={{ gap: 10 }}>
          <SectionTitle>{t("m.mteam.invite")}</SectionTitle>
          <View style={s.chips}>
            {ASSIGNABLE_ROLES.map((r) => (
              <Pressable
                key={r}
                style={[s.chip, inviteRole === r && s.chipOn]}
                onPress={() => setInviteRole(r)}
              >
                <Text style={[s.chipText, inviteRole === r && { color: palette.white }]}>
                  {roleLabel(r)}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={s.addBtn} onPress={invite}>
            <Text style={s.addText}>🔗 {t("m.mteam.generate")}</Text>
          </Pressable>
        </Card>
      )}

      {msg && <Text style={s.err}>{msg}</Text>}

      <SectionTitle>
        {t("m.mteam.members")} ({members.length})
      </SectionTitle>
      {members.length === 0 && <Text style={s.dim}>{t("m.mteam.empty")}</Text>}
      {members.map((m) => {
        const canEdit = isOwner && m.role !== "owner";
        return (
          <Card key={m.user_id} style={{ gap: 6 }}>
            <View style={s.rowTop}>
              <Text style={s.name}>
                {m.role === "owner" ? "👑" : m.role === "dispatcher" ? "🧭" : "🚚"} {m.email}
              </Text>
              {canEdit && (
                <Pressable onPress={() => openEdit(m)} hitSlop={8}>
                  <Text style={s.editLink}>✏️</Text>
                </Pressable>
              )}
            </View>
            <Text style={s.dim}>
              {roleLabel(m.role)}
              {m.status && m.status !== "active" ? ` · ${m.status}` : ""}
            </Text>
          </Card>
        );
      })}
      {!isOwner && <Text style={s.hint}>{t("m.mteam.ownerOnly")}</Text>}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.black },
  content: { padding: 16, gap: 10, paddingBottom: 32 },
  addBtn: {
    backgroundColor: palette.red,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  addText: { color: palette.white, fontWeight: "800", fontSize: 14 },
  lbl: { color: palette.smoke, fontSize: 12.5, marginBottom: 2 },
  section: {
    color: palette.offWhite,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 6,
    borderTopColor: palette.graphite,
    borderTopWidth: 1,
    paddingTop: 10,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: palette.graphite,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipOn: { backgroundColor: palette.red, borderColor: palette.red },
  chipText: { color: palette.smoke, fontSize: 13, fontWeight: "600" },
  permRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 9,
    borderBottomColor: palette.graphite,
    borderBottomWidth: 1,
  },
  permName: { color: palette.offWhite, fontSize: 14 },
  permBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    minWidth: 82,
    alignItems: "center",
  },
  permBadgeText: { fontSize: 12.5, fontWeight: "800" },
  hint: { color: palette.smoke, fontSize: 12, lineHeight: 17 },
  err: { color: palette.red, fontSize: 13 },
  cancel: { color: palette.smoke, textAlign: "center", paddingVertical: 8 },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  name: { color: palette.offWhite, fontSize: 14, fontWeight: "800", flexShrink: 1 },
  editLink: { fontSize: 16 },
  dim: { color: palette.smoke, fontSize: 12.5 },
});
