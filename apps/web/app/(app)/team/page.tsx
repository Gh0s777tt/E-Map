"use client";

import { type CompanyMember, listCompanyMembers, updateMember } from "@e-logistic/api";
import {
  APP_MODULE_LABELS,
  APP_MODULES,
  type AppModule,
  effectivePermission,
  type MemberPermissions,
  type PermissionLevel,
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
      if (m) setMembers(await listCompanyMembers(sb));
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
        </div>
      )}
    </div>
  );
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

  return (
    <div style={{ ...f.card, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <strong style={{ minWidth: 220 }}>{member.email}</strong>
        {isOwnerRow ? (
          <span style={styles.ownerTag}>{t("team.ownerFull")}</span>
        ) : (
          <select style={styles.select} value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="dispatcher">{t("team.roleDispatcher")}</option>
            <option value="driver">{t("team.roleDriver")}</option>
          </select>
        )}
      </div>

      {!isOwnerRow && (
        <>
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
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
            <Button onClick={save} disabled={busy}>
              {t("common.save")}
            </Button>
          </div>
        </>
      )}
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
  primary: {
    background: palette.red,
    color: palette.white,
    border: "none",
    borderRadius: 8,
    padding: "9px 16px",
    fontWeight: 700,
    cursor: "pointer",
  },
};
