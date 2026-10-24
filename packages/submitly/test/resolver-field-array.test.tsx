import { act, fireEvent, render, screen } from "@testing-library/react";
import { useFieldArray } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { useCrudForm } from "../src";

const schema = z.object({
  items: z
    .array(z.object({ sku: z.string().min(2, "Too short").regex(/^[a-z]+$/, "Letters only") }))
    .min(2, "Add at least two items"),
});

type Values = z.input<typeof schema>;

function ItemsForm({
  action,
  items = [{ sku: "1" }],
  formOptions,
}: {
  action: () => Promise<unknown>;
  items?: Values["items"];
  formOptions?: { criteriaMode?: "all" | "firstError" };
}) {
  const { form, onSubmit } = useCrudForm({
    schema,
    defaultValues: { items },
    action,
    formOptions,
  });
  const { fields } = useFieldArray({ control: form.control, name: "items" });
  const errors = form.formState.errors.items;

  return (
    <form onSubmit={onSubmit} aria-label="items">
      {fields.map((field, index) => (
        <input key={field.id} aria-label={`sku ${index}`} {...form.register(`items.${index}.sku`)} />
      ))}
      <span data-testid="root-error">{errors?.root?.message}</span>
      <span data-testid="item-error">{errors?.[0]?.sku?.message}</span>
      <span data-testid="item-types">{JSON.stringify(errors?.[0]?.sku?.types ?? null)}</span>
      <button type="submit">Save</button>
    </form>
  );
}

async function submit() {
  await act(async () => {
    fireEvent.submit(screen.getByRole("form", { name: "items" }));
  });
}

describe("standardSchemaResolver through useCrudForm and useFieldArray", () => {
  it("shows an array root error beside an item error, and never calls the action", async () => {
    const action = vi.fn(async () => ({ success: true }));

    render(<ItemsForm action={action} />);
    await submit();

    expect(screen.getByTestId("root-error").textContent).toBe("Add at least two items");
    expect(screen.getByTestId("item-error").textContent).toBe("Too short");
    // Default criteriaMode: the first message wins and no `types` are collected.
    expect(screen.getByTestId("item-types").textContent).toBe("null");
    expect(action).not.toHaveBeenCalled();
  });

  it("collects every message of an item under formOptions.criteriaMode all", async () => {
    render(<ItemsForm action={vi.fn()} formOptions={{ criteriaMode: "all" }} />);
    await submit();

    expect(screen.getByTestId("root-error").textContent).toBe("Add at least two items");
    expect(screen.getByTestId("item-error").textContent).toBe("Too short");
    expect(JSON.parse(screen.getByTestId("item-types").textContent ?? "")).toEqual({
      0: "Too short",
      1: "Letters only",
    });
  });

  it("clears the errors and calls the action once the array and its items are valid", async () => {
    const action = vi.fn(async () => ({ success: true }));

    render(<ItemsForm action={action} items={[{ sku: "ab" }, { sku: "cd" }]} />);
    await submit();

    expect(action).toHaveBeenCalledWith({ items: [{ sku: "ab" }, { sku: "cd" }] });
    expect(screen.getByTestId("root-error").textContent).toBe("");
    expect(screen.getByTestId("item-error").textContent).toBe("");
  });
});
