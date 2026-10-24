import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import * as core from "../src/core";
import * as root from "../src";

const banned = /from\s+["'](next(\/[^"']*)?|sonner|next-intl|react-i18next|i18next)["']/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? sourceFiles(join(dir, entry.name)) : [join(dir, entry.name)],
  );
}

describe("module boundaries", () => {
  it.each(["core", "react"])("src/%s has no framework, toast or i18n imports", (folder) => {
    const offenders = sourceFiles(join(import.meta.dirname, "../src", folder)).filter((file) =>
      banned.test(readFileSync(file, "utf8")),
    );

    expect(offenders).toEqual([]);
  });

  it("src/core does not import React", () => {
    const offenders = sourceFiles(join(import.meta.dirname, "../src/core")).filter((file) =>
      /from\s+["']react(-dom)?["']/.test(readFileSync(file, "utf8")),
    );

    expect(offenders).toEqual([]);
  });
  it("src/core carries no 'use client' directive, so Server Components can import it", () => {
    const offenders = sourceFiles(join(import.meta.dirname, "../src/core")).filter((file) =>
      /^\s*["']use client["']/.test(readFileSync(file, "utf8")),
    );

    expect(offenders).toEqual([]);
  });

  it("the root entry keeps re-exporting every core runtime export", () => {
    const names = Object.keys(core).sort();

    expect(names).toEqual([
      "defaultMapError",
      "defaultNormalize",
      "getDotPath",
      "isActionResult",
      "issuesToErrors",
      "validate",
    ]);
    expect(names.filter((name) => !(name in root))).toEqual([]);
  });

  it("package.json exposes submitly/core and builds it as its own entry", () => {
    const pkg = JSON.parse(readFileSync(join(import.meta.dirname, "../package.json"), "utf8"));
    const config = readFileSync(join(import.meta.dirname, "../tsdown.config.ts"), "utf8");

    expect(pkg.exports["./core"]).toEqual({
      types: "./dist/core/index.d.ts",
      default: "./dist/core/index.js",
    });
    expect(config).toContain('"src/core/index.ts"');
  });
});
