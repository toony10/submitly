"use client";

import * as React from "react";
import {
  DialogLockProvider,
  useControllableDialog,
  useCrudAction,
  useCrudConfig,
  useDialogLockScope,
  type UseCrudActionOptions,
} from "submitly";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FormErrors } from "@/components/ui/form-errors";
import { SubmitButton } from "@/components/ui/submit-button";

type ConfirmActionOptions<TInput, TResult> = Pick<
  UseCrudActionOptions<TInput, TResult>,
  "action" | "onSuccess" | "onError" | "redirectTo" | "notify" | "onMutated"
>;

type ConfirmDialogProps<TInput, TResult> = ConfirmActionOptions<TInput, TResult> & {
  title: React.ReactNode;
  description?: React.ReactNode;
  trigger?: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Passed to `action` on confirm. */
  actionInput: TInput;
  /** Defaults to the provider's `labels.confirm`. */
  confirmLabel?: React.ReactNode;
  /** Defaults to the provider's `labels.cancel`. */
  cancelLabel?: React.ReactNode;
  /** Defaults to the provider's `labels.errorsTitle`. */
  errorsTitle?: string | null;
  variant?: "default" | "destructive";
};

/** Confirm-then-run dialog (delete, archive, ...). Closes on success only. */
function ConfirmDialog<TInput, TResult>({
  title,
  description,
  trigger,
  open,
  defaultOpen,
  onOpenChange,
  ...bodyProps
}: ConfirmDialogProps<TInput, TResult>) {
  const lock = useDialogLockScope();
  const dialog = useControllableDialog({ open, defaultOpen, onOpenChange, locked: lock.isLocked });
  const { setOpen } = dialog;
  const onClose = React.useCallback(() => setOpen(false), [setOpen]);

  return (
    <Dialog open={dialog.open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent showCloseButton={!lock.locked} aria-busy={lock.locked || undefined}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        <DialogLockProvider scope={lock.scope}>
          <ConfirmDialogBody {...bodyProps} onClose={onClose} />
        </DialogLockProvider>
      </DialogContent>
    </Dialog>
  );
}

// Rendered inside the lock provider so useCrudAction locks this dialog while pending.
function ConfirmDialogBody<TInput, TResult>({
  action,
  actionInput,
  onSuccess,
  onError,
  redirectTo,
  notify,
  onMutated,
  confirmLabel,
  cancelLabel,
  errorsTitle,
  variant = "destructive",
  onClose,
}: Omit<
  ConfirmDialogProps<TInput, TResult>,
  "title" | "description" | "trigger" | "open" | "defaultOpen" | "onOpenChange"
> & { onClose: () => void }) {
  const { labels } = useCrudConfig();
  const { execute, isPending, serverErrors } = useCrudAction<TInput, TResult>({
    action,
    onError,
    redirectTo,
    notify,
    onMutated,
    onSuccess: (result) => {
      onSuccess?.(result);
      onClose();
    },
  });

  return (
    <>
      <FormErrors errors={serverErrors} title={errorsTitle} />

      <DialogFooter>
        <Button type="button" variant="outline" disabled={isPending} onClick={onClose}>
          {cancelLabel ?? labels.cancel}
        </Button>
        <SubmitButton
          type="button"
          variant={variant}
          loading={isPending}
          onClick={() => void execute(actionInput)}
        >
          {confirmLabel ?? labels.confirm}
        </SubmitButton>
      </DialogFooter>
    </>
  );
}

export { ConfirmDialog };
export type { ConfirmDialogProps };
