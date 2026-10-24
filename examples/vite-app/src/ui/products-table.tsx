import { useState } from "react";
import { useCrudAction } from "submitly";

import { api } from "../lib/api";
import type { Product } from "../lib/schema";
import { Dialog } from "./dialog";
import { useFeedback } from "./feedback";
import { Spinner } from "./fields";
import { ProductForm } from "./product-form";

function DeleteControl({ product }: { product: Product }) {
  const { log } = useFeedback();
  const [confirming, setConfirming] = useState(false);
  const { execute, isPending } = useCrudAction({
    action: api.deleteProduct,
    onSuccess: () => log("onSuccess", `deleted #${product.id}`, "success"),
  });

  if (!confirming) {
    return (
      <button type="button" className="btn btn-sm btn-danger-ghost" onClick={() => setConfirming(true)}>
        Delete
      </button>
    );
  }

  return (
    <span className="confirm">
      <span>Delete?</span>
      <button
        type="button"
        className="btn btn-sm btn-danger"
        disabled={isPending}
        onClick={() => void execute(product.id)}
      >
        {isPending ? <Spinner /> : null}
        Yes
      </button>
      <button type="button" className="btn btn-sm btn-ghost" disabled={isPending} onClick={() => setConfirming(false)}>
        No
      </button>
    </span>
  );
}

export function ProductsTable({ products }: { products: Product[] }) {
  if (!products.length) {
    return <p className="empty">No products yet. Create one, or restore the sample data.</p>;
  }

  return (
    <table className="table">
      <thead>
        <tr>
          <th>Name</th>
          <th>SKU</th>
          <th className="num">Price</th>
          <th aria-label="Actions" />
        </tr>
      </thead>
      <tbody>
        {products.map((product) => (
          <tr key={product.id}>
            <td>{product.name}</td>
            <td className="muted">{product.sku ?? "—"}</td>
            <td className="num">${product.price.toFixed(2)}</td>
            <td className="row-actions">
              <Dialog
                title={`Edit “${product.name}”`}
                trigger={(open) => (
                  <button type="button" className="btn btn-sm btn-ghost" onClick={open}>
                    Edit
                  </button>
                )}
              >
                {({ formKey, onClose }) => <ProductForm key={formKey} product={product} onDone={onClose} />}
              </Dialog>
              <DeleteControl product={product} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
