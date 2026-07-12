"use client";

import type { IconName } from "@e-logistic/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { useT } from "@/components/LocaleProvider";

export interface NavItem {
  href: string;
  label: string;
  icon?: IconName;
}

/** Sekcja nawigacji. `title === null` → pozycje bez nagłówka (zawsze widoczne). */
export interface NavGroup {
  title: string | null;
  items: NavItem[];
}

const PINS_KEY = "el-nav-pins";

function isActive(pathname: string | null, href: string): boolean {
  return pathname === href || (href !== "/dashboard" && (pathname?.startsWith(href) ?? false));
}

function readPins(): string[] {
  try {
    const raw = localStorage.getItem(PINS_KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Nawigacja boczna w zwijanych sekcjach — kompaktowa, z ikonami SVG (#294).
 * Sekcja z aktywną stroną jest domyślnie rozwinięta; pozostałe zwinięte.
 * Pinezka przy pozycji (widoczna po najechaniu) przypina ją do sekcji
 * „Ulubione" na górze — zapamiętywane per przeglądarka (localStorage).
 */
export function SidebarNav({
  groups,
  onNavigate,
}: {
  groups: NavGroup[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const t = useT();
  const [open, setOpen] = useState<Set<string>>(() => {
    const s = new Set<string>();
    for (const g of groups) {
      if (g.title && g.items.some((i) => isActive(pathname, i.href))) s.add(g.title);
    }
    return s;
  });
  // Piny czytamy po montażu (localStorage niedostępny w SSR — unikamy hydration mismatch).
  const [pins, setPins] = useState<string[]>([]);
  useEffect(() => {
    setPins(readPins());
  }, []);

  function togglePin(href: string) {
    setPins((prev) => {
      const next = prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href];
      try {
        localStorage.setItem(PINS_KEY, JSON.stringify(next));
      } catch {
        // brak localStorage (tryb prywatny) — pin działa do odświeżenia
      }
      return next;
    });
  }

  function toggle(title: string) {
    setOpen((prev) => {
      const n = new Set(prev);
      if (n.has(title)) n.delete(title);
      else n.add(title);
      return n;
    });
  }

  function renderLink(i: NavItem) {
    const active = isActive(pathname, i.href);
    const pinned = pins.includes(i.href);
    return (
      <div key={i.href} className="app-navrow">
        <Link
          href={i.href}
          className={active ? "app-navlink app-navlink-active" : "app-navlink"}
          aria-current={active ? "page" : undefined}
          onClick={onNavigate}
        >
          {i.icon && <Icon name={i.icon} size={16} strokeWidth={1.8} />}
          <span className="app-navlabel">{i.label}</span>
        </Link>
        <button
          type="button"
          className={pinned ? "app-navpin app-navpin-on" : "app-navpin"}
          aria-label={pinned ? t("nav.unpin") : t("nav.pin")}
          title={pinned ? t("nav.unpin") : t("nav.pin")}
          onClick={() => togglePin(i.href)}
        >
          <Icon name="pin" size={13} strokeWidth={2} />
        </button>
      </div>
    );
  }

  const allItems = groups.flatMap((g) => g.items);
  const pinnedItems = pins
    .map((href) => allItems.find((i) => i.href === href))
    .filter((i): i is NavItem => Boolean(i));

  return (
    <nav className="app-nav">
      {pinnedItems.length > 0 && (
        <div className="app-navgroup">
          <div className="app-navgroup-head" style={{ cursor: "default" }}>
            <span>★ {t("nav.group.pinned")}</span>
          </div>
          <div className="app-navgroup-items">{pinnedItems.map(renderLink)}</div>
        </div>
      )}
      {groups.map((g) => {
        if (!g.title) return g.items.map(renderLink);
        const isOpen = open.has(g.title);
        const hasActive = g.items.some((i) => isActive(pathname, i.href));
        return (
          <div key={g.title} className="app-navgroup">
            <button
              type="button"
              className={
                hasActive ? "app-navgroup-head app-navgroup-head-active" : "app-navgroup-head"
              }
              aria-expanded={isOpen}
              onClick={() => toggle(g.title as string)}
            >
              <span>{g.title}</span>
              <span className="app-navgroup-caret">{isOpen ? "▾" : "▸"}</span>
            </button>
            {isOpen && <div className="app-navgroup-items">{g.items.map(renderLink)}</div>}
          </div>
        );
      })}
    </nav>
  );
}
