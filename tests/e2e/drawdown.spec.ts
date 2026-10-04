import type { Page } from "@playwright/test";

import { expect, startFresh, test, yearCell } from "./fixtures";

// End-to-end test for M3's headline flow (OUT-3, OUT-4, EXP-3, IN-4, IN-12,
// IN-26): enter worked example B (tests/worked-examples/m3-drawdown.json)
// through the real screens, see that the money runs out in 2031 on Results and
// in its Year by year table, add a dated expense and see that year's spending change, and
// check that everything survives a reload. The clock is fixed in 2026 so the
// calendar years don't depend on the real date.

/** Types `value` into the field with `label` and presses Tab to commit it. */
async function enter(page: Page, label: string, value: string): Promise<void> {
  await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByLabel(label, { exact: true }).press("Tab");
}

/** Reads how many dated expenses the autosaved plan holds, or undefined before the first save. */
function savedDatedExpenseCount(page: Page): Promise<number | undefined> {
  return page.evaluate(
    () =>
      new Promise<number | undefined>((resolve, reject) => {
        const openRequest = indexedDB.open("au-fire-planner");
        openRequest.onerror = () => reject(openRequest.error);
        openRequest.onsuccess = () => {
          const database = openRequest.result;
          const getAll = database.transaction("plans").objectStore("plans").getAll();
          getAll.onsuccess = () => {
            database.close();
            resolve(getAll.result[0]?.document?.expenses?.datedExpenses?.length);
          };
          getAll.onerror = () => reject(getAll.error);
        };
      }),
  );
}

test("worked example B runs out in 2031, and a dated expense changes that year's spending", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-06-15T12:00:00") });
  await startFresh(page, "./#/household");

  // Example B: age 60 and retired, plan until 65, $100,000 shares and $10,000 cash.
  await enter(page, "Current age", "60");
  await enter(page, "Target retirement age", "60");
  await enter(page, "Plan until age", "65");

  await page.getByRole("link", { name: "Next: Income & expenses →" }).click();
  await enter(page, "Per year, after tax", "30000");

  await page.getByRole("link", { name: "Next: Assets →" }).click();
  await enter(page, "Current value", "100000");
  await enter(page, "Expected return per year", "10");
  await enter(page, "Cash savings", "10000");

  await page.getByRole("link", { name: "Next: Assumptions →" }).click();
  await enter(page, "Inflation per year", "0");
  await enter(page, "General interest rate", "5");

  // Results: the money runs out at 65, with a warning linking down to the table.
  await page.getByRole("link", { name: "Next: Results →" }).click();
  await expect(page.getByText("Runs out at age 65", { exact: true })).toBeVisible();
  await expect(page.getByText("2031 · 1 year can't be funded")).toBeVisible();
  await expect(page.getByRole("alert").first()).toContainText(
    "Your money runs out at age 65 (2031). See the years that can't be funded.",
  );

  // Year by year, on the same page: 2031 is flagged and outlined, with the banner above the table.
  await page.getByRole("link", { name: "See the years that can't be funded." }).click();
  await expect(page.locator("tr[data-outlined='true']").getByRole("cell").first()).toHaveText(
    "2031",
  );
  const yearByYearSection = page.locator(".year-by-year-section");
  await expect(yearByYearSection.getByRole("alert")).toHaveText("1 year can't be funded: 2031");
  expect(await yearCell(page, 2031, "Status")).toBe("Shortfall −$9,339");
  expect(await yearCell(page, 2030, "Status")).toBe("✓");
  expect(await yearCell(page, 2027, "Spending")).toBe("$30,000");

  // Add a $5,000 one-off in 2027 (a new row starts in the year after today).
  await page.goto("./#/income-expenses");
  await page.getByRole("button", { name: "+ Add expense" }).click();
  await page.keyboard.type("Boat");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Per year for Boat" }).click();
  await page.getByLabel("Amount per year for Boat").fill("5000");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Per year for Boat" })).toHaveText("$5,000");

  // 2027's spending is now $30,000 + $5,000, and the plan runs out sooner.
  await page.goto("./#/results");
  expect(await yearCell(page, 2027, "Spending")).toBe("$35,000");
  await expect(yearByYearSection.getByRole("alert")).toContainText("can't be funded");

  // Autosave waits 500 ms after the last edit; reload once the expense is stored.
  await expect.poll(() => savedDatedExpenseCount(page)).toBe(1);
  await page.reload();

  // The saved plan loads after the page does, so wait for the projection to appear.
  await expect.poll(async () => await yearCell(page, 2027, "Spending")).toBe("$35,000");

  await page.goto("./#/household");
  await expect(page.getByLabel("Plan until age")).toHaveValue("65");
  await page.goto("./#/assets");
  await expect(page.getByLabel("Cash savings")).toHaveValue("$10,000");
  await page.goto("./#/income-expenses");
  await expect(page.getByRole("button", { name: "Expense for Boat" })).toHaveText("Boat");
  await expect(page.getByRole("button", { name: "Per year for Boat" })).toHaveText("$5,000");
});
