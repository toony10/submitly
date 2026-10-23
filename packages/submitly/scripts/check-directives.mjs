// Fails the build if a client module lost its "use client" directive or a
// server/shared module gained one. Guards against bundler changes stripping
// directives (see docs/PLAN.md, risks).
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const jsFiles = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? jsFiles(join(dir, entry.name))
      : entry.name.endsWith(".js")
        ? [join(dir, entry.name)]
        : [],
  );

const isClientModule = (file) =>
  file === "dist/index.js" || file.startsWith("dist/react/") || file === "dist/next/index.js" ||
  file.startsWith("dist/next/client/");

let failed = false;
for (const file of jsFiles("dist")) {
  const hasDirective = /^\s*["']use client["'];?/.test(readFileSync(file, "utf8"));
  const wantsDirective = isClientModule(file);

  if (hasDirective !== wantsDirective) {
    console.error(`${file}: expected "use client" ${wantsDirective ? "present" : "absent"}`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log("directives ok");
