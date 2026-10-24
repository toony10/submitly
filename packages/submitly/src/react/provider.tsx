"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import { defaultMapError, defaultNormalize } from "../core/normalize";
import type { ActionResult, MapError, Normalize, NotifyHandlers } from "../core/types";

/** Fully resolved configuration, as read by the hooks. */
export type CrudConfig = {
  notify: Required<NotifyHandlers>;
  /** Called after every successful mutation (refetch, `router.refresh()`, ...). */
  onMutated: () => void;
  /** Used for `redirectTo`. */
  navigate: (to: string) => void;
  normalize: Normalize;
  mapError: MapError;
  /**
   * Thrown values the framework is already handling (e.g. a Next.js
   * `redirect()` inside a server action). The hooks then stop silently: no
   * notify, no errors, no callbacks.
   */
  isInterrupt: (error: unknown) => boolean;
  /**
   * Called for every failed result from `useCrudForm` / `useCrudAction`
   * (a returned `{ success: false }` or a mapped thrown error), after
   * `notify.error` and before the per-call `onError`. Never called for
   * interrupts. Use it for cross-cutting failure handling such as redirecting
   * to a login page on a 401.
   */
  onError: (result: ActionResult) => void;
};

export type CrudProviderProps = {
  children?: ReactNode;
  notify?: NotifyHandlers;
  onMutated?: () => void;
  navigate?: (to: string) => void;
  normalize?: Normalize;
  mapError?: MapError;
  isInterrupt?: (error: unknown) => boolean;
  onError?: (result: ActionResult) => void;
};

const noop = () => {};

export const defaultCrudConfig: CrudConfig = {
  notify: { success: noop, error: noop },
  onMutated: noop,
  navigate: (to) => {
    if (typeof window !== "undefined") {
      window.location.assign(to);
    }
  },
  normalize: defaultNormalize,
  mapError: defaultMapError,
  isInterrupt: () => false,
  onError: noop,
};

const CrudConfigContext = createContext<CrudConfig>(defaultCrudConfig);

/**
 * Supplies notify / refresh / navigation / result mapping to every
 * submitly hook below it. All props are optional; nested providers override
 * their parent prop by prop (`notify` merges per key).
 */
export function CrudProvider({
  children,
  notify,
  onMutated,
  navigate,
  normalize,
  mapError,
  isInterrupt,
  onError,
}: CrudProviderProps) {
  const parent = useContext(CrudConfigContext);

  const value = useMemo<CrudConfig>(
    () => ({
      notify: {
        success: notify?.success ?? parent.notify.success,
        error: notify?.error ?? parent.notify.error,
      },
      onMutated: onMutated ?? parent.onMutated,
      navigate: navigate ?? parent.navigate,
      normalize: normalize ?? parent.normalize,
      mapError: mapError ?? parent.mapError,
      isInterrupt: isInterrupt ?? parent.isInterrupt,
      onError: onError ?? parent.onError,
    }),
    [
      parent,
      notify?.success,
      notify?.error,
      onMutated,
      navigate,
      normalize,
      mapError,
      isInterrupt,
      onError,
    ],
  );

  return <CrudConfigContext.Provider value={value}>{children}</CrudConfigContext.Provider>;
}

/** The resolved provider configuration (built-in defaults when there is no provider). */
export function useCrudConfig(): CrudConfig {
  return useContext(CrudConfigContext);
}
