"use client";

import { useCrudForm } from "submitly";

import { productSchema } from "@/lib/schema";

import { createProduct } from "./actions";

export function ProductForm() {
  const { form, onSubmit, serverErrors, isSubmitting } = useCrudForm({
    schema: productSchema,
    defaultValues: { name: "", price: "" },
    action: createProduct,
  });
  const { errors } = form.formState;

  return (
    <form onSubmit={onSubmit} aria-label="Create product">
      {serverErrors.length > 0 ? (
        <ul role="alert">
          {serverErrors.map((error, index) => (
            <li key={index}>{error}</li>
          ))}
        </ul>
      ) : null}
      <label>
        Name <input {...form.register("name")} />
      </label>
      {errors.name ? <p data-testid="name-error">{errors.name.message}</p> : null}
      <label>
        Price <input inputMode="decimal" {...form.register("price")} />
      </label>
      {errors.price ? <p data-testid="price-error">{errors.price.message}</p> : null}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : "Create"}
      </button>
    </form>
  );
}
