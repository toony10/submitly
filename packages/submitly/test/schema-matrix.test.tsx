import type { StandardSchemaV1 } from "@standard-schema/spec";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { type } from "arktype";
import * as v from "valibot";
import { describe, expect, it, vi } from "vitest";
import { z as z4 } from "zod";
import { z as z3 } from "zod3";

import { useCrudForm } from "../src";

/** Same shape in every library: name ≥ 2 chars (trimmed), qty parsed from a string. */
type Input = { name: string; qty: string };
type Output = { name: string; qty: number };

const schemas: Record<string, StandardSchemaV1<Input, Output>> = {
  "zod 3": z3.object({
    name: z3.string().trim().min(2, "Too short"),
    qty: z3.string().transform(Number),
  }),
  "zod 4": z4.object({
    name: z4.string().trim().min(2, "Too short"),
    qty: z4.string().transform(Number),
  }),
  valibot: v.object({
    name: v.pipe(v.string(), v.trim(), v.minLength(2, "Too short")),
    qty: v.pipe(v.string(), v.transform(Number)),
  }),
  arktype: type({
    name: type("string").pipe((value) => value.trim()).to(type("string >= 2").configure({ message: "Too short" })),
    qty: type("string").pipe(Number),
  }),
};

function Form({ schema, action }: { schema: StandardSchemaV1<Input, Output>; action: (values: Output) => Promise<unknown> }) {
  const { form, onSubmit } = useCrudForm({
    schema,
    defaultValues: { name: "", qty: "1" },
    action,
    resetOnSuccess: false,
  });

  return (
    <form onSubmit={onSubmit} aria-label="matrix">
      <input aria-label="name" {...form.register("name")} />
      <span data-testid="error">{form.formState.errors.name?.message}</span>
    </form>
  );
}

describe.each(Object.entries(schemas))("schema matrix: %s", (_name, schema) => {
  it("blocks invalid input with a field error", async () => {
    const action = vi.fn(async () => ({ success: true }));
    render(<Form schema={schema} action={action} />);

    fireEvent.change(screen.getByLabelText("name"), { target: { value: " a " } });
    await act(async () => fireEvent.submit(screen.getByRole("form")));

    await waitFor(() => expect(screen.getByTestId("error").textContent).not.toBe(""));
    expect(action).not.toHaveBeenCalled();
  });

  it("passes the transformed output to the action", async () => {
    const action = vi.fn(async () => ({ success: true }));
    render(<Form schema={schema} action={action} />);

    fireEvent.change(screen.getByLabelText("name"), { target: { value: "  Lamp " } });
    await act(async () => fireEvent.submit(screen.getByRole("form")));

    await waitFor(() => expect(action).toHaveBeenCalledWith({ name: "Lamp", qty: 1 }));
  });

  it("applies server fieldErrors to the field", async () => {
    render(
      <Form
        schema={schema}
        action={async () => ({ success: false, fieldErrors: { name: ["Taken"] } })}
      />,
    );

    fireEvent.change(screen.getByLabelText("name"), { target: { value: "Lamp" } });
    await act(async () => fireEvent.submit(screen.getByRole("form")));

    await waitFor(() => expect(screen.getByTestId("error").textContent).toBe("Taken"));
  });
});
