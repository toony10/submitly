import { expect, test } from "./fixtures";

test("a repeated Escape cannot close the locked dialog either", async ({ app, page }, testInfo) => {
  // Chrome closes a native modal dialog on a second Escape even when `cancel` was prevented.
  // The Vite example re-opens it from the `close` event while locked; the Next example's
  // Dialog has no such handler yet (reported, example source left untouched).
  test.fixme(testInfo.project.name === "next", "next-app Dialog has no onClose re-open guard");

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
