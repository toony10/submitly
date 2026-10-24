/**
 * A typical REST client: methods return the response body and failures throw
 * an `ApiError`. Nothing here knows about submitly's `ActionResult`; the
 * adapter in `crud-adapter.ts` bridges the two.
 */
import { handle, type HttpRequest } from "./fake-server";
import type { Product, ProductInput } from "./schema";

export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(status: number, message: string, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

/** Mutating endpoints answer `{ data, message }`. */
export type Envelope<T> = { data: T; message?: string };

async function request<T>(method: HttpRequest["method"], path: string, body?: unknown): Promise<T> {
  const { status, body: payload } = await handle({ method, path, body });

  if (status >= 400) {
    const error = payload as { message?: string; fieldErrors?: Record<string, string[]> };
    throw new ApiError(status, error.message ?? `Request failed (${status})`, error.fieldErrors);
  }

  return payload as T;
}

export const api = {
  listProducts: () => request<Product[]>("GET", "/products"),
  getSettings: () => request<{ latencyMs: number }>("GET", "/settings"),
  createProduct: (input: ProductInput) => request<Envelope<Product>>("POST", "/products", input),
  updateProduct: (id: number, input: ProductInput) => request<Envelope<Product>>("PUT", `/products/${id}`, input),
  deleteProduct: (id: number) => request<Envelope<null>>("DELETE", `/products/${id}`),
  setLatency: (ms: number) => request<Envelope<{ latencyMs: number }>>("PUT", "/settings/latency", { ms }),
  /** Always answers 500. */
  broken: () => request<never>("POST", "/debug/broken"),
  /** Always answers 401. */
  expired: () => request<never>("POST", "/debug/expired"),
  reset: () => request<Envelope<null>>("POST", "/reset"),
};
