"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useIsomorphicLayoutEffect } from "./use-latest";

export type DialogLockScope = {
  setLock: (id: string, locked: boolean) => void;
  /** Synchronous read, current even before the owner re-renders. */
  isLocked: () => boolean;
};

const DialogLockContext = createContext<DialogLockScope | null>(null);

/**
 * Owner side of the dialog lock, used by dialog components. The dialog is
 * locked while any lock holder below the matching `DialogLockProvider` holds
 * it. Use `locked` for rendering and `isLocked` for guards, since a hook can
 * release the lock and close the dialog in the same tick.
 */
export function useDialogLockScope(): {
  locked: boolean;
  isLocked: () => boolean;
  scope: DialogLockScope;
} {
  const holders = useRef(new Set<string>());
  const [locked, setLocked] = useState(false);

  const scope = useMemo<DialogLockScope>(
    () => ({
      setLock: (id, nextLocked) => {
        if (nextLocked) {
          holders.current.add(id);
        } else {
          holders.current.delete(id);
        }

        setLocked(holders.current.size > 0);
      },
      isLocked: () => holders.current.size > 0,
    }),
    [],
  );

  return { locked, isLocked: scope.isLocked, scope };
}

export function DialogLockProvider({
  scope,
  children,
}: {
  scope: DialogLockScope;
  children?: ReactNode;
}) {
  return <DialogLockContext.Provider value={scope}>{children}</DialogLockContext.Provider>;
}

/**
 * Imperative lock holder for the nearest dialog. Returns a stable setter; the
 * lock is released automatically on unmount. A no-op outside a dialog.
 */
export function useDialogLockHandle(): (locked: boolean) => void {
  const scope = useContext(DialogLockContext);
  const id = useId();

  useEffect(() => {
    return () => scope?.setLock(id, false);
  }, [scope, id]);

  return useCallback((locked: boolean) => scope?.setLock(id, locked), [scope, id]);
}

/**
 * Locks the nearest enclosing dialog (no close, escape or overlay click) while
 * `locked` is true. A no-op outside a dialog. `useCrudForm` and
 * `useCrudAction` lock automatically while pending.
 */
export function useDialogLock(locked: boolean): void {
  const setLock = useDialogLockHandle();

  useIsomorphicLayoutEffect(() => {
    if (!locked) {
      return;
    }

    setLock(true);

    return () => setLock(false);
  }, [setLock, locked]);
}
