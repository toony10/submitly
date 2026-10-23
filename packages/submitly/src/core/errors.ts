import type { StandardSchemaV1 } from "@standard-schema/spec";

import type { FieldErrorMap } from "./types";

/**
 * Dotted path of a Standard Schema issue (`items.0.name`), the format
 * react-hook-form uses for field names. `undefined` for root-level issues or
 * paths containing symbols.
 */
export function getDotPath(issue: StandardSchemaV1.Issue): string | undefined {
  if (!issue.path?.length) {
    return undefined;
  }

  const segments: string[] = [];

  for (const segment of issue.path) {
    const key = typeof segment === "object" ? segment.key : segment;

    if (typeof key !== "string" && typeof key !== "number") {
      return undefined;
    }

    segments.push(String(key));
  }

  return segments.join(".");
}

/**
 * Splits schema issues into field errors (keyed by dotted path) and
 * form-level errors (issues without a usable path).
 */
export function issuesToErrors(issues: readonly StandardSchemaV1.Issue[]): {
  fieldErrors: FieldErrorMap;
  errors: string[];
} {
  const fieldErrors: FieldErrorMap = {};
  const errors: string[] = [];

  for (const issue of issues) {
    const path = getDotPath(issue);

    if (path === undefined) {
      errors.push(issue.message);
    } else {
      (fieldErrors[path] ??= []).push(issue.message);
    }
  }

  return { fieldErrors, errors };
}
