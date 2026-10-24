"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import { defaultMapError, defaultNormalize } from "../core/normalize";
import type { MapError, Normalize, NotifyHandlers } from "../core/types";

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
};

export type CrudProviderProps = {
  children?: ReactNode;
  notify?: NotifyHandlers;
  onMutated?: () => void;
  navigate?: (to: string) => void;
  normalize?: Normalize;
  mapError?: MapError;
  isInterrupt?: (error: unknown) => boolean;
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
    ],
  );

  return <CrudConfigContext.Provider value={value}>{children}</CrudConfigContext.Provider>;
}

/** The resolved provider configuration (built-in defaults when there is no provider). */
export function useCrudConfig(): CrudConfig {
  return useContext(CrudConfigContext);
}
