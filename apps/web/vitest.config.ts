import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Testujemy czystą logikę (lib/). Trasy/komponenty z `server-only`/`next`
    // wymagają e2e/integration — nie są tu importowane.
    include: ["lib/**/*.test.ts"],
  },
});
