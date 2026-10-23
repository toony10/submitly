import "server-only";

export type Product = { id: number; name: string; price: number };

// In-memory store: enough for an example, resets on restart. Kept on
// globalThis because server actions and pages can load separate module copies.
const state = ((globalThis as { __exampleStore?: { products: Product[]; nextId: number } })
  .__exampleStore ??= { products: [{ id: 1, name: "Desk lamp", price: 29 }], nextId: 2 });
const { products } = state;

export const store = {
  list: () => [...products],
  add(input: Omit<Product, "id">): Product {
    if (products.some((product) => product.name.toLowerCase() === input.name.toLowerCase())) {
      throw new Error("duplicate");
    }

    const product = { id: state.nextId++, ...input };
    products.push(product);
    return product;
  },
  remove(id: number) {
    const index = products.findIndex((product) => product.id === id);

    if (index !== -1) {
      products.splice(index, 1);
    }
  },
};
