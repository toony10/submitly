import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect, useState } from "react";
import { CrudProvider, useCrudForm, type ActionResult } from "submitly";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Form, FormControl, FormField, FormItem, FormMessage, useFormField } from "@/components/ui/form";
import { FormDialog } from "@/components/ui/form-dialog";
import { FormErrors } from "@/components/ui/form-errors";
import { SubmitButton } from "@/components/ui/submit-button";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

const schema = z.object({ name: z.string().min(1, "Required") });

function ProductForm({
  action,
  onClose,
}: {
  action: (values: { name: string }) => Promise<ActionResult>;
  onClose: () => void;
}) {
  const { form, onSubmit, serverErrors, isSubmitting } = useCrudForm({
    schema,
    defaultValues: { name: "" },
    action,
    onSuccess: onClose,
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} aria-label="product">
        <FormErrors errors={serverErrors} />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <input aria-label="name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <SubmitButton loading={isSubmitting}>Save</SubmitButton>
      </form>
    </Form>
  );
}

const pressEscape = () =>
  fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });

describe("FormDialog", () => {
  it("locks while the inner form submits and closes on success", async () => {
    const pending = deferred<ActionResult>();
    render(
      <FormDialog title="Add product" trigger={<button>Add</button>}>
        {({ onClose, formKey }) => (
          <ProductForm key={formKey} action={() => pending.promise} onClose={onClose} />
        )}
      </FormDialog>,
    );

    fireEvent.click(screen.getByText("Add"));
    fireEvent.change(screen.getByLabelText("name"), { target: { value: "Lamp" } });
    await act(async () => fireEvent.submit(screen.getByRole("form", { name: "product" })));

    expect(screen.queryByText("Close")).toBeNull();
    expect(screen.getByRole("button", { name: "Save" })).toHaveProperty("disabled", true);
    pressEscape();
    expect(screen.getByRole("dialog")).toBeTruthy();

    await act(async () => pending.resolve({ success: true }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("stays open and shows field + form errors on failure", async () => {
    render(
      <FormDialog title="Add product" defaultOpen>
        {({ onClose }) => (
          <ProductForm
            action={async () => ({
              success: false,
              errors: ["Quota reached", "Quota reached"],
              fieldErrors: { name: ["Taken"] },
            })}
            onClose={onClose}
          />
        )}
      </FormDialog>,
    );

    fireEvent.change(screen.getByLabelText("name"), { target: { value: "Lamp" } });
    await act(async () => fireEvent.submit(screen.getByRole("form", { name: "product" })));

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Taken")).toBeTruthy();
    expect(screen.getAllByText("Quota reached")).toHaveLength(2);
    expect(screen.getByText("Close")).toBeTruthy();
  });

  it("remounts its content on controlled reopen", () => {
    const mounts: number[] = [];

    function Probe({ formKey }: { formKey: number }) {
      useEffect(() => {
        mounts.push(formKey);
      }, [formKey]);
      return <p>probe</p>;
    }

    function Controlled() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>edit</button>
          <FormDialog title="Edit" open={open} onOpenChange={setOpen}>
            {({ formKey }) => <Probe key={formKey} formKey={formKey} />}
          </FormDialog>
        </>
      );
    }

    render(<Controlled />);
    fireEvent.click(screen.getByText("edit"));
    pressEscape();
    fireEvent.click(screen.getByText("edit"));

    expect(mounts).toEqual([1, 2]);
  });
});

describe("ConfirmDialog", () => {
  it("uses provider labels, shows errors on failure and closes on success only", async () => {
    const action = vi
      .fn<(id: number) => Promise<ActionResult>>()
      .mockResolvedValueOnce({ success: false, errors: ["Product is in use"] })
      .mockResolvedValueOnce({ success: true });
    const onSuccess = vi.fn();

    render(
      <CrudProvider labels={{ confirm: "Löschen", cancel: "Abbrechen", errorsTitle: "Fehler" }}>
        <ConfirmDialog
          title="Delete product?"
          trigger={<button>Delete</button>}
          action={action}
          actionInput={42}
          onSuccess={onSuccess}
        />
      </CrudProvider>,
    );

    fireEvent.click(screen.getByText("Delete"));
    await act(async () => fireEvent.click(screen.getByText("Löschen")));

    expect(action).toHaveBeenCalledWith(42);
    expect(screen.getByText("Fehler")).toBeTruthy();
    expect(screen.getByText("Product is in use")).toBeTruthy();
    expect(screen.getByRole("dialog")).toBeTruthy();

    await act(async () => fireEvent.click(screen.getByText("Löschen")));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it("locks while pending", async () => {
    const pending = deferred<ActionResult>();
    render(
      <ConfirmDialog
        title="Archive?"
        defaultOpen
        variant="default"
        confirmLabel="Archive"
        action={() => pending.promise}
        actionInput={undefined}
      />,
    );

    await act(async () => fireEvent.click(screen.getByText("Archive")));

    expect(screen.getByRole("button", { name: "Cancel" })).toHaveProperty("disabled", true);
    expect(screen.queryByText("Close")).toBeNull();
    pressEscape();
    expect(screen.getByRole("dialog")).toBeTruthy();

    await act(async () => pending.resolve({ success: false }));
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveProperty("disabled", false);
  });
});

describe("FormErrors", () => {
  it("renders nothing without errors and hides the title with null", () => {
    const { container, rerender } = render(<FormErrors errors={[]} />);
    expect(container.innerHTML).toBe("");

    rerender(<FormErrors errors={["a"]} title={null} />);
    expect(screen.getByRole("alert").querySelectorAll("p")).toHaveLength(0);
  });
});

describe("Form", () => {
  it("useFormField throws outside <FormField>", () => {
    function Orphan() {
      useFormField();
      return null;
    }

    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Orphan />)).toThrow("useFormField should be used within <FormField>");
  });
});
