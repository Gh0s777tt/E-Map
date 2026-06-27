import { createTranslator, type MessageKey } from "@e-logistic/i18n";
import { cssPalette as palette } from "@e-logistic/ui";
import Link from "next/link";
import { AttentionPanel } from "@/components/AttentionPanel";
import { CompanyBanner } from "@/components/CompanyBanner";
import { DriverActiveOrder } from "@/components/DriverActiveOrder";
import { KpiStrip } from "@/components/KpiStrip";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";
import { RevenueTrend } from "@/components/RevenueTrend";
import { PrintButton } from "@/components/ui";
import { getLocale } from "@/lib/locale";

const CARDS: { href: string; tagKey: MessageKey; titleKey: MessageKey; descKey: MessageKey }[] = [
  {
    href: "/forms/fuel",
    tagKey: "dashboard.tag.form",
    titleKey: "dashboard.card.fuel.title",
    descKey: "dashboard.card.fuel.desc",
  },
  {
    href: "/forms/adblue",
    tagKey: "dashboard.tag.form",
    titleKey: "dashboard.card.adblue.title",
    descKey: "dashboard.card.adblue.desc",
  },
  {
    href: "/forms/trip",
    tagKey: "dashboard.tag.form",
    titleKey: "dashboard.card.trip.title",
    descKey: "dashboard.card.trip.desc",
  },
  {
    href: "/map",
    tagKey: "dashboard.tag.map",
    titleKey: "dashboard.card.map.title",
    descKey: "dashboard.card.map.desc",
  },
  {
    href: "/stats",
    tagKey: "dashboard.tag.report",
    titleKey: "dashboard.card.stats.title",
    descKey: "dashboard.card.stats.desc",
  },
];

export default async function DashboardPage() {
  const t = createTranslator(await getLocale());
  return (
    <div>
      <div
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}
      >
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>{t("dashboard.title")}</h1>
        <PrintButton />
      </div>
      <p style={{ color: palette.smoke }}>{t("dashboard.subtitle")}</p>

      <CompanyBanner />
      <DriverActiveOrder />
      <KpiStrip />
      <RevenueTrend />
      <OnboardingChecklist />
      <AttentionPanel />

      <div style={{ display: "flex", gap: 16, marginTop: 24, flexWrap: "wrap" }}>
        {CARDS.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="el-card"
            style={{
              display: "block",
              minWidth: 220,
              padding: 20,
              borderRadius: 12,
              background: palette.nearBlack,
              border: `1px solid ${palette.graphite}`,
              color: palette.offWhite,
              textDecoration: "none",
            }}
          >
            <div style={{ color: palette.red, fontSize: 12, letterSpacing: 2 }}>{t(c.tagKey)}</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6 }}>{t(c.titleKey)}</div>
            <div style={{ color: palette.smoke, fontSize: 13, marginTop: 4 }}>{t(c.descKey)}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
