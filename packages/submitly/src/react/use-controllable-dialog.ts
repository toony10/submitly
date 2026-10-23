"use client";

import { useCallback, useState } from "react";

import { useLatest } from "./use-latest";

export type UseControllableDialogOptions = {
  /** Controlled open state. Leave undefined for an uncontrolled dialog. */
  open?: boolean;
  defaultOpen?: boolean;
  /** Called on every requested change, controlled or not. */
  onOpenChange?: (open: boolean) => void;
  /**
   * While true, every open-state change is ignored (e.g. a save is in flight).
   * Pass a function (such as `useDialogLockScope().isLocked`) to read it at
   * call time.
   */
  locked?: boolean | (() => boolean);
};

export type UseControllableDialogReturn = {
  open: boolean;
  setOpen: (open: boolean) => void;
  /**
   * Increments on every closed → open transition, controlled or not. Use it
   * as a `key` so the dialog's form remounts with fresh default values.
   */
  openKey: number;
  isControlled: boolean;
};

export function useControllableDialog({
  open,
  defaultOpen = false,
  onOpenChange,
  locked = false,
}: UseControllableDialogOptions = {}): UseControllableDialogReturn {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = open !== undefined;
  const currentOpen = isControlled ? open : internalOpen;

  // Derive openKey during render so the remount happens in the same commit
  // as the transition, for controlled opens too.
  const [openKey, setOpenKey] = useState(0);
  const [previousOpen, setPreviousOpen] = useState(currentOpen);

  if (previousOpen !== currentOpen) {
    setPreviousOpen(currentOpen);

    if (currentOpen) {
      setOpenKey((key) => key + 1);
    }
  }

  const latest = useLatest({ isControlled, onOpenChange, locked });

  const setOpen = useCallback(
    (next: boolean) => {
      const { isControlled, onOpenChange, locked } = latest.current;

      if (typeof locked === "function" ? locked() : locked) {
        return;
      }

      if (!isControlled) {
        setInternalOpen(next);
      }

      onOpenChange?.(next);
    },
    [latest],
  );

  return { open: currentOpen, setOpen, openKey, isControlled };
}
