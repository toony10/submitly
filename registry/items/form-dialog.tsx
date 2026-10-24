"use client";

import * as React from "react";
import { DialogLockProvider, useControllableDialog, useDialogLockScope } from "submitly";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type FormDialogRenderProps = {
  /** Closes the dialog (ignored while a save is in flight). */
  onClose: () => void;
  /** Changes on every open, controlled or not. Use it as the form's `key`. */
  formKey: number;
};

type FormDialogProps = {
  title: React.ReactNode;
  description?: React.ReactNode;
  trigger?: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: (props: FormDialogRenderProps) => React.ReactNode;
  className?: string;
  /**
   * Manual lock. Not needed with `useCrudForm` / `useCrudAction` inside the
   * dialog: they lock it automatically while pending.
   */
  isPending?: boolean;
};

function FormDialog({
  title,
  description,
  trigger,
  open,
  defaultOpen,
  onOpenChange,
  children,
  className,
  isPending = false,
}: FormDialogProps) {
  const lock = useDialogLockScope();
  const locked = lock.locked || isPending;
  const dialog = useControllableDialog({
    open,
    defaultOpen,
    onOpenChange,
    locked: () => lock.isLocked() || isPending,
  });
  const { setOpen } = dialog;
  const onClose = React.useCallback(() => setOpen(false), [setOpen]);

  return (
    <Dialog open={dialog.open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent
        className={cn(
          "flex max-h-[calc(100dvh-2rem)] max-w-lg flex-col overflow-x-hidden overflow-y-auto sm:max-w-lg",
          className,
        )}
        showCloseButton={!locked}
        aria-busy={locked || undefined}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        <DialogLockProvider scope={lock.scope}>
          {children({ onClose, formKey: dialog.openKey })}
        </DialogLockProvider>
      </DialogContent>
    </Dialog>
  );
}

export { FormDialog };
export type { FormDialogProps, FormDialogRenderProps };
