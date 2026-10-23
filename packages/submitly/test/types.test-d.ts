import * as v from "valibot";
import { describe, expectTypeOf, it } from "vitest";
import { z as z4 } from "zod";
import { z as z3 } from "zod3";

import {
  useCrudAction,
  useCrudForm,
  type ActionResult,
  type InferResultData,
} from "../src";

type Product = { id: number; name: string };

declare function saveProduct(input: unknown): Promise<ActionResult<Product>>;

/** The `optionalString` helper from the original kit, in both Zod majors. */
function optionalString4<T extends z4.ZodType<string, string>>(schema: T) {
  return z4
    .union([z4.string(), z4.undefined()])
    .transform((value) => (value?.trim() ? value.trim() : undefined))
    .pipe(z4.union([schema, z4.undefined()]));
}

function optionalString3<T extends z3.ZodType<string, z3.ZodTypeDef, string>>(schema: T) {
  return z3
    .union([z3.string(), z3.undefined()])
    .transform((value) => (value?.trim() ? value.trim() : undefined))
    .pipe(z3.union([schema, z3.undefined()]));
}

describe("InferResultData", () => {
  it("extracts TData from ActionResult and falls back to unknown", () => {
    expectTypeOf<InferResultData<ActionResult<Product>>>().toEqualTypeOf<Product>();
    expectTypeOf<InferResultData<{ success: true; data: string }>>().toEqualTypeOf<string>();
    expectTypeOf<InferResultData<Product>>().toEqualTypeOf<unknown>();
    expectTypeOf<InferResultData<void>>().toEqualTypeOf<unknown>();
  });
});

describe("useCrudForm types", () => {
  it("separates schema input (form values) from output (action values) with Zod 4", () => {
    const schema = z4.object({
      name: z4.string().trim().min(1),
      price: z4.string().transform(Number),
      sku: optionalString4(z4.string().max(10)),
    });

    const { form } = useCrudForm({
      schema,
      defaultValues: { name: "", price: "0" },
      action: async (values) => {
        expectTypeOf(values).toEqualTypeOf<{ name: string; price: number; sku: string | undefined }>();
        return saveProduct(values);
      },
      onSuccess: (result) => {
        expectTypeOf(result.data).toEqualTypeOf<Product | undefined>();
      },
    });

    expectTypeOf(form.getValues().price).toEqualTypeOf<string>();
  });

  it("handles Zod 3 transform + pipe", () => {
    const schema = z3.object({ sku: optionalString3(z3.string().max(10)), qty: z3.string().transform(Number) });

    useCrudForm({
      schema,
      action: async (values) => {
        expectTypeOf(values.sku).toEqualTypeOf<string | undefined>();
        expectTypeOf(values.qty).toEqualTypeOf<number>();
        return { success: true };
      },
    });
  });

  it("infers Valibot input and output", () => {
    const schema = v.object({ qty: v.pipe(v.string(), v.transform(Number)) });

    const { form } = useCrudForm({
      schema,
      action: async (values) => {
        expectTypeOf(values).toEqualTypeOf<{ qty: number }>();
      },
      onSuccess: (result) => {
        expectTypeOf(result.data).toEqualTypeOf<unknown>();
      },
    });

    expectTypeOf(form.getValues()).toEqualTypeOf<{ qty: string }>();
  });

  it("rejects defaultValues that don't match the schema input", () => {
    const schema = z4.object({ name: z4.string() });

    useCrudForm({
      schema,
      // @ts-expect-error — unknown field
      defaultValues: { nope: "" },
      action: async () => ({ success: true }),
    });
  });

  it("rejects an action that can't accept the schema output", () => {
    const schema = z4.object({ qty: z4.string().transform(Number) });

    useCrudForm({
      schema,
      // @ts-expect-error — action expects a string qty, schema outputs a number
      action: async (values: { qty: string }) => values,
    });
  });
});

describe("useCrudAction types", () => {
  it("infers input and data", () => {
    const { execute } = useCrudAction({
      action: (id: string) => saveProduct(id),
      onSuccess: (result) => {
        expectTypeOf(result.data).toEqualTypeOf<Product | undefined>();
      },
      redirectTo: (result) => `/products/${result.data?.id}`,
    });

    expectTypeOf(execute).parameter(0).toEqualTypeOf<string>();
    expectTypeOf(execute).returns.toEqualTypeOf<Promise<ActionResult<Product>>>();
  });

  it("allows execute() without arguments for input-less actions", () => {
    const { execute } = useCrudAction({ action: async () => ({ success: true }) });

    execute();
  });
});
