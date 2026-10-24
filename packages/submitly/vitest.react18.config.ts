import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { defineConfig, mergeConfig } from "vitest/config";

import base from "./vitest.config.ts";

// Runs the React-only tests against React 18 (the `react-18` / `react-dom-18`
// devDependency aliases) instead of the React 19 the package is built with.
const require = createRequire(import.meta.url);

const testingLibraryEsm = join(dirname(require.resolve("@testing-library/react/package.json")), "dist/@testing-library/react.esm.js");

const alias = [
  // RTL ships CJS as `main`; the ESM build is inlined so its `react` imports hit the aliases below.
  { find: /^@testing-library\/react$/, replacement: testingLibraryEsm },
  { find: /^react$/, replacement: require.resolve("react-18") },
  { find: /^react\/jsx-runtime$/, replacement: require.resolve("react-18/jsx-runtime") },
  { find: /^react\/jsx-dev-runtime$/, replacement: require.resolve("react-18/jsx-dev-runtime") },
  { find: /^react-dom$/, replacement: require.resolve("react-dom-18") },
  { find: /^react-dom\/client$/, replacement: require.resolve("react-dom-18/client") },
  { find: /^react-dom\/test-utils$/, replacement: require.resolve("react-dom-18/test-utils") },
  { find: /^react-dom\/server$/, replacement: require.resolve("react-dom-18/server") },
];

export default mergeConfig(
  base,
  defineConfig({
    resolve: { alias, dedupe: ["react", "react-dom"] },
    test: {
      // Not `next-*`: Next 15+ requires React 19.
      exclude: ["test/next-*", "node_modules/**"],
      server: {
        deps: {
          // Libraries that import `react` must go through the alias above.
          inline: [/@testing-library\/react\//, "react-hook-form"],
        },
      },
      env: { SUBMITLY_REACT_MAJOR: "18" },
      typecheck: { enabled: false },
    },
  }),
);
