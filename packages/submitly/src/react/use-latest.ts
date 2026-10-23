"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

export const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Ref that always holds the latest value, updated before effects run. */
export function useLatest<T>(value: T) {
  const ref = useRef(value);

  useIsomorphicLayoutEffect(() => {
    ref.current = value;
  });

  return ref;
}
