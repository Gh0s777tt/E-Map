"use client";

import {
  APP_MODULE_LABELS,
  APP_MODULES,
  type AppModule,
  type MemberPermissions,
  type PermissionLevel,
} from "@e-logistic/core";
import { cssPalette as palette } from "@e-logistic/ui";

/**
 * #278: wspólna matryca uprawnień (Zespół · profil kierowcy · zaproszenie).
 * Chip klikany cyklicznie: 🚫 brak → 👁 podgląd → ✏️ edycja.
 */
const NEXT: Record<PermissionLevel, PermissionLevel> = { none: "view", view: "edit", edit: "none" };
const ICON: Record<PermissionLevel, string> = { none: "🚫", view: "👁", edit: "✏️" };

export function PermissionsMatrix({
  value,
  onChange,
}: {
  value: MemberPermissions;
  onChange: (next: MemberPermissions) => void;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {APP_MODULES.map((mod: AppModule) => {
        const lvl: PermissionLevel = value[mod] ?? "none";
        return (
          <button
            key={mod}
            type="button"
            title="Klikaj: brak → podgląd → edycja"
            onClick={() => onChange({ ...value, [mod]: NEXT[lvl] })}
            style={{
              ...chip,
              ...(lvl === "edit" ? chipEdit : lvl === "view" ? chipView : {}),
            }}
          >
            {ICON[lvl]} {APP_MODULE_LABELS[mod]}
          </button>
        );
      })}
    </div>
  );
}

const chip: React.CSSProperties = {
  background: "transparent",
  border: `1px solid ${palette.graphite}`,
  borderRadius: 999,
  padding: "6px 12px",
  color: palette.smoke,
  cursor: "pointer",
  fontSize: 13,
};
const chipEdit: React.CSSProperties = { borderColor: palette.red, color: palette.offWhite };
const chipView: React.CSSProperties = { borderColor: "#eab308", color: "#eab308" };
