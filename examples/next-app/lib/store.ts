import "server-only";

export type Product = { id: number; name: string; price: number; sku?: string };

type State = { products: Product[]; nextId: number; latencyMs: number };

const seed = (): State => ({
  products: [
    { id: 1, name: "Desk lamp", price: 29, sku: "LMP-01" },
    { id: 2, name: "Office chair", price: 149 },
  ],
  nextId: 3,
  latencyMs: 600,
});

// In-memory store: enough for an example, resets on restart. Kept on
// globalThis because server actions and pages can load separate module copies.
const globalStore = globalThis as { __exampleStore?: State };
const state = () => (globalStore.__exampleStore ??= seed());

export class DuplicateNameError extends Error {}

function assertUniqueName(name: string, exceptId?: number) {
  const taken = state().products.some(
    (product) => product.id !== exceptId && product.name.toLowerCase() === name.toLowerCase(),
  );

  if (taken) {
    throw new DuplicateNameError(name);
  }
}

export const store = {
  list: () => [...state().products],
  latency: () => state().latencyMs,
  setLatency(ms: number) {
    state().latencyMs = ms;
  },
  /** Simulated network/database latency, applied by every action. */
  wait: () => new Promise((resolve) => setTimeout(resolve, state().latencyMs)),
  add(input: Omit<Product, "id">): Product {
    assertUniqueName(input.name);
    const product = { id: state().nextId++, ...input };
    state().products.push(product);
    return product;
  },
  update(input: Product): Product {
    assertUniqueName(input.name, input.id);
    const products = state().products;
    const index = products.findIndex((product) => product.id === input.id);

    if (index === -1) {
      throw new Error("not found");
    }

    products[index] = input;
    return input;
  },
  remove(id: number) {
    const products = state().products;
    const index = products.findIndex((product) => product.id === id);

    if (index !== -1) {
      products.splice(index, 1);
    }
  },
  reset() {
    globalStore.__exampleStore = { ...seed(), latencyMs: state().latencyMs };
  },
};
