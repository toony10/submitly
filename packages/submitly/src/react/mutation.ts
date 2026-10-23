"use client";

import type { ActionResult, MapError, Normalize, NotifyHandlers } from "../core/types";
import type { CrudConfig } from "./provider";

/** Options shared by `useCrudForm` and `useCrudAction`. */
export type MutationOptions<TData> = {
  onSuccess?: (result: ActionResult<TData>) => void;
  onError?: (result: ActionResult<TData>) => void;
  /** Navigate after success through the provider's `navigate`. */
  redirectTo?: string | ((result: ActionResult<TData>) => string | null | undefined);
  /** `false` silences notifications for this call; an object overrides per handler. */
  notify?: false | NotifyHandlers;
  /**
   * Overrides the provider's `onMutated`. Pass `false` to skip it, e.g. when a
   * server action already revalidated and a client refresh would be redundant.
   */
  onMutated?: false | (() => void);
  normalize?: Normalize;
  mapError?: MapError;
  /** Lock the enclosing dialog while pending. Default `true`. */
  lockDialog?: boolean;
};

export type CallOutcome<TData> =
  | { interrupted: false; result: ActionResult<TData> }
  | { interrupted: true; result: ActionResult<TData> };

/**
 * Calls the action and always resolves, never rejects. `interrupted` means
 * the action threw a framework control-flow error (see `isInterrupt`).
 */
export async function callAction<TInput, TData>(
  action: (input: TInput) => Promise<unknown>,
  input: TInput,
  config: CrudConfig,
  options: MutationOptions<TData>,
): Promise<CallOutcome<TData>> {
  const normalize = options.normalize ?? config.normalize;
  const mapError = options.mapError ?? config.mapError;

  try {
    return { interrupted: false, result: normalize(await action(input)) as ActionResult<TData> };
  } catch (error) {
    if (config.isInterrupt(error)) {
      return { interrupted: true, result: { success: false } };
    }

    return { interrupted: false, result: mapError(error) as ActionResult<TData> };
  }
}

export function notifyResult(
  result: ActionResult,
  config: CrudConfig,
  notify: MutationOptions<unknown>["notify"],
): void {
  if (notify === false || !result.message) {
    return;
  }

  const handler = result.success
    ? (notify?.success ?? config.notify.success)
    : (notify?.error ?? config.notify.error);

  handler(result);
}

export function runMutated(config: CrudConfig, onMutated: MutationOptions<unknown>["onMutated"]) {
  if (onMutated === false) {
    return;
  }

  (onMutated ?? config.onMutated)();
}

export function redirectAfterSuccess<TData>(
  result: ActionResult<TData>,
  config: CrudConfig,
  redirectTo: MutationOptions<TData>["redirectTo"],
) {
  const target = typeof redirectTo === "function" ? redirectTo(result) : redirectTo;

  if (target) {
    config.navigate(target);
  }
}
