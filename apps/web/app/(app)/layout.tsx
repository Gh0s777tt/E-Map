export const dynamic = "force-dynamic";

import { createTranslator } from "@e-logistic/i18n";
import { palette } from "@e-logistic/ui";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/SignOutButton";
import { getServerSupabase } from "@/lib/supabase/server";

const t = createTranslator("pl");

const NAV = [
  { href: "/dashboard", key: "nav.dashboard" },
  { href: "/forms/fuel", key: "form.fuel.title" },
] as const;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

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
          {NAV.map((item) => (
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
        </nav>
        <div style={{ fontSize: 12, color: palette.smoke, marginBottom: 8 }}>{user.email}</div>
        <SignOutButton />
      </aside>
      <main style={{ flex: 1, padding: 32 }}>{children}</main>
    </div>
  );
}
