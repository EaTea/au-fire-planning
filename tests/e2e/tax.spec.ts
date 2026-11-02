import type { Page } from "@playwright/test";

import { expect, startFresh, test, yearCell } from "./fixtures";

// End-to-end tests for M8's tax display (TAX-1 and TAX-9, PR A): the
// estimated tax and take-home pay under each salary on Income & expenses, the
// Tax column in Year by year, and the Results banners. Figures come from the
// worked examples in PLAN.md and tests/worked-examples/m8-tax.json: T3 ($100,000
// in 2026 pays $22,788), T7 ($40,000 pays $3,713) and example F's 2027 row
// ($22,520 on the FY2026-27 rules). Balances aren't reduced by tax in this PR, so
// only the tax figures are checked. The clock is fixed in 2026 so the rules
// year doesn't depend on the real date.

/** Types `value` into the field with `label` and presses Tab to commit it. */
async function enter(page: Page, label: string, value: string): Promise<void> {
  await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByLabel(label, { exact: true }).press("Tab");
}

test("a $100,000 salary shows its tax and take-home with the working, and the Tax column shows 2027's tax", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-06-15T12:00:00") });

  await startFresh(page, "./#/household");
  await enter(page, "Current age", "40");
  await enter(page, "Target retirement age", "42");

  await page.getByRole("link", { name: "Next: Income & expenses →" }).click();
  await expect(page.getByText(/Estimated tax/)).toHaveCount(0);

  await enter(page, "Gross salary per year", "100000");
  await enter(page, "Per year, after tax", "60000");

  await expect(
    page.getByText("Estimated tax $22,788 · take-home $77,212 a year", { exact: true }),
  ).toBeVisible();

  // The working: the brackets, the offset, the levy and the total.
  await page.getByRole("button", { name: "How is this calculated?", exact: true }).click();
  await expect(page.getByText("Tax on income from $18,200 to $45,000 at 16%")).toBeVisible();
  await expect(page.getByText("Low income tax offset")).toBeVisible();
  await expect(page.getByText("Tax payable")).toBeVisible();

  // Year by year: 2027 uses the FY2026-27 rules (15% bottom rate), so $22,520 (example F).
  await page.goto("#/results?view=year-by-year");
  expect(await yearCell(page, 2027, "Tax")).toBe("$22,520");
  // 2028 uses the 14% rate: $22,252. Retired from 2029, so no tax.
  expect(await yearCell(page, 2028, "Tax")).toBe("$22,252");
  expect(await yearCell(page, 2029, "Tax")).toBe("—");

  // Both Results banners.
  await expect(
    page.getByText(
      "Tax is shown in Year by year but isn't yet taken from your savings, so balances are higher than they will be.",
    ),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Not yet modelled: tax on portfolio income and gains (M9), property (M12) and more.",
    ),
  ).toBeVisible();
});

test("a couple gets an estimate for each person, with their names", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-06-15T12:00:00") });

  await startFresh(page, "./#/household");
  await page.getByRole("button", { name: "A couple" }).click();
  await enter(page, "Person 1: Name (optional)", "Alex");
  await enter(page, "Person 2: Name (optional)", "Sam");
  await enter(page, "Alex: Current age", "40");
  await enter(page, "Alex: Target retirement age", "42");
  await enter(page, "Sam: Current age", "40");
  await enter(page, "Sam: Target retirement age", "41");

  await page.getByRole("link", { name: "Next: Income & expenses →" }).click();
  await enter(page, "Alex: Gross salary per year", "100000");
  await enter(page, "Sam: Gross salary per year", "40000");

  await expect(
    page.getByText("Alex: Estimated tax $22,788 · take-home $77,212 a year", { exact: true }),
  ).toBeVisible();
  // Example T7: $40,000 pays $3,488 less a $575 offset plus $800 of Medicare levy.
  await expect(
    page.getByText("Sam: Estimated tax $3,713 · take-home $36,287 a year", { exact: true }),
  ).toBeVisible();

  // Each person has their own working.
  await page.getByRole("button", { name: "Sam: How is this calculated?", exact: true }).click();
  await expect(page.getByText("Tax payable")).toBeVisible();
});
