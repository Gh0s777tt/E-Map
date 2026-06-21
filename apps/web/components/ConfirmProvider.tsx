"use client";

import { palette } from "@e-logistic/ui";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

type ConfirmFn = (
  message: string,
  opts?: { confirmLabel?: string; danger?: boolean },
) => Promise<boolean>;
type Req = {
  message: string;
  confirmLabel: string;
  danger: boolean;
  resolve: (v: boolean) => void;
};

const ConfirmCtx = createContext<ConfirmFn>(() => Promise.resolve(false));

/** Hook potwierdzeń — `const confirm = useConfirm(); if (!(await confirm("…"))) return;` */
export function useConfirm(): ConfirmFn {
  return useContext(ConfirmCtx);
}

/**
 * Dostawca ostylowanych potwierdzeń (zamiast blokującego, niedostępnego `window.confirm`).
 * Modal: motyw red/black, Esc = anuluj, focus na akcji, `role="dialog"` + `aria-modal`.
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [req, setReq] = useState<Req | null>(null);

  const confirm = useCallback<ConfirmFn>(
    (message, opts) =>
      new Promise<boolean>((resolve) => {
        setReq({
          message,
          confirmLabel: opts?.confirmLabel ?? "Potwierdź",
          danger: opts?.danger ?? true,
          resolve,
        });
      }),
    [],
  );

  const close = useCallback((value: boolean) => {
    setReq((cur) => {
      cur?.resolve(value);
      return null;
    });
  }, []);

  useEffect(() => {
    if (!req) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
      if (e.key === "Enter") close(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [req, close]);

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      {req && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(0,0,0,0.6)",
            display: "grid",
            placeItems: "center",
            padding: 16,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            style={{
              width: 380,
              maxWidth: "100%",
              background: palette.nearBlack,
              border: `1px solid ${palette.graphite}`,
              borderRadius: 12,
              padding: 20,
            }}
          >
            <p style={{ color: palette.offWhite, margin: "0 0 16px", fontSize: 15 }}>
              {req.message}
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => close(false)}
                style={{
                  background: "transparent",
                  color: palette.offWhite,
                  border: `1px solid ${palette.graphite}`,
                  borderRadius: 8,
                  padding: "9px 16px",
                  cursor: "pointer",
                }}
              >
                Anuluj (Esc)
              </button>
              <button
                type="button"
                onClick={() => close(true)}
                style={{
                  background: req.danger ? palette.red : palette.offWhite,
                  color: req.danger ? palette.white : palette.black,
                  border: "none",
                  borderRadius: 8,
                  padding: "9px 16px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {req.confirmLabel} (Enter)
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmCtx.Provider>
  );
}
