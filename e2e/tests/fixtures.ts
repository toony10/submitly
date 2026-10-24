import { expect, test as base, type Locator, type Page } from "@playwright/test";

export type TestOptions = {
  /** Message the "Handler throws" scenario ends up showing (differs per app's backend). */
  brokenMessage: string;
};

export type Latency = "Off" | "600 ms" | "2 s" | "5 s";

/** Role/label based access to the playground, which both example apps share. */
export class Playground {
  constructor(readonly page: Page) {}

  get createForm(): Locator {
    return this.page.getByRole("form", { name: "Create product" });
  }

  get dialog(): Locator {
    return this.page.getByRole("dialog");
  }

  get eventLog(): Locator {
    return this.page.locator("section").filter({ has: this.page.getByRole("heading", { name: "Event log" }) });
  }

  logEntry(text: string | RegExp): Locator {
    return this.eventLog.getByRole("listitem").filter({ hasText: text });
  }

  row(name: string | RegExp): Locator {
    return this.page.getByRole("row", { name });
  }

  toast(text: string | RegExp): Locator {
    return this.page.getByRole("status").filter({ hasText: text });
  }

  scenario(title: string): Locator {
    return this.page.locator(".scenario").filter({ has: this.page.getByText(title, { exact: true }) });
  }

  async runScenario(title: string) {
    await this.scenario(title).getByRole("button", { name: "Run" }).click();
  }

  async setLatency(latency: Latency) {
    const button = this.page.getByRole("group", { name: "Server latency" }).getByRole("button", { name: latency });

    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
  }

  /** Lets pending event handlers, React effects and `close` events run, so a "nothing happened" check is not instant. */
  async settle() {
    await this.page.evaluate(
      () => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(done, 100)))),
    );
  }

  /** The dialog is still open, and its open state was never closed (the example dialogs log every close). */
  async expectDialogStillOpen() {
    await this.settle();
    await expect(this.dialog).toBeVisible();
    await expect(this.dialog).toHaveJSProperty("open", true);
    await expect(this.logEntry("dialog")).toHaveCount(0);
  }

  /**
   * Starts recording every toast that ever appears (toasts disappear after a few seconds, so
   * checking for one afterwards proves nothing). Returns a reader for the recorded texts. It
   * lives in the page, so it only works for client-side navigations: a full reload loses it,
   * which the reader reports by throwing instead of returning an empty list.
   */
  async recordToasts() {
    await this.page.evaluate(() => {
      const seen: string[] = [];
      const record = (node: Node) => {
        if (!(node instanceof Element)) return;

        const toasts = node.matches("[role=status]") ? [node] : [...node.querySelectorAll("[role=status]")];

        for (const toast of toasts) seen.push(toast.textContent ?? "");
      };

      new MutationObserver((mutations) => {
        for (const mutation of mutations) mutation.addedNodes.forEach(record);
      }).observe(document.body, { childList: true, subtree: true });
      (window as unknown as { __toastLog?: string[] }).__toastLog = seen;
    });

    return async () => {
      const seen = await this.page.evaluate(() => (window as unknown as { __toastLog?: string[] }).__toastLog);

      if (!seen) throw new Error("The toast recorder was lost (full page reload?)");
      return seen;
    };
  }

  async fillProduct(form: Locator, values: { name?: string; price?: string; sku?: string }) {
    if (values.name !== undefined) await form.getByLabel("Name").fill(values.name);
    if (values.price !== undefined) await form.getByLabel("Price").fill(values.price);
    if (values.sku !== undefined) await form.getByLabel("SKU").fill(values.sku);
  }

  /** Fresh page, no latency, sample data, empty event log. */
  async reset() {
    await this.page.goto("/");
    await this.setLatency("Off");
    await this.runScenario("Reset data");
    await expect(this.toast("Sample data restored")).toBeVisible();
    await expect(this.row("Desk lamp")).toBeVisible();
    await expect(this.row("Office chair")).toBeVisible();
    await expect(this.page.getByRole("row")).toHaveCount(3); // header + 2 products
    await this.eventLog.getByRole("button", { name: "Clear" }).click();
  }
}

export const test = base.extend<TestOptions & { app: Playground }>({
  brokenMessage: ["Unexpected error", { option: true }],
  app: async ({ page }, provide) => {
    const app = new Playground(page);

    await app.reset();
    await provide(app);
  },
});

export { expect };
