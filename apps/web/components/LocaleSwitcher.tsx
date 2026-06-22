"use client";

import { LOCALES, type Locale } from "@e-logistic/i18n";
import { palette } from "@e-logistic/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const LABEL: Record<Locale, string> = { pl: "PL", en: "EN" };
const COOKIE = "locale";

function readCookie(): Locale {
  if (typeof document === "undefined") return "pl";
  const m = document.cookie.match(/(?:^|; )locale=([^;]+)/);
  const v = m?.[1] ?? "";
  return (LOCALES as readonly string[]).includes(v) ? (v as Locale) : "pl";
}

/**
 * Przełącznik języka (PL/EN). Zapisuje wybór w ciasteczku i odświeża trasę
 * (`router.refresh`), dzięki czemu komponenty serwerowe (m.in. nawigacja)
 * przeładowują się w nowym języku bez pełnego reloadu.
 */
export function LocaleSwitcher() {
  const router = useRouter();
  const [active, setActive] = useState<Locale>("pl");

  // Highlight wg ciasteczka po stronie klienta (unik niezgodności hydratacji).
  useEffect(() => setActive(readCookie()), []);

  function pick(l: Locale) {
    document.cookie = `${COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    setActive(l);
    router.refresh();
  }

  return (
    <div style={{ display: "flex", gap: 6 }}>
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => pick(l)}
          aria-pressed={active === l}
          style={{
            flex: 1,
            padding: "6px 0",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            background: active === l ? palette.red : "transparent",
            color: active === l ? palette.white : palette.smoke,
            border: `1px solid ${active === l ? palette.red : palette.graphite}`,
          }}
        >
          {LABEL[l]}
        </button>
      ))}
    </div>
  );
}
