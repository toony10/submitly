import { store } from "@/lib/store";

import { EventLog } from "./ui/event-log";
import { ProductForm } from "./ui/product-form";
import { ProductsTable } from "./ui/products-table";
import { Scenarios } from "./ui/scenarios";

export const dynamic = "force-dynamic";

export default function Page() {
  const products = store.list();

  return (
    <main className="page">
      <header className="hero">
        <span className="badge">submitly · Next.js example</span>
        <h1>Forms &amp; actions playground</h1>
        <p>
          Server actions wrapped in <code>runAction</code>, driven by <code>useCrudForm</code> and{" "}
          <code>useCrudAction</code>. Plain HTML and CSS: the package renders nothing.
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
                {products.length} {products.length === 1 ? "item" : "items"} · edit opens a dialog that locks while saving.
              </p>
            </div>
          </header>
          <ProductsTable products={products} />
        </section>

        <section className="card">
          <header className="card-header">
            <div>
              <h2>Scenarios</h2>
              <p>Failure paths and timing.</p>
            </div>
          </header>
          <Scenarios latencyMs={store.latency()} />
        </section>

        <EventLog />
      </div>
    </main>
  );
}
