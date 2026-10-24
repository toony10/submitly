import { defineConfig, devices } from "@playwright/test";

import type { TestOptions } from "./tests/fixtures";

// Never 3000: that port is for a developer's own server.
const NEXT_PORT = 3100;
const VITE_PORT = 3200;

const next = `http://127.0.0.1:${NEXT_PORT}`;
const vite = `http://127.0.0.1:${VITE_PORT}`;

// Building happens inside the webServer command, so allow for it.
const SERVER_TIMEOUT = 240_000;

export default defineConfig<TestOptions>({
  testDir: "./tests",
  // Both apps keep their data in memory, so tests must not overlap.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  // No retries: a flaky test should fail loudly, not pass on the second attempt.
  retries: 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  expect: { timeout: 10_000 },
  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "next",
      use: { ...devices["Desktop Chrome"], baseURL: next, brokenMessage: "Unexpected error" },
    },
    {
      name: "vite",
      use: { ...devices["Desktop Chrome"], baseURL: vite, brokenMessage: "Database connection lost" },
    },
  ],
  webServer: [
    {
      // `pnpm` passes a literal `--` through to next, so the port flag follows `start` directly.
      command: `pnpm --filter example-next-app build && pnpm --filter example-next-app start -p ${NEXT_PORT} -H 127.0.0.1`,
      url: next,
      reuseExistingServer: !process.env.CI,
      timeout: SERVER_TIMEOUT,
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      command: `pnpm --filter example-vite-app build && pnpm --filter example-vite-app exec vite preview --host 127.0.0.1 --port ${VITE_PORT} --strictPort`,
      url: vite,
      reuseExistingServer: !process.env.CI,
      timeout: SERVER_TIMEOUT,
      stdout: "pipe",
      stderr: "pipe",
    },
  ],
});
