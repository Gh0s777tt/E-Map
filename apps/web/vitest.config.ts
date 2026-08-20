import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defaultExclude, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    // lib/ — logika; tests/ — handlery tras; components/ — testy React (createElement, pragma jsdom
    // w pliku). Bez JSX w testach: tsconfig ma jsx:"preserve" (Next), którego Vite nie transformuje.
    //
    // [#378] app/ dołączone dla helperów mieszkających obok ekranu (np. przeliczanie
    // walut w statystykach). Wzorzec dopasowuje wyłącznie pliki `*.test.ts`, więc
    // Vite nie próbuje ładować komponentów serwerowych ani plików tras.
    include: [
      "lib/**/*.test.ts",
      "tests/**/*.test.ts",
      "components/**/*.test.ts",
      "app/**/*.test.ts",
    ],
    // macOS na woluminach bez natywnych xattr (exFAT/NTFS/sieć) zapisuje metadane obok
    // pliku, jako sidecar `._nazwa.ts`. Taki sidecar pasuje do wzorca `*.test.ts`, więc
    // vitest brał go za plik testowy i wywracał się na „Transform failed" — a że dotyczyło
    // to WYŁĄCZNIE plików niedawno edytowanych, `pnpm check` potrafił paść u jednej osoby
    // i przejść u drugiej na tym samym commicie. Na runnerach Linuksa sidecarów nie ma,
    // więc wykluczenie jest tu bez skutku ubocznego — a lokalnie przywraca uruchamialność
    // tej samej komendy, którą wykonuje CI.
    exclude: [...defaultExclude, "**/._*"],
  },
  resolve: {
    // Alias „@" jak w tsconfig (paths) — by testy mogły importować @/app, @/lib.
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
});
