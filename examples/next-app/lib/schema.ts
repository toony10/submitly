import { z } from "zod";

export const productSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  price: z.coerce.number<string>().positive("Price must be positive"),
  // Blank input becomes undefined; otherwise at most 12 characters. `.optional()`
  // matters: runAction re-validates the client's parsed output, so the schema
  // must accept its own output (undefined) as input.
  sku: z
    .string()
    .trim()
    .max(12, "SKU is at most 12 characters")
    .optional()
    .transform((value) => value || undefined),
});

export const productUpdateSchema = productSchema.extend({ id: z.number().int() });

export type ProductFormValues = z.input<typeof productSchema>;
