import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Testujemy czystą logikę (lib/) z mockami AsyncStorage/Supabase — bez runtime RN/Expo.
    include: ["lib/**/*.test.ts"],
  },
});
