/**
 * #340: brama blokady biometrycznej. Gdy blokada włączona, po starcie i po
 * powrocie z tła (background→active) zasłania treść ekranem odblokowania,
 * dopóki użytkownik nie potwierdzi tożsamości (Face ID / Touch ID / kod).
 * Fail-safe: bez biometrii `authenticate` zwraca true → treść od razu widoczna.
 */
import { palette } from "@e-logistic/ui";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus, Pressable, StyleSheet, Text, View } from "react-native";
import { authenticate, isAppLockEnabled } from "../lib/appLock";
import { useT } from "../lib/i18n";

export function AppLockGate({ children }: { children: ReactNode }) {
  const t = useT();
  const [locked, setLocked] = useState(false);
  const [checking, setChecking] = useState(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  const tryUnlock = useCallback(async () => {
    if (checking) return;
    setChecking(true);
    try {
      const ok = await authenticate(t("m.lock.prompt"));
      setLocked(!ok);
    } finally {
      setChecking(false);
    }
  }, [checking, t]);

  // Start: zablokuj, jeśli włączone, i od razu poproś o odblokowanie.
  // biome-ignore lint/correctness/useExhaustiveDependencies: uruchamiane raz przy montowaniu
  useEffect(() => {
    (async () => {
      if (await isAppLockEnabled()) {
        setLocked(true);
        const ok = await authenticate(t("m.lock.prompt"));
        setLocked(!ok);
      }
    })();
  }, []);

  // Powrót z tła → ponownie zablokuj.
  useEffect(() => {
    const sub = AppState.addEventListener("change", async (next) => {
      const prev = appState.current;
      appState.current = next;
      if (prev.match(/inactive|background/) && next === "active") {
        if (await isAppLockEnabled()) {
          setLocked(true);
          const ok = await authenticate(t("m.lock.prompt"));
          setLocked(!ok);
        }
      }
    });
    return () => sub.remove();
  }, [t]);

  return (
    <View style={{ flex: 1 }}>
      {children}
      {locked && (
        <View style={s.overlay}>
          <Text style={s.logo}>
            E-<Text style={{ color: palette.red }}>Logistic</Text>
          </Text>
          <Text style={s.lockIcon}>🔒</Text>
          <Text style={s.title}>{t("m.lock.title")}</Text>
          <Pressable style={s.btn} onPress={tryUnlock} disabled={checking}>
            <Text style={s.btnText}>{checking ? "…" : t("m.lock.unlock")}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: palette.black,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    zIndex: 999,
  },
  logo: { color: palette.offWhite, fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
  lockIcon: { fontSize: 48 },
  title: { color: palette.smoke, fontSize: 15 },
  btn: {
    backgroundColor: palette.red,
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 13,
    marginTop: 8,
  },
  btnText: { color: palette.white, fontWeight: "800", fontSize: 15 },
});
