"use client";

import { createContext, useCallback, useContext, useState } from "react";

type ToastKind = "success" | "error" | "info";
/** #295: opcjonalna akcja w toaście (np. „Cofnij" po operacji odwracalnej). */
interface ToastAction {
  label: string;
  onClick: () => void;
}
interface ToastItem {
  id: string;
  message: string;
  kind: ToastKind;
  action?: ToastAction;
}

/** Wywołanie: `const toast = useToast(); toast("Zapisano", "success")`
 *  lub z akcją: `toast("Odrzucono", "info", { label: "Cofnij", onClick: restore })`. */
const ToastContext = createContext<
  (message: string, kind?: ToastKind, action?: ToastAction) => void
>(() => {});
export const useToast = () => useContext(ToastContext);

/**
 * Ulotne powiadomienia (toasty) — zamiast inline „status msg" przy formularzach.
 * Auto-znikają po ~3.5 s (z akcją: ~6.5 s, żeby zdążyć kliknąć „Cofnij");
 * `aria-live` ogłasza je czytnikom ekranu (dostępność).
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback((message: string, kind: ToastKind = "info", action?: ToastAction) => {
    const id = crypto.randomUUID();
    setToasts((t) => [...t, { id, message, kind, action }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), action ? 6500 : 3500);
  }, []);

  function runAction(t: ToastItem) {
    setToasts((list) => list.filter((x) => x.id !== t.id));
    t.action?.onClick();
  }

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="el-toasts" aria-live="polite" aria-atomic="false">
        {toasts.map((t) => (
          <div key={t.id} className={`el-toast el-toast-${t.kind} el-slide-up`}>
            {t.message}
            {t.action && (
              <button type="button" className="el-toast-action" onClick={() => runAction(t)}>
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
