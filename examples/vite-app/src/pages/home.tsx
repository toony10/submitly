import { useQuery } from "@tanstack/react-query";

import { api } from "../lib/api";
import { EventLog } from "../ui/event-log";
import { ProductForm } from "../ui/product-form";
import { ProductsTable } from "../ui/products-table";
import { Scenarios } from "../ui/scenarios";

export function HomePage() {
  const products = useQuery({ queryKey: ["products"], queryFn: api.listProducts });
  const settings = useQuery({ queryKey: ["settings"], queryFn: api.getSettings });
  const count = products.data?.length ?? 0;

  return (
    <main className="page">
      <header className="hero">
        <span className="badge">submitly · Vite example</span>
        <h1>Forms &amp; actions playground</h1>
        <p>
          A REST-style client that throws, adapted with <code>mapError</code> and <code>normalize</code>, driven by{" "}
          <code>useCrudForm</code> and <code>useCrudAction</code>. Plain HTML and CSS: the package renders nothing.
        </p>
      </header>

      <div className="grid">
        <section className="card">
          <header className="card-header">
            <div>
              <h2>Create product</h2>
              <p>Client validation first, then the server re-validates.</p>
            </div>
          </header>
          <ProductForm />
        </section>

        <section className="card">
          <header className="card-header">
            <div>
              <h2>Products</h2>
              <p>
                {count} {count === 1 ? "item" : "items"} · edit opens a dialog that locks while saving.
              </p>
            </div>
          </header>
          {products.data ? <ProductsTable products={products.data} /> : <p className="empty">Loading products…</p>}
        </section>

        <section className="card">
          <header className="card-header">
            <div>
              <h2>Scenarios</h2>
              <p>Failure paths and timing.</p>
            </div>
          </header>
          <Scenarios latencyMs={settings.data?.latencyMs} />
        </section>

        <EventLog />
      </div>
    </main>
  );
}
