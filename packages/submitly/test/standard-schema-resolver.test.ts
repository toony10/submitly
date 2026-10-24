import type { StandardSchemaV1 } from "@standard-schema/spec";
import { type } from "arktype";
import type { FieldValues, ResolverOptions } from "react-hook-form";
import * as v from "valibot";
import { describe, expect, it, vi } from "vitest";
import { z as z4 } from "zod";
import { z as z3 } from "zod3";

import { standardSchemaResolver } from "../src/react/standard-schema-resolver";

type Input = { user: { name: string }; items: { sku: string }[]; qty: string };
type Output = { user: { name: string }; items: { sku: string }[]; qty: number };

const schemas: Record<string, StandardSchemaV1<Input, Output>> = {
  "zod 3": z3.object({
    user: z3.object({ name: z3.string().trim().min(2, "Too short") }),
    items: z3.array(z3.object({ sku: z3.string().min(1, "SKU required") })).min(1, "Add an item"),
    qty: z3.string().transform(Number),
  }),
  "zod 4": z4.object({
    user: z4.object({ name: z4.string().trim().min(2, "Too short") }),
    items: z4.array(z4.object({ sku: z4.string().min(1, "SKU required") })).min(1, "Add an item"),
    qty: z4.string().transform(Number),
  }),
  valibot: v.object({
    user: v.object({ name: v.pipe(v.string(), v.trim(), v.minLength(2, "Too short")) }),
    items: v.pipe(v.array(v.object({ sku: v.pipe(v.string(), v.minLength(1, "SKU required")) })), v.minLength(1, "Add an item")),
    qty: v.pipe(v.string(), v.transform(Number)),
  }),
  arktype: type({
    user: { name: type("string").pipe((value) => value.trim()).to(type("string >= 2").configure({ message: "Too short" })) },
    items: type({ sku: type("string >= 1").configure({ message: "SKU required" }) }).array().atLeastLength(1).configure({ message: "Add an item" }),
    qty: type("string").pipe(Number),
  }) as unknown as StandardSchemaV1<Input, Output>,
};

function options<T extends FieldValues = FieldValues>(overrides: Partial<ResolverOptions<FieldValues>> = {}): ResolverOptions<T> {
  return { fields: {}, names: [], criteriaMode: "firstError", shouldUseNativeValidation: false, ...overrides } as unknown as ResolverOptions<T>;
}

const valid: Input = { user: { name: " ab " }, items: [{ sku: "x" }], qty: "3" };

describe.each(Object.entries(schemas))("standardSchemaResolver: %s", (_name, schema) => {
  const resolver = standardSchemaResolver<FieldValues, unknown, Output>(schema as StandardSchemaV1<FieldValues, Output>);

  it("returns the parsed output (transforms applied) on success", async () => {
    const result = await resolver(valid, undefined, options());

    expect(result.errors).toEqual({});
    expect(result.values).toEqual({ user: { name: "ab" }, items: [{ sku: "x" }], qty: 3 });
  });

  it("nests errors by dotted path", async () => {
    const result = await resolver({ ...valid, user: { name: "a" } }, undefined, options());

    expect(result.values).toEqual({});
    expect(result.errors).toMatchObject({ user: { name: { message: "Too short" } } });
  });

  it("nests array item errors by index", async () => {
    const result = await resolver({ ...valid, items: [{ sku: "x" }, { sku: "" }] }, undefined, options());

    expect(result.errors).toMatchObject({ items: [undefined, { sku: { message: "SKU required" } }] });
  });

  it("puts array-level errors under `root` when the array is registered", async () => {
    const result = await resolver({ ...valid, items: [] }, undefined, options({ names: ["items.0.sku", "qty"] }));

    expect(result.errors).toMatchObject({ items: { root: { message: "Add an item" } } });
  });

  it("collects every message with criteriaMode all", async () => {
    const result = await resolver(
      { user: { name: "" }, items: [{ sku: "" }], qty: "1" },
      undefined,
      options({ criteriaMode: "all" }),
    );

    expect(result.errors).toMatchObject({
      user: { name: { types: { 0: "Too short" } } },
      items: [{ sku: { types: { 0: "SKU required" } } }],
    });
  });

  it("omits `types` unless criteriaMode is all", async () => {
    const result = await resolver({ ...valid, user: { name: "a" } }, undefined, options());

    expect((result.errors as { user: { name: object } }).user.name).not.toHaveProperty("types");
  });
});

