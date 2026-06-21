"use client";

import { palette } from "@e-logistic/ui";
import { useState } from "react";
import { NotificationBell } from "@/components/NotificationBell";
import { type NavItem, SidebarNav } from "@/components/SidebarNav";
import { SignOutButton } from "@/components/SignOutButton";

/**
 * Powłoka sidebara z mobilnym drawerem. Desktop (>820px): pełny boczny panel.
 * Mobile (≤820px): kompaktowy pasek z hamburgerem; treść (nawigacja + konto)
 * rozwijana po kliknięciu i zwijana po wyborze pozycji. Czysto CSS + 1 stan.
 */
export function AppSidebar({
  navItems,
  email,
  supabaseConfigured,
}: {
  navItems: NavItem[];
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
        <SidebarNav items={navItems} onNavigate={() => setOpen(false)} />
        {supabaseConfigured && (
          <div style={{ marginBottom: 8 }}>
            <NotificationBell />
          </div>
        )}
        <div style={{ fontSize: 12, color: palette.smoke, marginBottom: 8 }}>{email}</div>
        <SignOutButton />
      </div>
    </aside>
  );
}
