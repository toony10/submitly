import { expect, test } from "./fixtures";

test.describe("create, edit, delete", () => {
  test("happy path: add, edit in the dialog, delete with inline confirm", async ({ app, page }) => {
    // Add
    await app.fillProduct(app.createForm, { name: "Standing desk", price: "399", sku: "DSK-01" });
    await app.createForm.getByRole("button", { name: "Create product" }).click();

    await expect(app.toast("Created “Standing desk”")).toBeVisible();
    await expect(app.row("Standing desk")).toContainText("DSK-01");
    await expect(app.row("Standing desk")).toContainText("$399.00");
    await expect(page.getByText("3 items")).toBeVisible();
    await expect(app.logEntry("onMutated")).toBeVisible();
    await expect(app.logEntry("onSuccess")).toContainText("create");
    // resetOnSuccess clears the form.
    await expect(app.createForm.getByLabel("Name")).toHaveValue("");

    // Edit
    await app.row("Standing desk").getByRole("button", { name: "Edit" }).click();
    await expect(app.dialog).toBeVisible();
    await expect(app.dialog.getByRole("heading", { name: "Edit “Standing desk”" })).toBeVisible();
    // The dialog's form starts from the row's values.
    await expect(app.dialog.getByLabel("Name")).toHaveValue("Standing desk");
    await expect(app.dialog.getByLabel("Price")).toHaveValue("399");

    await app.fillProduct(app.dialog, { name: "Standing desk XL", price: "449" });
    await app.dialog.getByRole("button", { name: "Save changes" }).click();

    await expect(app.dialog).toBeHidden();
    await expect(app.toast("Updated “Standing desk XL”")).toBeVisible();
    await expect(app.row("Standing desk XL")).toContainText("$449.00");

    // Delete
    await app.row("Standing desk XL").getByRole("button", { name: "Delete" }).click();
    await expect(app.row("Standing desk XL").getByText("Delete?")).toBeVisible();
    await app.row("Standing desk XL").getByRole("button", { name: "Yes" }).click();

    await expect(app.toast("Product deleted")).toBeVisible();
    await expect(app.row("Standing desk XL")).toHaveCount(0);
    await expect(page.getByText("2 items")).toBeVisible();
  });

  test("declining the inline delete confirm keeps the product", async ({ app }) => {
    const row = app.row("Office chair");

    await row.getByRole("button", { name: "Delete" }).click();
    await row.getByRole("button", { name: "No" }).click();

    await expect(row.getByRole("button", { name: "Delete" })).toBeVisible();
    await expect(app.logEntry(/.+/)).toHaveCount(0);
  });

  test("the edit dialog remounts with fresh values every time it opens", async ({ app }) => {
    const row = app.row("Desk lamp");

    await row.getByRole("button", { name: "Edit" }).click();
    await app.dialog.getByLabel("Name").fill("Changed but not saved");
    await app.dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(app.dialog).toBeHidden();

    await row.getByRole("button", { name: "Edit" }).click();
    await expect(app.dialog.getByLabel("Name")).toHaveValue("Desk lamp");
  });
});

