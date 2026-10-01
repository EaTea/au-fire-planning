import { expect, startFresh, test } from "./fixtures";

// End-to-end test for M1's headline flow (FIRE-1, FIRE-2): enter the worked
// example's values through the real input screens, then read the FI number and
// progress on Results and open the FI number's breakdown. Runs against the
// production build (see playwright.config.ts).

test("entering the worked values shows an FI number of $1,600,000 and 45% progress", async ({
  page,
}) => {
  await startFresh(page, "./#/income-expenses");

  // Type each value and press Tab to commit it, as a user would.
  await page.getByLabel("Per year, after tax").fill("64000");
  await page.getByLabel("Per year, after tax").press("Tab");

  // Retirement spending is entered as 100% of today (also the default).
  await page.getByLabel("Share of today's living expenses").fill("100");
  await page.getByLabel("Share of today's living expenses").press("Tab");

  await page.getByRole("link", { name: "Next: Assets →" }).click();
  await page.getByLabel("Current value").fill("720000");
  await page.getByLabel("Current value").press("Tab");

  await page.getByRole("link", { name: "Next: Assumptions →" }).click();
  await page.getByLabel("Safe withdrawal rate").fill("4");
  await page.getByLabel("Safe withdrawal rate").press("Tab");

  await page.getByRole("link", { name: "Next: Results →" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Results" })).toBeVisible();
  await expect(page.getByText("$1,600,000", { exact: true })).toBeVisible();
  await expect(page.getByText("45%", { exact: true })).toBeVisible();

  // The FI number's breakdown can be opened and shows its working.
  await page.getByRole("button", { name: "How is this calculated?" }).first().click();
  await expect(page.getByRole("cell", { name: "= FI number" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Safe withdrawal rate" })).toBeVisible();
});

test("Results asks for living expenses until they are entered", async ({ page }) => {
  await startFresh(page, "./#/results");

  await expect(page.getByRole("alert")).toContainText("Living expenses");

  await page.getByRole("link", { name: "Living expenses → Income & expenses" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Income & expenses" })).toBeVisible();
});
