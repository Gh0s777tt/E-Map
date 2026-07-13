export const dynamic = "force-dynamic";

import { getActiveMembership } from "@e-logistic/api";
import { type AppModule, visibleModules } from "@e-logistic/core";
import { createTranslator } from "@e-logistic/i18n";
import type { IconName } from "@e-logistic/ui";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";
import { ConfirmProvider } from "@/components/ConfirmProvider";
import { HelpCenter } from "@/components/HelpCenter";
import { LocaleProvider } from "@/components/LocaleProvider";
import { QueryProvider } from "@/components/QueryProvider";
import type { NavGroup, NavItem } from "@/components/SidebarNav";
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
  // #294: każda pozycja ma ikonę SVG ze wspólnego zestawu @e-logistic/ui.
  const has = (mod: AppModule) => allowed.includes(mod);
  const item = (href: string, label: string, icon: IconName): NavItem => ({ href, label, icon });
  const allGroups: NavGroup[] = [
    { title: null, items: [item("/dashboard", t("nav.dashboard"), "home")] },
    {
      title: t("nav.group.orders"),
      items: [
        ...(manage ? [item("/orders", t("nav.orders"), "package")] : []),
        ...(manage ? [item("/fleet-status", t("nav.fleetStatus"), "gauge")] : []),
        item("/my-orders", t("nav.myOrders"), "clipboard"),
        ...(has("map") ? [item("/map", t("nav.map"), "map")] : []),
      ],
    },
    ...(has("forms")
      ? [
          {
            title: t("nav.group.forms"),
            items: [
              item("/forms/fuel", t("form.fuel.title"), "fuel"),
              item("/forms/adblue", t("form.adblue.title"), "droplet"),
              item("/forms/trip", t("form.trip.title"), "route"),
            ],
          },
        ]
      : []),
    {
      title: t("nav.group.fleet"),
      items: [
        ...(has("vehicles") ? [item("/vehicles", t("nav.vehicles"), "truck")] : []),
        ...(has("drivers") ? [item("/drivers", t("nav.drivers"), "users")] : []),
        ...(has("cards") ? [item("/cards", t("nav.cards"), "creditCard")] : []),
        ...(manage ? [item("/service", t("nav.service"), "wrench")] : []),
        ...(manage ? [item("/schedule", t("nav.schedule"), "calendar")] : []),
        ...(manage ? [item("/scoring", t("nav.scoring"), "star")] : []),
        ...(manage ? [item("/damages", t("nav.damages"), "alert")] : []),
        ...(manage ? [item("/koszty", t("nav.costs"), "banknote")] : []),
        ...(has("documents") ? [item("/documents", t("nav.documents"), "folder")] : []),
        ...(has("reports") ? [item("/reports", t("nav.reports"), "fileText")] : []),
        ...(has("checklists") ? [item("/checklists", t("nav.checklists"), "clipboard")] : []),
        item("/tacho", t("nav.tacho"), "clock"),
      ],
    },
    {
      title: t("nav.group.finance"),
      items: [
        ...(manage ? [item("/analytics", t("nav.analytics"), "chart")] : []),
        ...(manage ? [item("/invoices", t("nav.invoices"), "fileText")] : []),
        ...(manage ? [item("/contractors", t("nav.contractors"), "building")] : []),
        ...(has("settlements") ? [item("/settlements", t("nav.settlements"), "banknote")] : []),
        ...(has("settlements") ? [item("/monthly", t("nav.monthly"), "calendar")] : []),
        item("/chat", t("nav.chat"), "chat"),
        item("/expenses", t("nav.expenses"), "receipt"),
        ...(manage ? [item("/per-diem", t("nav.perDiem"), "wallet")] : []),
        ...(manage ? [item("/payouts", t("nav.payouts"), "banknote")] : []),
        item("/fuel-prices", t("nav.fuelPrices"), "globe"),
        ...(has("stats") ? [item("/stats", t("nav.stats"), "chart")] : []),
        ...(has("stats") ? [item("/wyjazdy", t("nav.journeys"), "navigation")] : []),
      ],
    },
    {
      title: null,
      items: [
        item("/settings", t("nav.settings"), "settings"),
        ...(isOwner ? [item("/team", t("nav.team"), "users")] : []),
        ...(isOwner ? [item("/audit", t("nav.audit"), "shield")] : []),
        ...(isDeveloper ? [item("/dev", t("nav.dev"), "terminal")] : []),
      ],
    },
  ];
  const navGroups = allGroups.filter((g) => g.items.length > 0);

  return (
    <LocaleProvider locale={locale}>
      <div className="app-shell">
        <AppSidebar navGroups={navGroups} email={email} supabaseConfigured={supabaseConfigured} />
        <main className="app-main">
          <QueryProvider>
            <ToastProvider>
              <ConfirmProvider>{children}</ConfirmProvider>
            </ToastProvider>
          </QueryProvider>
        </main>
        <HelpCenter />
      </div>
    </LocaleProvider>
  );
}
