export const dynamic = "force-dynamic";

import { getActiveMembership } from "@e-logistic/api";
import { type AppModule, effectiveModules } from "@e-logistic/core";
import { createTranslator, type MessageKey } from "@e-logistic/i18n";
import { palette } from "@e-logistic/ui";
import Link from "next/link";
import { redirect } from "next/navigation";
import { HelpCenter } from "@/components/HelpCenter";
import { NotificationBell } from "@/components/NotificationBell";
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
  { href: "/settlements", key: "nav.settlements", mod: "stats" },
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

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        style={{
          width: 240,
          background: palette.nearBlack,
          borderRight: `1px solid ${palette.graphite}`,
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 16 }}>
          <span style={{ color: palette.red }}>E</span>-Logistic
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                color: palette.offWhite,
                textDecoration: "none",
                padding: "9px 12px",
                borderRadius: 8,
              }}
            >
              {t(item.key)}
            </Link>
          ))}
          {isOwner && (
            <Link
              href="/team"
              style={{
                color: palette.offWhite,
                textDecoration: "none",
                padding: "9px 12px",
                borderRadius: 8,
              }}
            >
              Zespół
            </Link>
          )}
        </nav>
        {supabaseConfigured && (
          <div style={{ marginBottom: 8 }}>
            <NotificationBell />
          </div>
        )}
        <div style={{ fontSize: 12, color: palette.smoke, marginBottom: 8 }}>{email}</div>
        <SignOutButton />
      </aside>
      <main style={{ flex: 1, padding: 32 }}>{children}</main>
      <HelpCenter />
    </div>
  );
}
