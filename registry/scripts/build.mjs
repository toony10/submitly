// Builds the shadcn registry into apps/docs/public/r.
// registry.json references sibling items by URL, so `{{REGISTRY_URL}}` is
// replaced with the hosting origin (REGISTRY_URL env, e.g. the docs site).
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const registryUrl = (process.env.REGISTRY_URL ?? "http://localhost:3000").replace(/\/$/, "");
const output = fileURLToPath(new URL("../../apps/docs/public/r", import.meta.url));
const resolved = `${root}.build/registry.json`;

mkdirSync(`${root}.build`, { recursive: true });
writeFileSync(
  resolved,
  readFileSync(`${root}registry.json`, "utf8").replaceAll("{{REGISTRY_URL}}", registryUrl),
);

rmSync(output, { recursive: true, force: true });
execFileSync("shadcn", ["build", resolved, "--output", output, "--cwd", root], {
  stdio: "inherit",
});

console.log(`registry built for ${registryUrl} → ${output}`);
