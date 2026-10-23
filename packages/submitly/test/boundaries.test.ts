import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

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
});
