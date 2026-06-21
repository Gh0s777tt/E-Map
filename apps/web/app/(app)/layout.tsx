export const dynamic = "force-dynamic";

import { getActiveMembership } from "@e-logistic/api";
import { type AppModule, effectiveModules } from "@e-logistic/core";
import { createTranslator, type MessageKey } from "@e-logistic/i18n";
import { palette } from "@e-logistic/ui";
import { redirect } from "next/navigation";
import { ConfirmProvider } from "@/components/ConfirmProvider";
import { HelpCenter } from "@/components/HelpCenter";
import { NotificationBell } from "@/components/NotificationBell";
import { SidebarNav } from "@/components/SidebarNav";
import { SignOutButton } from "@/components/SignOutButton";
import { getServerSupabase } from "@/lib/supabase/server";

const t = createTranslator("pl");

// `mod` = moduł wymagany do pokazania pozycji (null = zawsze widoczna).
const NAV: { href: string; key: MessageKey; mod: AppModule | null }[] = [
  { href: "/dashboard", key: "nav.dashboard", mod: null },
  { href: "/vehicles", key: "nav.vehicles", mod: "vehicles" },
  { href: "/drivers", key: "nav.drivers", mod: "drivers" },
  { href: "/cards", key: "nav.cards", mod: "cards" },
  { href: "/forms/fuel", key: "form.fuel.title", mod: "forms" },
  { href: "/forms/adblue", key: "form.adblue.title", mod: "forms" },
  { href: "/forms/trip", key: "form.trip.title", mod: "forms" },
  { href: "/reports", key: "nav.reports", mod: "reports" },
  { href: "/map", key: "nav.map", mod: "map" },
  { href: "/stats", key: "nav.stats", mod: "stats" },
  { href: "/settlements", key: "nav.settlements", mod: "settlements" },
  { href: "/settings", key: "nav.settings", mod: null },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  let email = "tryb offline";
  let allowed: AppModule[] = ["vehicles", "drivers", "cards", "forms", "reports", "map", "stats"];
  let isOwner = true;

  if (supabaseConfigured) {
    const supabase = await getServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    email = user.email ?? "—";

    // Egzekwowanie 2FA serwerowo: konto z TOTP (nextLevel=aal2), ale sesja aal1 → wymuś krok 2FA.
    // redirect() musi być POZA try (rzuca NEXT_REDIRECT, którego nie wolno połknąć).
    let needsMfa = false;
    try {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      needsMfa = aal?.currentLevel === "aal1" && aal?.nextLevel === "aal2";
    } catch {
      // błąd odczytu AAL — nie blokujemy (unikamy masowego lockoutu)
    }
    if (needsMfa) redirect("/login?mfa=1");

    try {
      const m = await getActiveMembership(supabase);
      if (m) {
        allowed = effectiveModules(m.role, m.modules);
        isOwner = m.role === "owner";
      }
    } catch {
      // brak firmy → domyślne (member zobaczy onboarding na pulpicie)
    }
  }

  const items = NAV.filter((i) => i.mod === null || allowed.includes(i.mod));
  const navItems = [
    ...items.map((i) => ({ href: i.href, label: t(i.key) })),
    { href: "/fuel-prices", label: "Ceny diesla" },
    ...(isOwner ? [{ href: "/team", label: "Zespół" }] : []),
  ];

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 16 }}>
          <span style={{ color: palette.red }}>E</span>-Logistic
        </div>
        <SidebarNav items={navItems} />
        {supabaseConfigured && (
          <div style={{ marginBottom: 8 }}>
            <NotificationBell />
          </div>
        )}
        <div style={{ fontSize: 12, color: palette.smoke, marginBottom: 8 }}>{email}</div>
        <SignOutButton />
      </aside>
      <main className="app-main">
        <ConfirmProvider>{children}</ConfirmProvider>
      </main>
      <HelpCenter />
    </div>
  );
}
