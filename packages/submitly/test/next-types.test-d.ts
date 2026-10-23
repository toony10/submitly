import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";

import type { ActionResult } from "../src";
import { createRunAction, runAction } from "../src/next/server";

type Product = { id: number; name: string };

const schema = z.object({ name: z.string(), price: z.string().transform(Number) });

describe("runAction types", () => {
  it("passes the schema output to the handler and infers TData from ActionResult", () => {
    const result = runAction({
      schema,
      input: {} as unknown,
      handler: async (data): Promise<ActionResult<Product>> => {
        expectTypeOf(data).toEqualTypeOf<{ name: string; price: number }>();
        return { success: true, data: { id: 1, name: data.name } };
      },
      revalidate: (data, result) => {
        expectTypeOf(data.price).toEqualTypeOf<number>();
        expectTypeOf(result.data).toEqualTypeOf<Product | undefined>();
        return { paths: ["/products"] };
      },
    });

    expectTypeOf(result).toEqualTypeOf<Promise<ActionResult<Product>>>();
  });

  it("uses a raw handler value as data, or the normalize output", () => {
    expectTypeOf(
      runAction({ schema, input: null, handler: async () => ({ id: 1, name: "x" }) as Product }),
    ).toEqualTypeOf<Promise<ActionResult<Product>>>();

    expectTypeOf(
      runAction({ schema, input: null, handler: async () => {} }),
    ).toEqualTypeOf<Promise<ActionResult<undefined>>>();

    expectTypeOf(
      runAction({
        schema,
        input: null,
        handler: async () => ({ ok: true, payload: 42 }),
        normalize: (raw) => ({ success: raw.ok, data: String(raw.payload) }),
      }),
    ).toEqualTypeOf<Promise<ActionResult<string>>>();
  });

  it("keeps the same signature through createRunAction", () => {
    const run = createRunAction({ messages: { validation: "x" } });

    expectTypeOf(
      run({ schema, input: null, handler: async (data) => data.price }),
    ).toEqualTypeOf<Promise<ActionResult<number>>>();
  });
});
