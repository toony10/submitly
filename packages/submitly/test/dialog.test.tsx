import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { useEffect, useState, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import {
  DialogLockProvider,
  useControllableDialog,
  useCrudAction,
  useCrudForm,
  useDialogLock,
  useDialogLockScope,
  type ActionResult,
} from "../src";
import { deferred } from "./helpers";

/** Minimal headless dialog wrapping a form. */
function TestDialog({
  open,
  onOpenChange,
  isPending = false,
  children,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  isPending?: boolean;
  children: (props: { formKey: number; onClose: () => void }) => ReactNode;
}) {
  const lock = useDialogLockScope();
  const dialog = useControllableDialog({
    open,
    onOpenChange,
    locked: () => lock.isLocked() || isPending,
  });

  return (
    <>
      <button onClick={() => dialog.setOpen(true)}>open</button>
      <button onClick={() => dialog.setOpen(false)}>escape</button>
      <span data-testid="locked">{String(lock.locked)}</span>
      {dialog.open ? (
        <DialogLockProvider scope={lock.scope}>
          <div data-testid="content">
            {children({ formKey: dialog.openKey, onClose: () => dialog.setOpen(false) })}
          </div>
        </DialogLockProvider>
      ) : null}
    </>
  );
}

const mounts: number[] = [];

function Probe({ id }: { id: number }) {
  useEffect(() => {
    mounts.push(id);
  }, [id]);

  return <span data-testid="probe">{id}</span>;
}

describe("useControllableDialog", () => {
  it("bumps openKey on every uncontrolled closed → open transition", () => {
    const { result } = renderHook(() => useControllableDialog());

    expect(result.current.openKey).toBe(0);
    act(() => result.current.setOpen(true));
    expect(result.current.openKey).toBe(1);
    act(() => result.current.setOpen(true));
    expect(result.current.openKey).toBe(1);
    act(() => result.current.setOpen(false));
    act(() => result.current.setOpen(true));
    expect(result.current.openKey).toBe(2);
  });

  it("bumps openKey when a controlled open prop flips to true", () => {
    const onOpenChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ open }) => useControllableDialog({ open, onOpenChange }),
      { initialProps: { open: false } },
    );

    rerender({ open: true });
    expect(result.current.openKey).toBe(1);
    rerender({ open: false });
    rerender({ open: true });
    expect(result.current.openKey).toBe(2);

    act(() => result.current.setOpen(false));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(result.current.open).toBe(true);
  });

  it("ignores changes while locked", () => {
    const onOpenChange = vi.fn();
    const { result } = renderHook(() =>
      useControllableDialog({ defaultOpen: true, onOpenChange, locked: true }),
    );

    act(() => result.current.setOpen(false));

    expect(result.current.open).toBe(true);
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});

describe("dialog remount", () => {
  it("remounts content on uncontrolled reopen", () => {
    mounts.length = 0;
    render(<TestDialog>{({ formKey }) => <Probe key={formKey} id={formKey} />}</TestDialog>);

    fireEvent.click(screen.getByText("open"));
    fireEvent.click(screen.getByText("escape"));
    fireEvent.click(screen.getByText("open"));

    expect(mounts).toEqual([1, 2]);
  });

  it("remounts content on controlled reopen", () => {
    mounts.length = 0;

    function Controlled() {
      const [open, setOpen] = useState(false);

      return (
        <>
          <button onClick={() => setOpen((value) => !value)}>toggle</button>
          <TestDialog open={open} onOpenChange={setOpen}>
            {({ formKey }) => <Probe key={formKey} id={formKey} />}
          </TestDialog>
        </>
      );
    }

    render(<Controlled />);
    fireEvent.click(screen.getByText("toggle"));
    fireEvent.click(screen.getByText("toggle"));
    fireEvent.click(screen.getByText("toggle"));

    expect(mounts).toEqual([1, 2]);
  });
});

describe("dialog lock", () => {
  const schema = z.object({ name: z.string() });

  function DialogForm({ action, onClose }: { action: () => Promise<ActionResult>; onClose: () => void }) {
    const { form, onSubmit } = useCrudForm({
      schema,
      defaultValues: { name: "x" },
      action,
      onSuccess: onClose,
    });

    return (
      <form onSubmit={onSubmit} aria-label="dialog-form">
        <input {...form.register("name")} />
      </form>
    );
  }

  it("locks the enclosing dialog while the form submits, then closes on success", async () => {
    const pending = deferred<ActionResult>();
    render(
      <TestDialog>
        {({ formKey, onClose }) => (
          <DialogForm key={formKey} action={() => pending.promise} onClose={onClose} />
        )}
      </TestDialog>,
    );

    fireEvent.click(screen.getByText("open"));
    await act(async () => {
      fireEvent.submit(screen.getByRole("form", { name: "dialog-form" }));
    });

    expect(screen.getByTestId("locked").textContent).toBe("true");
    fireEvent.click(screen.getByText("escape"));
    expect(screen.getByTestId("content")).toBeTruthy();

    await act(async () => pending.resolve({ success: true }));

    expect(screen.queryByTestId("content")).toBeNull();
    expect(screen.getByTestId("locked").textContent).toBe("false");
  });

  it("isPending prop locks manually", () => {
    render(<TestDialog isPending>{() => <span>body</span>}</TestDialog>);

    fireEvent.click(screen.getByText("open"));

    expect(screen.queryByTestId("content")).toBeNull();
  });

  it("useDialogLock is a no-op outside a dialog", () => {
    expect(() => renderHook(() => useDialogLock(true))).not.toThrow();
  });

  /** Headless confirm dialog. */
  function Confirm({ action }: { action: () => Promise<ActionResult> }) {
    return (
      <TestDialog>
        {({ onClose }) => <ConfirmBody action={action} onClose={onClose} />}
      </TestDialog>
    );
  }

  function ConfirmBody({ action, onClose }: { action: () => Promise<ActionResult>; onClose: () => void }) {
    const { execute, serverErrors } = useCrudAction({ action, onSuccess: onClose });

    return (
      <>
        <button onClick={() => void execute()}>confirm</button>
        <span data-testid="errors">{serverErrors.join(",")}</span>
      </>
    );
  }

  it("confirm closes on success only", async () => {
    const action = vi
      .fn<() => Promise<ActionResult>>()
      .mockResolvedValueOnce({ success: false, errors: ["In use"] })
      .mockResolvedValueOnce({ success: true });
    render(<Confirm action={action} />);

    fireEvent.click(screen.getByText("open"));
    await act(async () => fireEvent.click(screen.getByText("confirm")));

    expect(screen.getByTestId("errors").textContent).toBe("In use");

    await act(async () => fireEvent.click(screen.getByText("confirm")));

    expect(screen.queryByTestId("content")).toBeNull();
  });

  it("locks the dialog while a confirm action is pending", async () => {
    const pending = deferred<ActionResult>();
    render(<Confirm action={() => pending.promise} />);

    fireEvent.click(screen.getByText("open"));
    await act(async () => fireEvent.click(screen.getByText("confirm")));

    expect(screen.getByTestId("locked").textContent).toBe("true");
    fireEvent.click(screen.getByText("escape"));
    expect(screen.getByTestId("content")).toBeTruthy();

    await act(async () => pending.resolve({ success: false }));
    expect(screen.getByTestId("locked").textContent).toBe("false");
  });
});
