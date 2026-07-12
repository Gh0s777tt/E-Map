"use client";

import { cssPalette as palette } from "@e-logistic/ui";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { useT } from "@/components/LocaleProvider";

export interface DashSection {
  id: string;
  label: string;
  /** Sekcja wyrenderowana po stronie serwera (RSC) — klient tylko pokazuje/ukrywa. */
  node: React.ReactNode;
}

const HIDDEN_KEY = "el-dash-hidden";

function readHidden(): string[] {
  try {
    const raw = localStorage.getItem(HIDDEN_KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/**
 * #296: personalizacja pulpitu — „Dostosuj" pokazuje listę sekcji z
 * przełącznikami; odznaczone znikają (zapamiętane per przeglądarka).
 * Sekcje przychodzą wyrenderowane z serwera, więc dane i i18n zostają w RSC.
 */
export function DashboardSections({ sections }: { sections: DashSection[] }) {
  const t = useT();
  const [hidden, setHidden] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  // localStorage dopiero po montażu (SSR nie zna preferencji — bez mismatcha).
  useEffect(() => {
    setHidden(readHidden());
  }, []);

  function toggle(id: string) {
    setHidden((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem(HIDDEN_KEY, JSON.stringify(next));
      } catch {
        // tryb prywatny — preferencja do końca sesji
      }
      return next;
    });
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", position: "relative" }}>
        <button
          type="button"
          style={s.gearBtn}
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          <Icon name="settings" size={14} /> {t("dashboard.customize")}
        </button>
        {open && (
          <div style={s.panel}>
            <div style={s.panelTitle}>{t("dashboard.customize.title")}</div>
            {sections.map((sec) => {
              const on = !hidden.includes(sec.id);
              return (
                <label key={sec.id} style={s.row}>
                  <input type="checkbox" checked={on} onChange={() => toggle(sec.id)} />
                  <span>{sec.label}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>
      {sections
        .filter((sec) => !hidden.includes(sec.id))
        .map((sec) => (
          <div key={sec.id}>{sec.node}</div>
        ))}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  gearBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: "transparent",
    border: `1px solid ${palette.graphite}`,
    color: palette.smoke,
    borderRadius: 999,
    padding: "5px 12px",
    fontSize: 12,
    cursor: "pointer",
  },
  panel: {
    position: "absolute",
    top: "110%",
    right: 0,
    zIndex: 20,
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 12,
    padding: 12,
    minWidth: 220,
    boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  panelTitle: { fontSize: 12, fontWeight: 700, color: palette.smoke, textTransform: "uppercase" },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 14,
    color: palette.offWhite,
    cursor: "pointer",
  },
};
