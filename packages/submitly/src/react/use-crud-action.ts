"use client";

import { useCallback, useRef, useState } from "react";

import type { ActionResult, InferResultData } from "../core/types";
import { useDialogLockHandle } from "./dialog-lock";
import {
  callAction,
  notifyResult,
  redirectAfterSuccess,
  runMutated,
  type MutationOptions,
} from "./mutation";
import { useCrudConfig } from "./provider";
import { useLatest } from "./use-latest";

export type UseCrudActionOptions<TInput, TResult> = MutationOptions<InferResultData<TResult>> & {
  /** Any async function: a server action, a fetch wrapper, an RPC call. */
  action: (input: TInput) => Promise<TResult>;
};

export type UseCrudActionReturn<TInput, TData> = {
  /**
   * Runs the action. Never rejects: thrown errors go through `mapError`
   * (interrupts resolve with a bare `{ success: false }` and no side effects).
   * While a call is in flight, further calls return the same promise.
   * Stable identity across renders.
   */
  execute: (input: TInput) => Promise<ActionResult<TData>>;
  isPending: boolean;
  serverErrors: string[];
  clearServerErrors: () => void;
};

/** Non-form mutation (delete, toggle, bulk action) with the same success/failure conventions as `useCrudForm`. */
export function useCrudAction<TInput = void, TResult = unknown>(
  options: UseCrudActionOptions<TInput, TResult>,
): UseCrudActionReturn<TInput, InferResultData<TResult>> {
  type TData = InferResultData<TResult>;

  const config = useCrudConfig();
  const latest = useLatest({ options, config });
  const inFlight = useRef<Promise<ActionResult<TData>> | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [serverErrors, setServerErrors] = useState<string[]>([]);

  const setDialogLock = useDialogLockHandle();

  const execute = useCallback(
    (input: TInput): Promise<ActionResult<TData>> => {
      if (inFlight.current) {
        return inFlight.current;
      }

      const run = async () => {
        const { options, config } = latest.current;

        const lock = options.lockDialog !== false;

        setServerErrors([]);
        setIsPending(true);

        if (lock) {
          setDialogLock(true);
        }

        try {
          const { interrupted, result } = await callAction<TInput, TData>(
            options.action,
            input,
            config,
            options,
          );

          // Release before callbacks so an `onSuccess` that closes the dialog isn't blocked.
          setDialogLock(false);

          if (interrupted) {
            return result;
          }

          notifyResult(result, config, options.notify);

          if (result.success) {
            runMutated(config, options.onMutated);
            options.onSuccess?.(result);
            redirectAfterSuccess(result, config, options.redirectTo);
          } else {
            setServerErrors(result.errors ?? []);
            options.onError?.(result);
          }

          return result;
        } finally {
          inFlight.current = null;
          setDialogLock(false);
          setIsPending(false);
        }
      };

      inFlight.current = run();

      return inFlight.current;
    },
    [latest, setDialogLock],
  );

  const clearServerErrors = useCallback(() => setServerErrors([]), []);

  return { execute, isPending, serverErrors, clearServerErrors };
}
