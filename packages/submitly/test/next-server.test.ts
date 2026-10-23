// @vitest-environment node
import * as nextCache from "next/cache";
import { notFound, redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { createRunAction, runAction } from "../src/next/server";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
}));

const schema = z.object({
  name: z.string().trim().min(2, "Too short"),
  items: z.array(z.object({ qty: z.number().min(1, "At least 1") })).default([]),
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("runAction", () => {
  it("returns fieldErrors keyed by dotted path when validation fails", async () => {
    const handler = vi.fn();
    const result = await runAction({
      schema: schema.refine((value) => value.name !== "root", "Root problem"),
      input: { name: "a", items: [{ qty: 0 }] },
      handler,
      revalidate: { paths: ["/products"] },
    });

    expect(result).toEqual({
      success: false,
      statusCode: 422,
      message: "Validation failed",
      errors: [],
      fieldErrors: { name: ["Too short"], "items.0.qty": ["At least 1"] },
    });
    expect(handler).not.toHaveBeenCalled();
    expect(nextCache.revalidatePath).not.toHaveBeenCalled();
  });

  it("puts root-level issues in errors", async () => {
    const result = await runAction({
      schema: z.object({ a: z.string(), b: z.string() }).refine((v) => v.a === v.b, "Must match"),
      input: { a: "x", b: "y" },
      handler: () => ({ success: true }),
    });

    expect(result.errors).toEqual(["Must match"]);
  });

  it("passes parsed output to the handler and revalidates on success", async () => {
    const handler = vi.fn(async (data: z.output<typeof schema>) => ({
      success: true,
      message: "Saved",
      data: { id: 1, name: data.name },
    }));

    const result = await runAction({
      schema,
      input: { name: "  Lamp " },
      handler,
      revalidate: {
        paths: ["/products", { path: "/products/[id]", type: "page" }],
        tags: ["products", { tag: "catalog", profile: "max" }],
      },
    });

    expect(handler).toHaveBeenCalledWith({ name: "Lamp", items: [] });
    expect(result).toEqual({ success: true, message: "Saved", data: { id: 1, name: "Lamp" } });
    expect(nextCache.revalidatePath).toHaveBeenNthCalledWith(1, "/products");
    expect(nextCache.revalidatePath).toHaveBeenNthCalledWith(2, "/products/[id]", "page");
    expect(nextCache.updateTag).toHaveBeenCalledWith("products");
    expect(nextCache.revalidateTag).toHaveBeenCalledWith("catalog", "max");
  });

  it("supports revalidate as a function of the parsed data and result", async () => {
    await runAction({
      schema,
      input: { name: "Lamp" },
      handler: () => ({ success: true, data: { id: 9 } }),
      revalidate: (data, result) => ({ paths: [`/products/${result.data?.id}`, `/search/${data.name}`] }),
    });

    expect(nextCache.revalidatePath).toHaveBeenCalledWith("/products/9");
    expect(nextCache.revalidatePath).toHaveBeenCalledWith("/search/Lamp");
  });

  it("does not revalidate when the handler reports failure", async () => {
    const result = await runAction({
      schema,
      input: { name: "Lamp" },
      handler: async () => ({ success: false, message: "Duplicate", statusCode: 409 }),
      revalidate: { paths: ["/products"], tags: ["products"] },
    });

    expect(result).toEqual({ success: false, message: "Duplicate", statusCode: 409 });
    expect(nextCache.revalidatePath).not.toHaveBeenCalled();
    expect(nextCache.updateTag).not.toHaveBeenCalled();
  });

  it("wraps non-ActionResult handler values with the default normalize, or a custom one", async () => {
    await expect(
      runAction({ schema, input: { name: "Lamp" }, handler: async () => ({ id: 3 }) }),
    ).resolves.toEqual({ success: true, data: { id: 3 } });

    await expect(
      runAction({
        schema,
        input: { name: "Lamp" },
        handler: async () => ({ ok: false, detail: "Nope" }),
        normalize: (raw) => ({ success: raw.ok, message: raw.detail }),
      }),
    ).resolves.toEqual({ success: false, message: "Nope" });
  });

  it("maps an unexpected handler error and reports it", async () => {
    const onError = vi.fn();
    const error = new Error("DB down");

    const result = await runAction({
      schema,
      input: { name: "Lamp" },
      handler: () => {
        throw error;
      },
      onError,
      revalidate: { paths: ["/products"] },
    });

    expect(result).toEqual({
      success: false,
      statusCode: 500,
      message: "Unexpected error",
      errors: ["Unexpected error"],
    });
    expect(onError).toHaveBeenCalledWith(error);
    expect(nextCache.revalidatePath).not.toHaveBeenCalled();
  });

  it("uses a custom mapError", async () => {
    const result = await runAction({
      schema,
      input: { name: "Lamp" },
      handler: () => {
        throw new Error("409");
      },
      mapError: (error) => ({ success: false, message: `HTTP ${(error as Error).message}` }),
    });

    expect(result).toEqual({ success: false, message: "HTTP 409" });
  });

  it("re-throws redirect() from the handler", async () => {
    const onError = vi.fn();
    const promise = runAction({
      schema,
      input: { name: "Lamp" },
      handler: () => redirect("/login"),
      onError,
    });

    await expect(promise).rejects.toMatchObject({ digest: expect.stringContaining("NEXT_REDIRECT") });
    expect(onError).not.toHaveBeenCalled();
  });

  it("re-throws notFound() from the handler", async () => {
    await expect(
      runAction({ schema, input: { name: "Lamp" }, handler: () => notFound() }),
    ).rejects.toMatchObject({ digest: expect.stringContaining("404") });
  });

  it("accepts message overrides as an object or an async function", async () => {
    await expect(
      runAction({ schema, input: {}, handler: vi.fn(), messages: { validation: "Ungültig" } }),
    ).resolves.toMatchObject({ message: "Ungültig" });

    await expect(
      runAction({
        schema,
        input: { name: "Lamp" },
        handler: () => {
          throw new Error();
        },
        messages: async () => ({ unexpected: "Erreur inattendue" }),
      }),
    ).resolves.toMatchObject({ message: "Erreur inattendue", errors: ["Erreur inattendue"] });
  });
});

describe("createRunAction", () => {
  it("applies app-wide defaults, with per-call options winning", async () => {
    const onError = vi.fn();
    const run = createRunAction({
      messages: () => ({ validation: "Default validation", unexpected: "Default unexpected" }),
      onError,
    });

    await expect(run({ schema, input: {}, handler: vi.fn() })).resolves.toMatchObject({
      message: "Default validation",
    });
    await expect(
      run({ schema, input: {}, handler: vi.fn(), messages: { validation: "Per call" } }),
    ).resolves.toMatchObject({ message: "Per call" });

    await run({
      schema,
      input: { name: "Lamp" },
      handler: () => {
        throw new Error("x");
      },
    });
    expect(onError).toHaveBeenCalledOnce();
  });
});
