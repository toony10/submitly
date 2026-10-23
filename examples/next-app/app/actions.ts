"use server";

import { redirect } from "next/navigation";
import { runAction } from "submitly/next/server";
import { z } from "zod";

import { productSchema } from "@/lib/schema";
import { store } from "@/lib/store";

export async function createProduct(input: unknown) {
  return runAction({
    schema: productSchema,
    input,
    handler: (data) => {
      try {
        const product = store.add(data);
        return { success: true, message: `Created ${product.name}`, data: product };
      } catch {
        return {
          success: false,
          message: "Could not create product",
          fieldErrors: { name: ["A product with this name already exists"] },
        };
      }
    },
    revalidate: { paths: ["/"] },
  });
}

export async function deleteProduct(id: unknown) {
  return runAction({
    schema: z.number().int(),
    input: id,
    handler: (productId) => {
      store.remove(productId);
      return { success: true, message: "Deleted" };
    },
    revalidate: { paths: ["/"] },
  });
}

/** Simulates an expired session: the action redirects instead of returning. */
export async function expiredSessionAction() {
  return runAction({
    schema: z.unknown(),
    input: null,
    handler: () => redirect("/login"),
  });
}
