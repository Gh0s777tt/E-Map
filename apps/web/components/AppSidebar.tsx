"use client";

import { cssPalette as palette } from "@e-logistic/ui";
import { useState } from "react";
import { GlobalSearch } from "@/components/GlobalSearch";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { NotificationBell } from "@/components/NotificationBell";
import { type NavGroup, SidebarNav } from "@/components/SidebarNav";
import { SignOutButton } from "@/components/SignOutButton";
import { ThemeToggle } from "@/components/ThemeToggle";

/**
 * Powłoka sidebara z mobilnym drawerem. Desktop (>820px): pełny boczny panel.
 * Mobile (≤820px): kompaktowy pasek z hamburgerem; treść (nawigacja + konto)
 * rozwijana po kliknięciu i zwijana po wyborze pozycji. Czysto CSS + 1 stan.
 */
export function AppSidebar({
  navGroups,
  email,
  supabaseConfigured,
}: {
  navGroups: NavGroup[];
  email: string;
  supabaseConfigured: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <aside className={open ? "app-sidebar open" : "app-sidebar"}>
      <div className="app-sidebar-head">
        <div style={{ fontWeight: 800, fontSize: 20 }}>
          <span style={{ color: palette.red }}>E</span>-Logistic
        </div>
        <span style={{ flex: 1 }} />
        <button
          type="button"
          className="app-burger"
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "✕" : "☰"}
        </button>
      </div>
      <div className="app-sidebar-body">
        {supabaseConfigured && <GlobalSearch navItems={navGroups.flatMap((g) => g.items)} />}
        <SidebarNav groups={navGroups} onNavigate={() => setOpen(false)} />
        {supabaseConfigured && (
          <div style={{ marginBottom: 8 }}>
            <NotificationBell />
          </div>
        )}
        <div style={{ marginBottom: 8 }}>
          <ThemeToggle />
        </div>
        <div style={{ marginBottom: 8 }}>
          <LocaleSwitcher />
        </div>
        <div style={{ fontSize: 12, color: palette.smoke, marginBottom: 8 }}>{email}</div>
        <SignOutButton />
      </div>
    </aside>
  );
}
