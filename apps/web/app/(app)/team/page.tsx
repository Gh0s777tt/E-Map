"use client";

import {
  type CompanyMember,
  getActiveMembership,
  listCompanyMembers,
  updateMember,
} from "@e-logistic/api";
import { APP_MODULE_LABELS, APP_MODULES, type AppModule, effectiveModules } from "@e-logistic/core";
import { palette } from "@e-logistic/ui";
import { useCallback, useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";

export default function TeamPage() {
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const sb = getBrowserSupabase();
      const m = await getActiveMembership(sb);
      setIsOwner(m?.role === "owner");
      setCompanyId(m?.companyId ?? null);
      if (m) setMembers(await listCompanyMembers(sb));
    } catch {
      setMembers([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div style={{ maxWidth: 820 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Zespół i uprawnienia</h1>
      <p style={{ color: palette.smoke, marginTop: 4 }}>
        Nadawaj rolę i moduły. Spedytor ma pełny wgląd w dane firmy; kierowca widzi tylko swoje auto
        i formularze. Moduły decydują, które panele widzi dana osoba.
      </p>

      {loaded && !isOwner && (
        <p style={{ color: palette.smoke, marginTop: 16 }}>
          Tylko właściciel może zarządzać zespołem.
        </p>
      )}

      {isOwner && companyId && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20 }}>
          {members.map((m) => (
            <MemberRow key={m.user_id} member={m} companyId={companyId} onSaved={load} />
          ))}
          {members.length === 0 && <p style={{ color: palette.smoke }}>Brak członków.</p>}
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
  const isOwnerRow = member.role === "owner";
  const [role, setRole] = useState<string>(member.role);
  const [mods, setMods] = useState<AppModule[]>(effectiveModules(member.role, member.modules));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function toggle(mod: AppModule) {
    setMods((a) => (a.includes(mod) ? a.filter((x) => x !== mod) : [...a, mod]));
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      await updateMember(getBrowserSupabase(), companyId, member.user_id, {
        role: role as CompanyMember["role"],
        modules: mods,
      });
      setMsg("✅ Zapisano.");
      onSaved();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Błąd zapisu.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={styles.card}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <strong style={{ minWidth: 220 }}>{member.email}</strong>
        {isOwnerRow ? (
          <span style={styles.ownerTag}>Właściciel — pełny dostęp</span>
        ) : (
          <select style={styles.select} value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="dispatcher">Spedytor / Manager (pełny wgląd)</option>
            <option value="driver">Kierowca (tylko swoje)</option>
          </select>
        )}
      </div>

      {!isOwnerRow && (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            {APP_MODULES.map((mod) => (
              <button
                key={mod}
                type="button"
                onClick={() => toggle(mod)}
                style={{ ...styles.chip, ...(mods.includes(mod) ? styles.chipOn : {}) }}
              >
                {APP_MODULE_LABELS[mod]}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
            <button type="button" style={styles.primary} onClick={save} disabled={busy}>
              Zapisz
            </button>
            {msg && <span style={{ color: palette.smoke, fontSize: 13 }}>{msg}</span>}
          </div>
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    padding: 16,
    borderRadius: 12,
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
  },
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
