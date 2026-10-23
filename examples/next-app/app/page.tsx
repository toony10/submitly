import { store } from "@/lib/store";

import { DeleteButton, ExpiredSessionButton } from "./product-actions";
import { ProductForm } from "./product-form";

export const dynamic = "force-dynamic";

export default function Page() {
  const products = store.list();

  return (
    <main>
      <h1>Products</h1>
      <ul aria-label="Products">
        {products.map((product) => (
          <li key={product.id}>
            {product.name} — {product.price} <DeleteButton id={product.id} />
          </li>
        ))}
      </ul>
      <ProductForm />
      <hr />
      <ExpiredSessionButton />
    </main>
  );
}
