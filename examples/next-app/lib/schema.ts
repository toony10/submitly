import { z } from "zod";

export const productSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  price: z.coerce.number<string>().positive("Price must be positive"),
});
