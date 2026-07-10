"use client";

import { listCompanyMembers, updateMember } from "@e-logistic/api";
import { APP_MODULES, effectivePermission, type MemberPermissions } from "@e-logistic/core";
import { cssPalette as palette } from "@e-logistic/ui";
import { useEffect, useState } from "react";
import { PermissionsMatrix } from "@/components/PermissionsMatrix";
import { useToast } from "@/components/Toast";
import { Button } from "@/components/ui";
import { getBrowserSupabase } from "@/lib/supabase/client";

/**
 * #278: edycja matrycy uprawnień z profilu kierowcy (konto powiązane po user_id).
 * Samodzielny: pobiera członka, pokazuje matrycę, zapisuje przez updateMember.
 */
export function MemberPermissionsEditor({
  companyId,
  userId,
}: {
  companyId: string;
  userId: string;
}) {
  const toast = useToast();
  const [perms, setPerms] = useState<MemberPermissions | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const members = await listCompanyMembers(getBrowserSupabase());
        const m = members.find((x) => x.user_id === userId);
        if (!m) return;
        setRole(m.role);
        const init: MemberPermissions = {};
        for (const mod of APP_MODULES) {
          init[mod] = effectivePermission(m.role, m.modules, m.permissions, mod);
        }
        setPerms(init);
      } catch {
        // brak roli zarządczej — sekcja się nie pokaże
      }
    })();
  }, [userId]);

  if (!perms || role === "owner") return null;

  async function save() {
    if (!perms) return;
    setBusy(true);
    try {
      await updateMember(getBrowserSupabase(), companyId, userId, {
        modules: APP_MODULES.filter((m) => (perms[m] ?? "none") !== "none"),
        permissions: perms,
      });
      toast("Uprawnienia zapisane.", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Błąd zapisu uprawnień.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={box}>
      <strong style={{ fontSize: 14 }}>🔐 Uprawnienia (konto kierowcy)</strong>
      <p style={{ color: palette.smoke, fontSize: 12, margin: "4px 0 8px" }}>
        Klikaj: 🚫 brak → 👁 podgląd → ✏️ edycja. Działa od razu w aplikacji i panelu.
      </p>
      <PermissionsMatrix value={perms} onChange={setPerms} />
      <div style={{ marginTop: 10 }}>
        <Button onClick={save} disabled={busy}>
          {busy ? "Zapisuję…" : "Zapisz uprawnienia"}
        </Button>
      </div>
    </div>
  );
}

const box: React.CSSProperties = {
  marginTop: 14,
  padding: 14,
  borderRadius: 10,
  border: `1px solid ${palette.graphite}`,
};
