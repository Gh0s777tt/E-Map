"use client";

import {
  type CompanyInvite,
  type CompanyMember,
  isInvitePending,
  listCompanyMembers,
  listInvites,
  revokeInvite,
  setMemberStatus,
  updateMember,
} from "@e-logistic/api";
import {
  APP_MODULE_LABELS,
  APP_MODULES,
  type AppModule,
  effectivePermission,
  type MemberPermissions,
  type PermissionLevel,
  type Role,
} from "@e-logistic/core";
import { cssPalette as palette } from "@e-logistic/ui";
import { useCallback, useEffect, useState } from "react";
import * as f from "@/components/formStyles";
import { ListStatus } from "@/components/ListStatus";
import { useT } from "@/components/LocaleProvider";
import { useToast } from "@/components/Toast";
import { Button, PageHeader } from "@/components/ui";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";

export default function TeamPage() {
  const t = useT();
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [invites, setInvites] = useState<CompanyInvite[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadErr(null);
    try {
      const sb = getBrowserSupabase();
      const m = await getCachedMembership(sb);
      setIsOwner(m?.role === "owner");
      setCompanyId(m?.companyId ?? null);
      if (m?.role === "owner") {
        const [mem, inv] = await Promise.all([
          listCompanyMembers(sb),
          listInvites(sb, m.companyId),
        ]);
        setMembers(mem);
        setInvites(inv.filter((i) => isInvitePending(i)));
      }
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : t("team.loadError"));
    } finally {
      setLoaded(true);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div style={{ maxWidth: 820 }}>
      <PageHeader title={t("team.title")} subtitle={t("team.subtitle")} />

      {loaded && !isOwner && (
        <p style={{ color: palette.smoke, marginTop: 16 }}>{t("team.onlyOwner")}</p>
      )}

      {isOwner && companyId && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20 }}>
          <ListStatus
            loading={!loaded}
            error={loadErr}
            empty={members.length === 0}
            emptyText={t("team.empty")}
            onRetry={load}
          />
          {members.map((m) => (
            <MemberRow key={m.user_id} member={m} companyId={companyId} onSaved={load} />
          ))}

          {invites.length > 0 && <InvitesSection invites={invites} onChanged={load} />}
        </div>
      )}
    </div>
  );
}

function roleLabelKey(role: Role): "team.roleDispatcher" | "team.roleDriver" {
  return role === "dispatcher" ? "team.roleDispatcher" : "team.roleDriver";
}

