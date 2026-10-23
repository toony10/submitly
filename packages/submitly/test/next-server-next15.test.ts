// @vitest-environment node
import * as nextCache from "next/cache";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { runAction } from "../src/next/server";

// Next 15's next/cache has no updateTag (explicit undefined: vitest mocks throw on missing exports).
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn(), updateTag: undefined }));

describe("runAction on Next 15", () => {
  it("expires plain tags with revalidateTag(tag)", async () => {
    await runAction({
      schema: z.object({ name: z.string() }),
      input: { name: "Lamp" },
      handler: () => ({ success: true }),
      revalidate: { tags: ["products"] },
    });

    expect(nextCache.revalidateTag).toHaveBeenCalledWith("products");
  });
});
