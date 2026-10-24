import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\/components\/ui\/(form|form-errors|submit-button|form-dialog|confirm-dialog)$/, replacement: here("./items/$1.tsx") },
      { find: /^@\/components\/ui\/(.*)$/, replacement: here("./shadcn/ui/$1.tsx") },
      { find: "@/lib/utils", replacement: here("./shadcn/lib/utils.ts") },
    ],
  },
  test: {
    environment: "happy-dom",
    include: ["test/**/*.test.tsx"],
    setupFiles: ["test/setup.ts"],
  },
});