function MemberRow({
  member,
  companyId,
  onSaved,
}: {
  member: CompanyMember;
  companyId: string;
  onSaved: () => void;
}) {
  const t = useT();
  const isOwnerRow = member.role === "owner";
  const isDisabled = member.status === "disabled";
  const [role, setRole] = useState<string>(member.role);
  // #276: matryca uprawnień — poziom per moduł (klik cyklicznie brak→podgląd→edycja).
  const [perms, setPerms] = useState<MemberPermissions>(() => {
    const init: MemberPermissions = {};
    for (const mod of APP_MODULES) {
      init[mod] = effectivePermission(member.role, member.modules, member.permissions, mod);
    }
    return init;
  });
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const NEXT: Record<PermissionLevel, PermissionLevel> = {
    none: "view",
    view: "edit",
    edit: "none",
  };
  const LEVEL_ICON: Record<PermissionLevel, string> = { none: "🚫", view: "👁", edit: "✏️" };

  function cycle(mod: AppModule) {
    setPerms((p) => ({ ...p, [mod]: NEXT[p[mod] ?? "none"] }));
  }

  async function save() {
    setBusy(true);
    try {
      await updateMember(getBrowserSupabase(), companyId, member.user_id, {
        role: role as CompanyMember["role"],
        // modules = kompatybilność wstecz (widoczność ≥ podgląd); permissions = pełna matryca.
        modules: APP_MODULES.filter((m) => (perms[m] ?? "none") !== "none"),
        permissions: perms,
      });
      toast(t("team.saved"), "success");
      onSaved();
    } catch (e) {
      toast(e instanceof Error ? e.message : t("team.saveError"), "error");
    } finally {
      setBusy(false);
    }
  }

  // #365 (audyt · #1): zawieś/przywróć dostęp członka (odcięcie byłego pracownika).
  async function toggleAccess() {
    const next = isDisabled ? "active" : "disabled";
    const question = isDisabled ? t("team.reactivateConfirm") : t("team.suspendConfirm");
    if (!window.confirm(`${question}\n\n${member.email}`)) return;
    setBusy(true);
    try {
      await setMemberStatus(getBrowserSupabase(), member.user_id, next);
      toast(isDisabled ? t("team.reactivateDone") : t("team.suspendDone"), "success");
      onSaved();
    } catch (e) {
      toast(e instanceof Error ? e.message : t("team.saveError"), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ ...f.card, padding: 16, opacity: isDisabled ? 0.62 : 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <strong style={{ minWidth: 200 }}>{member.email}</strong>
        {isOwnerRow ? (
          <span style={styles.ownerTag}>{t("team.ownerFull")}</span>
        ) : (
          <>
            <select
              style={styles.select}
              value={role}
              disabled={isDisabled}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="dispatcher">{t("team.roleDispatcher")}</option>
              <option value="driver">{t("team.roleDriver")}</option>
            </select>
            {isDisabled && <span style={styles.suspendedTag}>{t("team.suspendedTag")}</span>}
          </>
        )}
      </div>

      {!isOwnerRow && !isDisabled && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
          {APP_MODULES.map((mod) => {
            const lvl = perms[mod] ?? "none";
            return (
              <button
                key={mod}
                type="button"
                onClick={() => cycle(mod)}
                title={t("team.permHint")}
                style={{
                  ...styles.chip,
                  ...(lvl === "edit" ? styles.chipOn : lvl === "view" ? styles.chipView : {}),
                }}
              >
                {LEVEL_ICON[lvl]} {APP_MODULE_LABELS[mod]}
              </button>
            );
          })}
        </div>
      )}

      {!isOwnerRow && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
          {!isDisabled && (
            <Button onClick={save} disabled={busy}>
              {t("common.save")}
            </Button>
          )}
          <button type="button" onClick={toggleAccess} disabled={busy} style={styles.accessBtn}>
            {isDisabled ? `↩ ${t("team.reactivate")}` : `⛔ ${t("team.suspend")}`}
          </button>
        </div>
      )}
    </div>
  );
}

function InvitesSection({
  invites,
  onChanged,
}: {
  invites: CompanyInvite[];
  onChanged: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function revoke(inv: CompanyInvite) {
    if (
      !window.confirm(`${t("team.inviteRevokeConfirm")}\n\n${inv.email ?? t("team.inviteNoEmail")}`)
    )
      return;
    setBusyId(inv.id);
    try {
      await revokeInvite(getBrowserSupabase(), inv.id);
      toast(t("team.inviteRevoked"), "success");
      onChanged();
    } catch (e) {
      toast(e instanceof Error ? e.message : t("team.saveError"), "error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div style={{ marginTop: 20 }}>
      <h3 style={{ margin: "0 0 10px", fontSize: 16 }}>
        {t("team.invitesTitle")} ({invites.length})
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {invites.map((inv) => (
          <div
            key={inv.id}
            style={{
              ...f.card,
              padding: 14,
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <span style={{ minWidth: 200 }}>{inv.email ?? t("team.inviteNoEmail")}</span>
            <span style={styles.suspendedTag}>{t(roleLabelKey(inv.role))}</span>
            {inv.expires_at && (
              <span style={{ color: palette.smoke, fontSize: 12.5 }}>
                {t("team.inviteExpires")} {new Date(inv.expires_at).toLocaleDateString()}
              </span>
            )}
            <button
              type="button"
              onClick={() => revoke(inv)}
              disabled={busyId === inv.id}
              style={{ ...styles.accessBtn, marginLeft: "auto" }}
            >
              {t("team.inviteRevoke")}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  select: {
    background: palette.black,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
    padding: "8px 10px",
    color: palette.offWhite,
  },
  ownerTag: { color: "#22c55e", fontSize: 13 },
  suspendedTag: {
    color: "#f59e0b",
    fontSize: 12,
    border: "1px solid #f59e0b",
    borderRadius: 999,
    padding: "2px 10px",
  },
  accessBtn: {
    background: "transparent",
    color: palette.smoke,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
    padding: "8px 14px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  chip: {
    background: palette.black,
    color: palette.offWhite,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 999,
    padding: "5px 12px",
    cursor: "pointer",
    fontSize: 13,
  },
  chipOn: { background: palette.red, color: palette.white, borderColor: palette.red },
  chipView: { borderColor: "#eab308", color: "#eab308" },
};
