"use client";

import { cssPalette as palette } from "@e-logistic/ui";
import { useRouter } from "next/navigation";
import { useT } from "@/components/LocaleProvider";
import { getBrowserSupabase } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const t = useT();

  async function signOut() {
    await getBrowserSupabase().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      style={{
        background: "transparent",
        color: palette.smoke,
        border: `1px solid ${palette.graphite}`,
        borderRadius: 8,
        padding: "8px 12px",
        cursor: "pointer",
      }}
    >
      {t("auth.signOut")}
    </button>
  );
}
