export const dynamic = "force-dynamic";

import { getActiveMembership } from "@e-logistic/api";
import { type AppModule, effectiveModules } from "@e-logistic/core";
import { createTranslator } from "@e-logistic/i18n";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";
import { ConfirmProvider } from "@/components/ConfirmProvider";
import { HelpCenter } from "@/components/HelpCenter";
import { LocaleProvider } from "@/components/LocaleProvider";
import type { NavGroup } from "@/components/SidebarNav";
import { getLocale } from "@/lib/locale";
import { getServerSupabase } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const t = createTranslator(locale);
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  let email = "tryb offline";
  let allowed: AppModule[] = ["vehicles", "drivers", "cards", "forms", "reports", "map", "stats"];
  let isOwner = true;
  let manage = true; // owner/dispatcher — narzędzia zarządcze (zlecenia, faktury, serwis…)

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
        manage = m.role === "owner" || m.role === "dispatcher";
      }
    } catch {
      // brak firmy → domyślne (member zobaczy onboarding na pulpicie)
    }
  }

  // Nawigacja zgrupowana w zwijane sekcje (kompaktowy pasek). `has` = dostęp do modułu.
  const has = (mod: AppModule) => allowed.includes(mod);
  const navGroups: NavGroup[] = [
    { title: null, items: [{ href: "/dashboard", label: t("nav.dashboard") }] },
    {
      title: t("nav.group.orders"),
      items: [
        ...(manage ? [{ href: "/orders", label: t("nav.orders") }] : []),
        ...(manage ? [{ href: "/fleet-status", label: t("nav.fleetStatus") }] : []),
        { href: "/my-orders", label: t("nav.myOrders") },
        ...(has("map") ? [{ href: "/map", label: t("nav.map") }] : []),
      ],
    },
    ...(has("forms")
      ? [
          {
            title: t("nav.group.forms"),
            items: [
              { href: "/forms/fuel", label: t("form.fuel.title") },
              { href: "/forms/adblue", label: t("form.adblue.title") },
              { href: "/forms/trip", label: t("form.trip.title") },
            ],
          },
        ]
      : []),
    {
      title: t("nav.group.fleet"),
      items: [
        ...(has("vehicles") ? [{ href: "/vehicles", label: t("nav.vehicles") }] : []),
        ...(has("drivers") ? [{ href: "/drivers", label: t("nav.drivers") }] : []),
        ...(has("cards") ? [{ href: "/cards", label: t("nav.cards") }] : []),
        ...(manage ? [{ href: "/service", label: t("nav.service") }] : []),
        { href: "/documents", label: t("nav.documents") },
        ...(has("reports") ? [{ href: "/reports", label: t("nav.reports") }] : []),
      ],
    },
    {
      title: t("nav.group.finance"),
      items: [
        ...(manage ? [{ href: "/invoices", label: t("nav.invoices") }] : []),
        ...(manage ? [{ href: "/contractors", label: t("nav.contractors") }] : []),
        ...(has("settlements") ? [{ href: "/settlements", label: t("nav.settlements") }] : []),
        ...(has("settlements") ? [{ href: "/monthly", label: t("nav.monthly") }] : []),
        ...(manage ? [{ href: "/diety", label: t("nav.perDiem") }] : []),
        ...(manage ? [{ href: "/czas-pracy", label: t("nav.workTime") }] : []),
        ...(manage ? [{ href: "/wyplaty", label: t("nav.payouts") }] : []),
        { href: "/fuel-prices", label: t("nav.fuelPrices") },
        ...(has("stats") ? [{ href: "/stats", label: t("nav.stats") }] : []),
      ],
    },
    {
      title: null,
      items: [
        { href: "/settings", label: t("nav.settings") },
        ...(isOwner ? [{ href: "/team", label: t("nav.team") }] : []),
      ],
    },
  ].filter((g) => g.items.length > 0);

  return (
    <LocaleProvider locale={locale}>
      <div className="app-shell">
        <AppSidebar navGroups={navGroups} email={email} supabaseConfigured={supabaseConfigured} />
        <main className="app-main">
          <ConfirmProvider>{children}</ConfirmProvider>
        </main>
        <HelpCenter />
      </div>
    </LocaleProvider>
  );
}
