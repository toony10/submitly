import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // `server-only` throws outside the react-server condition; tests run runAction directly.
    alias: { "server-only": fileURLToPath(new URL("./test/stubs/empty.ts", import.meta.url)) },
  },
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
