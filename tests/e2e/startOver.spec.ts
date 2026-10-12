import { expect, startFresh, test } from "./fixtures";

// End-to-end tests for Start over (NFR-8, PLAN.md "Start over from the logo"):
// the logo asks before clearing the plan, the cleared plan is what gets saved,
// and the browser's own dialog handles Escape, the backdrop and focus.

/** The logo, which is the Start over button on every step page. */
const logoName = "AU FIRE Planner, start over";

test("Start over keeps the plan when cancelled, and clears it for good when confirmed", async ({
  page,
}) => {
  await startFresh(page, "./#/income-expenses");
  const livingExpenses = page.getByLabel("Per year, after tax");
  await livingExpenses.fill("64000");
  await livingExpenses.press("Tab");

  // Cancelled: nothing changes, and focus goes back to the logo.
  const logo = page.getByRole("button", { name: logoName });
  await logo.click();
  const dialog = page.getByRole("dialog", { name: "Start over?" });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("button", { name: "Keep my plan" })).toBeFocused();
  await page.getByRole("button", { name: "Keep my plan" }).click();

  await expect(dialog).toBeHidden();
  await expect(logo).toBeFocused();
  await expect(livingExpenses).toHaveValue("$64,000");

  // Confirmed: Household, then an empty field where the value was.
  await logo.click();
  await page.getByRole("button", { name: "Start over", exact: true }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Household" })).toBeVisible();
  await page.getByRole("link", { name: "Next: Income & expenses →" }).click();
  await expect(livingExpenses).toHaveValue("");

  // After a reload the plan is still blank, and the welcome page doesn't come back.
  // Autosave waits 500 ms after an edit; poll the field across reloads until the save lands.
  await expect(async () => {
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "Income & expenses" })).toBeVisible();
    await expect(livingExpenses).toHaveValue("");
  }).toPass();
});

test("Escape and a click outside the dialog both keep the plan", async ({ page }) => {
  await startFresh(page, "./#/income-expenses");
  const livingExpenses = page.getByLabel("Per year, after tax");
  await livingExpenses.fill("64000");
  await livingExpenses.press("Tab");

  const logo = page.getByRole("button", { name: logoName });
  const dialog = page.getByRole("dialog", { name: "Start over?" });

  await logo.click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  // The backdrop covers the whole page; the top-left corner is outside the dialog box.
  await logo.click();
  await expect(dialog).toBeVisible();
  await page.mouse.click(5, 5);
  await expect(dialog).toBeHidden();

  await expect(livingExpenses).toHaveValue("$64,000");

  // The dialog opens again normally after being dismissed.
  await logo.click();
  await expect(dialog).toBeVisible();
});

test("the logo goes straight to Household when nothing has been entered", async ({ page }) => {
  await startFresh(page, "./#/results");

  await page.getByRole("button", { name: logoName }).click();

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1, name: "Household" })).toBeVisible();
});
