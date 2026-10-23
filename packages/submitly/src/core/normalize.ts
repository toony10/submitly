import type { ActionResult } from "./types";

export function isActionResult(value: unknown): value is ActionResult {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { success?: unknown }).success === "boolean"
  );
}

/**
 * Default `normalize`: `ActionResult`-shaped values pass through; anything
 * else (an entity, `undefined` from a void action) counts as success with the
 * value as `data`.
 */
export function defaultNormalize(raw: unknown): ActionResult {
  if (isActionResult(raw)) {
    return raw;
  }

  return raw === undefined ? { success: true } : { success: true, data: raw };
}

/**
 * Default `mapError`: a failed result carrying the error's message, both as
 * `message` (for `notify`) and in `errors` (for the errors panel), so a thrown
 * error is never silent even without a toast library.
 */
export function defaultMapError(error: unknown): ActionResult {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : undefined;

  return message ? { success: false, message, errors: [message] } : { success: false };
}
