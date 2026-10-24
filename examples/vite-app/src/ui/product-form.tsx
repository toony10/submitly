import { useCrudForm } from "submitly";

import { api } from "../lib/api";
import { productSchema, type Product, type ProductFormValues } from "../lib/schema";
import { useFeedback } from "./feedback";
import { ErrorPanel, Field, Spinner } from "./fields";

const empty: ProductFormValues = { name: "", price: "", sku: "" };

function toFormValues(product: Product): ProductFormValues {
  return { name: product.name, price: String(product.price), sku: product.sku ?? "" };
}

/** Create form when `product` is omitted, edit form otherwise. */
export function ProductForm({ product, onDone }: { product?: Product; onDone?: () => void }) {
  const { log } = useFeedback();
  const { form, onSubmit, serverErrors, isSubmitting } = useCrudForm({
    schema: productSchema,
    defaultValues: product ? toFormValues(product) : empty,
    // A plain API call: it returns the response body and throws on failure.
    action: (values) => (product ? api.updateProduct(product.id, values) : api.createProduct(values)),
    onSuccess: (result) => {
      log("onSuccess", `${product ? "update" : "create"} → ${JSON.stringify(result.data)}`, "success");
      onDone?.();
    },
    onError: (result) => log("onError", JSON.stringify(result.fieldErrors ?? result.errors ?? {}), "error"),
  });
  const { errors } = form.formState;

  return (
    <form onSubmit={onSubmit} className="form" noValidate aria-label={product ? "Edit product" : "Create product"}>
      <ErrorPanel errors={serverErrors} />

      <Field label="Name" error={errors.name?.message} hint="Try an existing name to get a server field error.">
        <input autoComplete="off" placeholder="Desk lamp" {...form.register("name")} />
      </Field>

      <div className="form-row">
        <Field label="Price" error={errors.price?.message}>
          <input inputMode="decimal" placeholder="29" {...form.register("price")} />
        </Field>
        <Field label="SKU" error={errors.sku?.message} hint="Optional">
          <input autoComplete="off" placeholder="LMP-01" {...form.register("sku")} />
        </Field>
      </div>

      <div className="form-actions">
        {onDone ? (
          <button type="button" className="btn btn-ghost" onClick={onDone} disabled={isSubmitting}>
            Cancel
          </button>
        ) : (
          <button type="button" className="btn btn-ghost" onClick={() => form.reset()} disabled={isSubmitting}>
            Clear
          </button>
        )}
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? <Spinner /> : null}
          {isSubmitting ? "Saving…" : product ? "Save changes" : "Create product"}
        </button>
      </div>
    </form>
  );
}
