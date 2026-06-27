import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // lib/ — czysta logika; tests/ — handlery tras (z mockami next/supabase/server-only).
    include: ["lib/**/*.test.ts", "tests/**/*.test.ts"],
  },
  resolve: {
    // Alias „@" jak w tsconfig (paths) — by testy mogły importować @/app, @/lib.
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
});
