/**
 * The result every action resolves to (after `normalize`).
 *
 * Only `success` is required, so plain `{ success: true }` is a valid result.
 */
export type ActionResult<TData = unknown> = {
  success: boolean;
  /** Shown through `notify` when present. */
  message?: string;
  data?: TData;
  /** Form-level errors, collected into `serverErrors` by the hooks. */
  errors?: string[];
  /** Field errors keyed by dotted path (`items.0.name`), applied with `form.setError`. */
  fieldErrors?: FieldErrorMap;
  statusCode?: number;
};

/** Field errors keyed by dotted path, matching react-hook-form field names. */
export type FieldErrorMap = Record<string, string[]>;

/** Turns whatever an action returned into an `ActionResult`. */
export type Normalize = (raw: unknown) => ActionResult;

/** Turns a thrown error (network failure, HTTP error, ...) into an `ActionResult`. */
export type MapError = (error: unknown) => ActionResult;

export type NotifyHandlers = {
  success?: (result: ActionResult) => void;
  error?: (result: ActionResult) => void;
};

/**
 * Extracts `TData` from an action's return type. Actions that don't return an
 * `ActionResult` (e.g. a fetch wrapper returning the entity) yield `unknown`,
 * because a provider-level `normalize` decides what `data` ends up being.
 */
export type InferResultData<TResult> = [TResult] extends [ActionResult<infer TData>]
  ? TData
  : unknown;
