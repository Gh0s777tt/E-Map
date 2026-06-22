"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export interface NavItem {
  href: string;
  label: string;
}

/** Sekcja nawigacji. `title === null` → pozycje bez nagłówka (zawsze widoczne). */
export interface NavGroup {
  title: string | null;
  items: NavItem[];
}

function isActive(pathname: string | null, href: string): boolean {
  return pathname === href || (href !== "/dashboard" && (pathname?.startsWith(href) ?? false));
}

/**
 * Nawigacja boczna w zwijanych sekcjach — kompaktowa. Sekcja z aktywną stroną
 * jest domyślnie rozwinięta; pozostałe zwinięte. Pozycje bez nagłówka (np. Pulpit,
 * Ustawienia) renderują się jako zwykłe linki.
 */
export function SidebarNav({
  groups,
  onNavigate,
}: {
  groups: NavGroup[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState<Set<string>>(() => {
    const s = new Set<string>();
    for (const g of groups) {
      if (g.title && g.items.some((i) => isActive(pathname, i.href))) s.add(g.title);
    }
    return s;
  });

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
    return (
      <Link
        key={i.href}
        href={i.href}
        className={active ? "app-navlink app-navlink-active" : "app-navlink"}
        aria-current={active ? "page" : undefined}
        onClick={onNavigate}
      >
        {i.label}
      </Link>
    );
  }

  return (
    <nav className="app-nav">
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
