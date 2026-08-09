import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

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
  },
  resolve: {
    // Alias „@" jak w tsconfig (paths) — by testy mogły importować @/app, @/lib.
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
});
