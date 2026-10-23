import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    include: ["test/**/*.test.{ts,tsx}"],
    passWithNoTests: true,
    setupFiles: ["test/setup.ts"],
    typecheck: {
      include: ["test/**/*.test-d.{ts,tsx}"],
      tsconfig: "./tsconfig.json",
    },
  },
});
