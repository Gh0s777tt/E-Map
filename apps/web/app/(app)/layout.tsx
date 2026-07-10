export const dynamic = "force-dynamic";

import { getActiveMembership } from "@e-logistic/api";
import { type AppModule, visibleModules } from "@e-logistic/core";
import { createTranslator } from "@e-logistic/i18n";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";
import { ConfirmProvider } from "@/components/ConfirmProvider";
import { HelpCenter } from "@/components/HelpCenter";
import { LocaleProvider } from "@/components/LocaleProvider";
import type { NavGroup } from "@/components/SidebarNav";
import { ToastProvider } from "@/components/Toast";
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
  let isDeveloper = false; // rola developer — diagnostyka platformy (panel /dev)
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
        allowed = visibleModules(m.role, m.modules, m.permissions);
        isOwner = m.role === "owner";
        isDeveloper = m.role === "developer";
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
        ...(manage ? [{ href: "/damages", label: t("nav.damages") }] : []),
        ...(manage ? [{ href: "/koszty", label: t("nav.costs") }] : []),
        ...(has("documents") ? [{ href: "/documents", label: t("nav.documents") }] : []),
        ...(has("reports") ? [{ href: "/reports", label: t("nav.reports") }] : []),
        ...(has("checklists") ? [{ href: "/checklists", label: t("nav.checklists") }] : []),
      ],
    },
    {
      title: t("nav.group.finance"),
      items: [
        ...(manage ? [{ href: "/invoices", label: t("nav.invoices") }] : []),
        ...(manage ? [{ href: "/contractors", label: t("nav.contractors") }] : []),
        ...(has("settlements") ? [{ href: "/settlements", label: t("nav.settlements") }] : []),
        ...(has("settlements") ? [{ href: "/monthly", label: t("nav.monthly") }] : []),
        ...(manage ? [{ href: "/per-diem", label: t("nav.perDiem") }] : []),
        ...(manage ? [{ href: "/work-time", label: t("nav.workTime") }] : []),
        ...(manage ? [{ href: "/payouts", label: t("nav.payouts") }] : []),
        { href: "/fuel-prices", label: t("nav.fuelPrices") },
        ...(has("stats") ? [{ href: "/stats", label: t("nav.stats") }] : []),
        ...(has("stats") ? [{ href: "/wyjazdy", label: t("nav.journeys") }] : []),
      ],
    },
    {
      title: null,
      items: [
        { href: "/settings", label: t("nav.settings") },
        ...(isOwner ? [{ href: "/team", label: t("nav.team") }] : []),
        ...(isOwner ? [{ href: "/audit", label: t("nav.audit") }] : []),
        ...(isDeveloper ? [{ href: "/dev", label: t("nav.dev") }] : []),
      ],
    },
  ].filter((g) => g.items.length > 0);

  return (
    <LocaleProvider locale={locale}>
      <div className="app-shell">
        <AppSidebar navGroups={navGroups} email={email} supabaseConfigured={supabaseConfigured} />
        <main className="app-main">
          <ToastProvider>
            <ConfirmProvider>{children}</ConfirmProvider>
          </ToastProvider>
        </main>
        <HelpCenter />
      </div>
    </LocaleProvider>
  );
}
