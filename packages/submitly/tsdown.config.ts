import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/next/index.ts", "src/next/server.ts"],
  format: "esm",
  platform: "neutral",
  dts: true,
  // Keep one output file per source file so per-module "use client" directives survive.
  // scripts/check-directives.mjs verifies them after every build.
  unbundle: true,
  clean: true,
  suppressWarnings: [/module level directive "use client"/i],
  failOnWarn: true,
});
