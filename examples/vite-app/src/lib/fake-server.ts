/**
 * A pretend REST backend living in the browser: routes, status codes, JSON
 * bodies and latency, with no knowledge of `ActionResult`. The client in
 * `api.ts` talks to it like it would talk to `fetch`.
 */
import { productSchema, type Product } from "./schema";

export type HttpRequest = { method: "GET" | "POST" | "PUT" | "DELETE"; path: string; body?: unknown };
export type HttpResponse = { status: number; body: unknown };

type State = { products: Product[]; nextId: number; latencyMs: number };

const seed = (): Product[] => [
  { id: 1, name: "Desk lamp", price: 29, sku: "LMP-01" },
  { id: 2, name: "Office chair", price: 149 },
];

const state: State = { products: seed(), nextId: 3, latencyMs: 600 };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const json = (status: number, body: unknown): HttpResponse => ({ status, body });

const isTaken = (name: string, exceptId?: number) =>
  state.products.some((p) => p.id !== exceptId && p.name.toLowerCase() === name.toLowerCase());

/** Validates a request body with the shared schema; 422 with dotted-path field errors on failure. */
function parseProduct(body: unknown): { product: Omit<Product, "id"> } | { response: HttpResponse } {
  const parsed = productSchema.safeParse(body);

  if (parsed.success) {
    return { product: parsed.data };
  }

  const fieldErrors: Record<string, string[]> = {};

  for (const issue of parsed.error.issues) {
    (fieldErrors[issue.path.join(".")] ??= []).push(issue.message);
  }

  return { response: json(422, { message: "Validation failed", fieldErrors }) };
}

const duplicate = () =>
  json(409, {
    message: "Could not save the product",
    fieldErrors: { name: ["A product with this name already exists"] },
  });

function route({ method, path, body }: HttpRequest): HttpResponse {
  if (method === "GET" && path === "/products") {
    return json(200, state.products);
  }

  if (method === "GET" && path === "/settings") {
    return json(200, { latencyMs: state.latencyMs });
  }

  if (method === "PUT" && path === "/settings/latency") {
    const ms = (body as { ms?: unknown } | undefined)?.ms;

    if (ms !== 0 && ms !== 600 && ms !== 2000) {
      return json(422, { message: "Latency must be 0, 600 or 2000" });
    }

    state.latencyMs = ms;
    return json(200, { data: { latencyMs: ms }, message: ms ? `Server latency set to ${ms} ms` : "Server latency off" });
  }

  if (method === "POST" && path === "/products") {
    const parsed = parseProduct(body);

    if ("response" in parsed) return parsed.response;
    if (isTaken(parsed.product.name)) return duplicate();

    const product = { id: state.nextId++, ...parsed.product };
    state.products.push(product);
    return json(201, { data: product, message: `Created “${product.name}”` });
  }

  const match = /^\/products\/(\d+)$/.exec(path);

  if (match && method === "PUT") {
    const id = Number(match[1]);
    const parsed = parseProduct(body);

    if ("response" in parsed) return parsed.response;
    if (isTaken(parsed.product.name, id)) return duplicate();

    const index = state.products.findIndex((p) => p.id === id);

    if (index === -1) return json(404, { message: "Product not found" });

    const product = { id, ...parsed.product };
    state.products[index] = product;
    return json(200, { data: product, message: `Updated “${product.name}”` });
  }

  if (match && method === "DELETE") {
    const id = Number(match[1]);
    state.products = state.products.filter((p) => p.id !== id);
    return json(200, { data: null, message: "Product deleted" });
  }

  if (method === "POST" && path === "/debug/broken") {
    return json(500, { message: "Database connection lost" });
  }

  if (method === "POST" && path === "/debug/expired") {
    return json(401, { message: "Your session has expired" });
  }

  if (method === "POST" && path === "/reset") {
    state.products = seed();
    state.nextId = 3;
    return json(200, { data: null, message: "Sample data restored" });
  }

  return json(404, { message: `No route for ${method} ${path}` });
}

/** Mutations take `latencyMs`; reads and the latency setting itself answer immediately. */
export async function handle(request: HttpRequest): Promise<HttpResponse> {
  if (request.method !== "GET" && request.path !== "/settings/latency") {
    await sleep(state.latencyMs);
  }

  // Round-trip through JSON so callers never share references with the "server".
  const response = route(request);
  return JSON.parse(JSON.stringify(response)) as HttpResponse;
}
