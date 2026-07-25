"use client";

import { cssPalette as palette } from "@e-logistic/ui";
import { useRouter } from "next/navigation";
import { useT } from "@/components/LocaleProvider";
import { resetChatUnread } from "@/lib/chatUnread";
import { getBrowserSupabase } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const t = useT();

  async function signOut() {
    await getBrowserSupabase().auth.signOut();
    // #369: `router.push` to miękka nawigacja SPA — stan modułowy przeżywa
    // wylogowanie. Bez tego resetu badge czatu pokazywał po przelogowaniu
    // liczniki POPRZEDNIEJ firmy (i trzymał jej subskrypcję realtime).
    resetChatUnread();
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
