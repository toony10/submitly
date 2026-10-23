"use client";

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import { useCallback, useRef, useState, type BaseSyntheticEvent } from "react";
import {
  useForm,
  type DefaultValues,
  type FieldPath,
  type FieldValues,
  type UseFormProps,
  type UseFormReturn,
} from "react-hook-form";

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

export type UseCrudFormOptions<
  TFieldValues extends FieldValues,
  TOutput,
  TResult,
> = MutationOptions<InferResultData<TResult>> & {
  /** Any Standard Schema: Zod 3.24+, Zod 4, Valibot 1, ArkType 2, ... */
  schema: StandardSchemaV1<TFieldValues, TOutput>;
  defaultValues?: NoInfer<DefaultValues<TFieldValues>>;
  /** Receives the schema's parsed output (after transforms). */
  action: (values: NoInfer<TOutput>) => Promise<TResult>;
  /** Reset the form to `defaultValues` after success. Default `true`. */
  resetOnSuccess?: boolean;
  /** Extra `useForm` options (`mode`, `reValidateMode`, ...). */
  formOptions?: Omit<UseFormProps<TFieldValues, unknown, TOutput>, "resolver" | "defaultValues">;
};

export type UseCrudFormReturn<TFieldValues extends FieldValues, TOutput> = {
  form: UseFormReturn<TFieldValues, unknown, TOutput>;
  /** Pass to `<form onSubmit>`. Never rejects; ignores submits while one is in flight. */
  onSubmit: (event?: BaseSyntheticEvent) => Promise<void>;
  serverErrors: string[];
  clearServerErrors: () => void;
  isSubmitting: boolean;
};

/**
 * react-hook-form + Standard Schema validation + action submission with
 * notify / refresh / reset / redirect on success and server errors (form-level
 * and per field) on failure.
 */
export function useCrudForm<TFieldValues extends FieldValues, TOutput = TFieldValues, TResult = unknown>(
  options: UseCrudFormOptions<TFieldValues, TOutput, TResult>,
): UseCrudFormReturn<TFieldValues, TOutput> {
  type TData = InferResultData<TResult>;

  const config = useCrudConfig();
  const latest = useLatest({ options, config });
  const inFlight = useRef(false);
  const [serverErrors, setServerErrors] = useState<string[]>([]);

  const form = useForm<TFieldValues, unknown, TOutput>({
    ...options.formOptions,
    resolver: standardSchemaResolver<TFieldValues, unknown, TOutput>(options.schema),
    defaultValues: options.defaultValues,
  });

  const { isSubmitting } = form.formState;
  const setDialogLock = useDialogLockHandle();

  const onSubmit = useCallback(
    async (event?: BaseSyntheticEvent) => {
      if (inFlight.current) {
        event?.preventDefault?.();
        return;
      }

      inFlight.current = true;

      if (latest.current.options.lockDialog !== false) {
        setDialogLock(true);
      }

      try {
        await form.handleSubmit(async (values) => {
          const { options, config } = latest.current;

          setServerErrors([]);

          const { interrupted, result } = await callAction<TOutput, TData>(
            options.action,
            values,
            config,
            options,
          );

          // Release before callbacks so an `onSuccess` that closes the dialog isn't blocked.
          setDialogLock(false);

          if (interrupted) {
            return;
          }

          notifyResult(result, config, options.notify);

          if (result.success) {
            runMutated(config, options.onMutated);

            if (options.resetOnSuccess !== false) {
              form.reset(options.defaultValues);
            }

            options.onSuccess?.(result);
            redirectAfterSuccess(result, config, options.redirectTo);
            return;
          }

          setServerErrors(collectFormErrors(result));
          applyFieldErrors(form, result);
          options.onError?.(result);
        })(event);
      } finally {
        inFlight.current = false;
        setDialogLock(false);
      }
    },
    [form, latest, setDialogLock],
  );

  const clearServerErrors = useCallback(() => setServerErrors([]), []);

  return { form, onSubmit, serverErrors, clearServerErrors, isSubmitting };
}

/** Form-level errors plus any field errors without a usable key. */
function collectFormErrors(result: ActionResult): string[] {
  const errors = [...(result.errors ?? [])];

  for (const [name, messages] of Object.entries(result.fieldErrors ?? {})) {
    if (!name) {
      errors.push(...messages);
    }
  }

  return errors;
}

function applyFieldErrors<TFieldValues extends FieldValues>(
  form: UseFormReturn<TFieldValues, unknown, unknown>,
  result: ActionResult,
) {
  let shouldFocus = true;

  for (const [name, messages] of Object.entries(result.fieldErrors ?? {})) {
    const [first] = messages;

    if (!name || first === undefined) {
      continue;
    }

    form.setError(
      name as FieldPath<TFieldValues>,
      {
        type: "server",
        message: first,
        types: Object.fromEntries(messages.map((message, index) => [String(index), message])),
      },
      { shouldFocus },
    );
    shouldFocus = false;
  }
}
