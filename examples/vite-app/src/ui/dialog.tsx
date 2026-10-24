import { useEffect, useRef, type ReactNode } from "react";
import { DialogLockProvider, useControllableDialog, useDialogLockScope } from "submitly";

/**
 * A native <dialog> wired to submitly's headless helpers: `openKey` remounts
 * the content on every open, and the form inside locks the dialog (Escape,
 * backdrop click, close button) while it is saving.
 */
export function Dialog({
  title,
  trigger,
  children,
}: {
  title: string;
  trigger: (open: () => void) => ReactNode;
  children: (props: { formKey: number; onClose: () => void }) => ReactNode;
}) {
  const lock = useDialogLockScope();
  const dialog = useControllableDialog({ locked: lock.isLocked });
  const ref = useRef<HTMLDialogElement>(null);
  const { open, setOpen, openKey } = dialog;

  useEffect(() => {
    const element = ref.current;

    if (open && !element?.open) element?.showModal();
    if (!open && element?.open) element.close();
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      {trigger(() => setOpen(true))}
      <dialog
        ref={ref}
        className="dialog"
        aria-busy={lock.locked || undefined}
        // Route Escape through setOpen, which ignores it while locked.
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        // Chrome closes a modal dialog on a repeated Escape even though `cancel` was
        // prevented, so put it back while a save is in flight.
        onClose={() => {
          if (lock.isLocked() && ref.current && !ref.current.open) ref.current.showModal();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
      >
        {open ? (
          <div className="dialog-body">
            <header className="dialog-header">
              <h2>{title}</h2>
              <button type="button" className="icon-btn" onClick={close} disabled={lock.locked} aria-label="Close">
                ×
              </button>
            </header>
            {lock.locked ? <p className="dialog-locked">Saving — the dialog is locked until the server answers.</p> : null}
            <DialogLockProvider scope={lock.scope}>{children({ formKey: openKey, onClose: close })}</DialogLockProvider>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
