/**
 * The adapter story: `api` returns envelopes and throws `ApiError`, while
 * submitly works with `ActionResult`. These two functions, passed to
 * `CrudProvider`, are the only glue; no action is reshaped by hand.
 */
import { defaultMapError, defaultNormalize, type MapError, type Normalize } from "submitly";

import { ApiError, type Envelope } from "./api";

const isEnvelope = (value: unknown): value is Envelope<unknown> =>
  typeof value === "object" && value !== null && "data" in value && !("success" in value);

/** `{ data, message }` response bodies become `{ success: true, data, message }`. */
export const normalize: Normalize = (raw) =>
  isEnvelope(raw) ? { success: true, data: raw.data, message: raw.message } : defaultNormalize(raw);

/**
 * `ApiError` becomes a failed result. Field errors go to the form fields (no
 * form-level panel); everything else lands in `errors` for the error panel.
 */
export const mapError: MapError = (error) => {
  if (error instanceof ApiError) {
    return {
      success: false,
      statusCode: error.status,
      message: error.message,
      errors: error.fieldErrors ? undefined : [error.message],
      fieldErrors: error.fieldErrors,
    };
  }

  return defaultMapError(error);
};
