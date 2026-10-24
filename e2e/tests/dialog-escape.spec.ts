import { expect, test } from "./fixtures";

test("a repeated Escape cannot close the locked dialog either", async ({ app, page }) => {
  // Chrome closes a native modal dialog on a second Escape even when `cancel` was prevented;
  // both examples re-open it from the `close` event while locked.

  await app.setLatency("2 s");
  await app.row("Desk lamp").getByRole("button", { name: "Edit" }).click();
  await app.dialog.getByLabel("Name").fill("Desk lamp v3");
  await app.dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(app.dialog.getByText("the dialog is locked")).toBeVisible();

  for (let i = 0; i < 3; i++) await page.keyboard.press("Escape");
  await expect(app.dialog).toBeVisible();

  await expect(app.dialog).toBeHidden();
  await expect(app.row("Desk lamp v3")).toBeVisible();
});
