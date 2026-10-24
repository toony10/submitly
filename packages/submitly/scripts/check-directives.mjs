// Fails the build if a client module lost its "use client" directive or a
// server/shared module gained one. Guards against bundler changes stripping
// directives (see docs/PLAN.md, risks). `dist/core/*` (the `submitly/core`
// entry) must stay directive-free so Server Components and server actions can
// import it; it must also not import React.
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

// The `submitly/core` entry: must exist, must not carry the directive (checked
// above for every non-client file, repeated here so the intent is explicit),
// and must not pull in React or any client module.
const coreFiles = jsFiles("dist/core");

if (!coreFiles.includes(join("dist", "core", "index.js"))) {
  console.error("dist/core/index.js is missing (the submitly/core entry)");
  failed = true;
}

for (const file of coreFiles) {
  const source = readFileSync(file, "utf8");

  if (/^\s*["']use client["']/.test(source)) {
    console.error(`${file}: the submitly/core entry must not carry "use client"`);
    failed = true;
  }

  if (/from\s+["'](react|react-dom|\.\.\/react\/|\.\.\/index\.js)/.test(source)) {
    console.error(`${file}: the submitly/core entry must not import React or client modules`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log("directives ok");
