"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  href: string;
  label: string;
}

/** Nawigacja boczna z podświetleniem aktywnej pozycji (klient — zna bieżącą ścieżkę). */
export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="app-nav">
      {items.map((i) => {
        const active =
          pathname === i.href ||
          (i.href !== "/dashboard" && (pathname?.startsWith(i.href) ?? false));
        return (
          <Link
            key={i.href}
            href={i.href}
            className={active ? "app-navlink app-navlink-active" : "app-navlink"}
            aria-current={active ? "page" : undefined}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
