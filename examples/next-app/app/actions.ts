"use server";

import { redirect } from "next/navigation";
import { runAction } from "submitly/next/server";
import { z } from "zod";

import { productSchema, productUpdateSchema } from "@/lib/schema";
import { DuplicateNameError, store } from "@/lib/store";

const duplicateName = () => ({
  success: false,
  message: "Could not save the product",
  fieldErrors: { name: ["A product with this name already exists"] },
});

export async function createProduct(input: unknown) {
  return runAction({
    schema: productSchema,
    input,
    handler: async (data) => {
      await store.wait();

      try {
        const product = store.add(data);
        return { success: true, message: `Created “${product.name}”`, data: product };
      } catch (error) {
        if (error instanceof DuplicateNameError) return duplicateName();
        throw error;
      }
    },
    revalidate: { paths: ["/"] },
  });
}

export async function updateProduct(input: unknown) {
  return runAction({
    schema: productUpdateSchema,
    input,
    handler: async (data) => {
      await store.wait();

      try {
        const product = store.update(data);
        return { success: true, message: `Updated “${product.name}”`, data: product };
      } catch (error) {
        if (error instanceof DuplicateNameError) return duplicateName();
        throw error;
      }
    },
    revalidate: { paths: ["/"] },
  });
}

export async function deleteProduct(id: unknown) {
  return runAction({
    schema: z.number().int(),
    input: id,
    handler: async (productId) => {
      await store.wait();
      store.remove(productId);
      return { success: true, message: "Product deleted" };
    },
    revalidate: { paths: ["/"] },
  });
}

/** The handler throws: runAction turns it into a 500 result instead of crashing. */
export async function brokenAction() {
  return runAction({
    schema: z.unknown(),
    input: null,
    handler: async () => {
      await store.wait();
      throw new Error("Database connection lost");
    },
    onError: (error) => console.error("[brokenAction]", error),
  });
}

/** Simulates an expired session: the action redirects instead of returning. */
export async function expiredSessionAction() {
  return runAction({
    schema: z.unknown(),
    input: null,
    handler: async () => {
      await store.wait();
      redirect("/login");
    },
  });
}

export async function setLatency(ms: unknown) {
  return runAction({
    schema: z.union([z.literal(0), z.literal(600), z.literal(2000)]),
    input: ms,
    handler: (value) => {
      store.setLatency(value);
      return { success: true, message: value ? `Server latency set to ${value} ms` : "Server latency off" };
    },
    revalidate: { paths: ["/"] },
  });
}

export async function resetData() {
  return runAction({
    schema: z.unknown(),
    input: null,
    handler: () => {
      store.reset();
      return { success: true, message: "Sample data restored" };
    },
    revalidate: { paths: ["/"] },
  });
}
