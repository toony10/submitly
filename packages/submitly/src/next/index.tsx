"use client";

import { unstable_rethrow, useRouter } from "next/navigation";
import { useCallback } from "react";

import { CrudProvider, type CrudProviderProps } from "../react/provider";

export type NextCrudProviderProps = CrudProviderProps & {
  /**
   * Call `router.refresh()` after each successful mutation. Turn it off when
   * your server actions already revalidate (`runAction` with `revalidate`),
   * which updates the UI in the same round trip. Default `true`.
   */
  refreshOnMutated?: boolean;
};

/**
 * `CrudProvider` preset for the Next.js App Router: `onMutated` →
 * `router.refresh()`, `navigate` → `router.push()`, and server-action
 * `redirect()` / `notFound()` treated as interrupts instead of failures.
 * Any prop you pass wins over the preset.
 */
export function NextCrudProvider({ refreshOnMutated = true, ...props }: NextCrudProviderProps) {
  const router = useRouter();
  const refresh = useCallback(() => router.refresh(), [router]);
  const push = useCallback((to: string) => router.push(to), [router]);

  return (
    <CrudProvider
      onMutated={refreshOnMutated ? refresh : noop}
      navigate={push}
      isInterrupt={isNextInterrupt}
      {...stripUndefined(props)}
    />
  );
}

/** True for Next.js control-flow errors (redirect, notFound, forbidden, unauthorized). */
export function isNextInterrupt(error: unknown): boolean {
  try {
    unstable_rethrow(error);
    return false;
  } catch {
    return true;
  }
}

function noop() {}

function stripUndefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as Partial<T>;
}