describe("standardSchemaResolver", () => {
  it("awaits an async validate", async () => {
    const schema: StandardSchemaV1<{ name: string }, { name: string }> = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate: async (value) => {
          await Promise.resolve();
          const input = value as { name: string };

          return input.name === "taken"
            ? { issues: [{ message: "Name taken", path: ["name"] }] }
            : { value: { name: input.name.toUpperCase() } };
        },
      },
    };
    const resolver = standardSchemaResolver<{ name: string }, unknown, { name: string }>(schema);

    expect((await resolver({ name: "taken" }, undefined, options())).errors).toMatchObject({ name: { message: "Name taken" } });
    expect(await resolver({ name: "free" }, undefined, options())).toEqual({ values: { name: "FREE" }, errors: {} });
  });

  it("supports async refinements in zod 4 and valibot", async () => {
    const check = async (name: string) => name !== "taken";
    const zod = z4.object({ name: z4.string().refine(check, "Name taken") });
    const valibot = v.objectAsync({ name: v.pipeAsync(v.string(), v.checkAsync(check, "Name taken")) });

    for (const schema of [zod, valibot] as StandardSchemaV1<{ name: string }, { name: string }>[]) {
      const resolver = standardSchemaResolver<{ name: string }, unknown, { name: string }>(schema);

      expect((await resolver({ name: "taken" }, undefined, options())).errors).toMatchObject({ name: { message: "Name taken" } });
      expect((await resolver({ name: "free" }, undefined, options())).errors).toEqual({});
    }
  });

  it("keeps all root-level messages and merges them into `root`", async () => {
    const schema = z4.object({ a: z4.string() }).superRefine((_value, ctx) => {
      ctx.addIssue({ code: "custom", message: "First" });
      ctx.addIssue({ code: "custom", message: "Second" });
    });
    const resolver = standardSchemaResolver<{ a: string }, unknown, { a: string }>(schema);
    const result = await resolver({ a: "x" }, undefined, options({ criteriaMode: "all" }));

    expect(result.errors).toMatchObject({ root: { message: "First\nSecond", types: { 0: "First", 1: "Second" } } });
  });

  it("merges root issues into an existing `root` field error", async () => {
    const schema: StandardSchemaV1<FieldValues, unknown> = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate: () => ({
          issues: [{ message: "Field root", path: ["root"] }, { message: "Form level" }],
        }),
      },
    };
    const resolver = standardSchemaResolver<FieldValues, unknown, unknown>(schema);
    const result = await resolver({}, undefined, options());

    expect(result.errors).toMatchObject({ root: { message: "Field root\nForm level" } });
  });

  it("attaches the registered ref to each error", async () => {
    const ref = { name: "name" };
    const resolver = standardSchemaResolver<{ name: string }, unknown, { name: string }>(
      z4.object({ name: z4.string().min(2, "Too short") }),
    );
    const result = await resolver({ name: "" }, undefined, options<{ name: string }>({ fields: { name: { ref, name: "name" } } as never }));

    expect((result.errors as { name: { ref: unknown } }).name.ref).toBe(ref);
  });

  it("reports native validity when shouldUseNativeValidation is set", async () => {
    const ref = { setCustomValidity: vi.fn(), reportValidity: vi.fn(() => false) };
    const resolver = standardSchemaResolver<{ name: string }, unknown, { name: string }>(
      z4.object({ name: z4.string().min(2, "Too short") }),
    );
    const opts = options<{ name: string }>({ shouldUseNativeValidation: true, criteriaMode: "all", fields: { name: { ref, name: "name" } } as never });

    const failed = await resolver({ name: "" }, undefined, opts);
    expect(ref.setCustomValidity).toHaveBeenLastCalledWith("Too short");
    expect(ref.reportValidity).toHaveBeenCalled();
    // `types` is skipped under native validation.
    expect((failed.errors as { name: object }).name).not.toHaveProperty("types");

    await resolver({ name: "ok" }, undefined, opts);
    expect(ref.setCustomValidity).toHaveBeenLastCalledWith("");
  });
});
