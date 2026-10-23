// Fails the build if a client entry lost its "use client" directive or the
// server entry gained one. Guards against bundler changes stripping directives.
import { readFileSync } from "node:fs";

const expectations = {
  "dist/index.js": true,
  "dist/next/index.js": true,
  "dist/next/server.js": false,
};

let failed = false;
for (const [file, wantsDirective] of Object.entries(expectations)) {
  const hasDirective = /^\s*["']use client["'];?/.test(readFileSync(file, "utf8"));
  if (hasDirective !== wantsDirective) {
    console.error(`${file}: expected "use client" ${wantsDirective ? "present" : "absent"}`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log("directives ok");
