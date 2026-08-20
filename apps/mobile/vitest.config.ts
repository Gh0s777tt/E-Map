import { defaultExclude, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Testujemy czystą logikę (lib/) z mockami AsyncStorage/Supabase — bez runtime RN/Expo.
    include: ["lib/**/*.test.ts"],
    // macOS na woluminach bez natywnych xattr (exFAT/NTFS/sieć) zapisuje metadane obok
    // pliku, jako sidecar `._nazwa.ts`. Taki sidecar pasuje do wzorca `*.test.ts`, więc
    // vitest brał go za plik testowy i wywracał się na „Transform failed" — a że dotyczyło
    // to WYŁĄCZNIE plików niedawno edytowanych, `pnpm check` potrafił paść u jednej osoby
    // i przejść u drugiej na tym samym commicie. Na runnerach Linuksa sidecarów nie ma,
    // więc wykluczenie jest tu bez skutku ubocznego — a lokalnie przywraca uruchamialność
    // tej samej komendy, którą wykonuje CI.
    exclude: [...defaultExclude, "**/._*"],
  },
});