test.describe("validation", () => {
  test("client validation blocks the submit and fires no action", async ({ app }) => {
    await app.createForm.getByRole("button", { name: "Create product" }).click();

    await expect(app.createForm.getByText("Name must be at least 2 characters")).toBeVisible();
    await expect(app.createForm.getByText("Price must be positive")).toBeVisible();

    await app.fillProduct(app.createForm, { name: "Widget", price: "5", sku: "THIS-SKU-IS-TOO-LONG" });
    await app.createForm.getByRole("button", { name: "Create product" }).click();

    await expect(app.createForm.getByText("SKU is at most 12 characters")).toBeVisible();
    await expect(app.createForm.getByText("Name must be at least 2 characters")).toBeHidden();

    // Nothing reached the server: no callbacks, no creation toast, still two products.
    await expect(app.logEntry(/.+/)).toHaveCount(0);
    await expect(app.toast("Created")).toHaveCount(0);
    await expect(app.page.getByRole("row")).toHaveCount(3);
  });

  test("duplicate name comes back from the server as a field error", async ({ app }) => {
    // The comparison is case-insensitive, and the product exists.
    await app.fillProduct(app.createForm, { name: "desk LAMP", price: "10" });
    await app.createForm.getByRole("button", { name: "Create product" }).click();

    await expect(app.createForm.getByText("A product with this name already exists")).toBeVisible();
    await expect(app.toast("Could not save the product")).toBeVisible();
    await expect(app.logEntry("onError")).toBeVisible();
    // Field errors do not fill the form-level panel, and the typed values are kept.
    await expect(app.createForm.getByRole("alert").filter({ hasText: "The server rejected this request" })).toHaveCount(0);
    await expect(app.createForm.getByLabel("Name")).toHaveValue("desk LAMP");
    await expect(app.page.getByRole("row")).toHaveCount(3);

    // Fixing the name and resubmitting succeeds and clears the error.
    await app.createForm.getByLabel("Name").fill("Desk lamp 2");
    await app.createForm.getByRole("button", { name: "Create product" }).click();

    await expect(app.toast("Created “Desk lamp 2”")).toBeVisible();
    await expect(app.createForm.getByText("A product with this name already exists")).toBeHidden();
    await expect(app.row("Desk lamp 2")).toBeVisible();
  });

  test("duplicate name while editing shows the field error inside the dialog", async ({ app }) => {
    await app.row("Office chair").getByRole("button", { name: "Edit" }).click();
    await app.dialog.getByLabel("Name").fill("Desk lamp");
    await app.dialog.getByRole("button", { name: "Save changes" }).click();

    await expect(app.dialog.getByText("A product with this name already exists")).toBeVisible();
    // The failed save leaves the dialog open and unlocked.
    await expect(app.dialog).toBeVisible();
    await expect(app.dialog.getByRole("button", { name: "Close" })).toBeEnabled();
  });
});

test.describe("failures", () => {
  test("a throwing action shows the error panel and an error toast", async ({ app, brokenMessage }) => {
    await app.runScenario("Handler throws");

    const scenario = app.scenario("Handler throws");

    await expect(scenario.getByRole("alert")).toContainText("The server rejected this request");
    await expect(scenario.getByRole("alert")).toContainText(brokenMessage);
    await expect(app.toast(brokenMessage)).toBeVisible();
    await expect(app.logEntry("onMutated")).toHaveCount(0);
    // The page keeps working.
    await expect(app.row("Desk lamp")).toBeVisible();
  });

  test("an expired session redirects to /login without an error toast", async ({ app, page }) => {
    await app.runScenario("Session expired");

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Session expired" })).toBeVisible();
    await expect(app.toast(/expired|error|wrong/i)).toHaveCount(0);

    await page.getByRole("link", { name: "Back to the playground" }).click();
    await expect(page).not.toHaveURL(/\/login/);
    await expect(app.row("Desk lamp")).toBeVisible();
  });
});

test.describe("dialog lock", () => {
  test("the edit dialog cannot be dismissed while saving", async ({ app, page }) => {
    await app.setLatency("2 s");

    await app.row("Desk lamp").getByRole("button", { name: "Edit" }).click();
    await expect(app.dialog).toBeVisible();
    await app.dialog.getByLabel("Name").fill("Desk lamp v2");
    await app.dialog.getByRole("button", { name: "Save changes" }).click();

    // Pending: the dialog says so, and the way out is blocked.
    await expect(app.dialog.getByText("the dialog is locked")).toBeVisible();
    await expect(app.dialog.getByRole("button", { name: "Saving…" })).toBeDisabled();
    await expect(app.dialog.getByRole("button", { name: "Close" })).toBeDisabled();

    await page.keyboard.press("Escape");
    await expect(app.dialog).toBeVisible();

    // Clicking the backdrop (outside the dialog box) is ignored too.
    await page.mouse.click(4, 4);
    await expect(app.dialog).toBeVisible();

    // When the save succeeds the lock is released and onSuccess closes the dialog.
    await expect(app.dialog).toBeHidden();
    await expect(app.toast("Updated “Desk lamp v2”")).toBeVisible();
    await expect(app.row("Desk lamp v2")).toBeVisible();
  });

  test("the dialog closes normally with Escape when nothing is saving", async ({ app, page }) => {
    await app.setLatency("2 s");

    await app.row("Desk lamp").getByRole("button", { name: "Edit" }).click();
    await expect(app.dialog).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(app.dialog).toBeHidden();
  });
});
