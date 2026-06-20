"use client";

import { createTranslator } from "@e-logistic/i18n";
import { palette } from "@e-logistic/ui";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase/client";

const t = createTranslator("pl");

export function SignOutButton() {
  const router = useRouter();

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
