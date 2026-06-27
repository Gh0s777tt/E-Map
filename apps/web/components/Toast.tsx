"use client";

import { createContext, useCallback, useContext, useState } from "react";

type ToastKind = "success" | "error" | "info";
interface ToastItem {
  id: string;
  message: string;
  kind: ToastKind;
}

/** Wywołanie: `const toast = useToast(); toast("Zapisano", "success")`. */
const ToastContext = createContext<(message: string, kind?: ToastKind) => void>(() => {});
export const useToast = () => useContext(ToastContext);

/**
 * Ulotne powiadomienia (toasty) — zamiast inline „status msg" przy formularzach.
 * Auto-znikają po ~3.5 s; `aria-live` ogłasza je czytnikom ekranu (dostępność).
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback((message: string, kind: ToastKind = "info") => {
    const id = crypto.randomUUID();
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="el-toasts" aria-live="polite" aria-atomic="false">
        {toasts.map((t) => (
          <div key={t.id} className={`el-toast el-toast-${t.kind} el-slide-up`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
