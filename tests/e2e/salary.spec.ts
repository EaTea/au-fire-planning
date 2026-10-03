import type { Page } from "@playwright/test";

import { expect, startFresh, test } from "./fixtures";

// End-to-end test for IN-7 (salary): enter a salary that grows at "Inflation +
// 1%" on Income & expenses, check Year by year shows the grown salary while
// working and "—" after retirement, in both dollar modes, and that it survives
// a reload. Uses M5's worked example A (tests/worked-examples/m5-super.json):
// $145,000 at 3.5% a year is $150,075 in 2027 and $251,428 in 2042. The clock
// is fixed in 2026 so the calendar years don't depend on the real date.

/** Types `value` into the field with `label` and presses Tab to commit it. */
async function enter(page: Page, label: string, value: string): Promise<void> {
  await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByLabel(label, { exact: true }).press("Tab");
}

/** The cell texts of the Year by year row for `year`. */
async function rowCells(page: Page, year: number): Promise<string[]> {
  const row = page
    .getByRole("table", { name: "Year by year projection" })
    .getByRole("row")
    .filter({ has: page.getByRole("cell", { name: String(year), exact: true }) });

  return row.getByRole("cell").allTextContents();
}

/** Checks the Salary column (the third cell) in the rows that matter. */
async function expectSalaries(page: Page, expected: Record<number, string>): Promise<void> {
  for (const [year, salary] of Object.entries(expected)) {
    expect((await rowCells(page, Number(year)))[2], `salary in ${year}`).toBe(salary);
  }
}

test("a salary growing at inflation + 1% shows year by year until retirement, and survives a reload", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-06-15T12:00:00") });

  await startFresh(page, "./#/household");
  await enter(page, "Current age", "34");
  await enter(page, "Target retirement age", "50");

  // Salary is the first card on Income & expenses.
  await page.getByRole("link", { name: "Next: Income & expenses →" }).click();
  await expect(page.getByRole("heading", { level: 3 }).first()).toHaveText("Salary");

  await enter(page, "Gross salary per year", "145000");
  await page.getByLabel("Grows at", { exact: true }).selectOption({ label: "Inflation + …%" });
  await enter(page, "Above inflation by", "1");
  await enter(page, "Per year, after tax", "64000");

  await page.getByLabel("Grows at", { exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/salary-card.png", fullPage: true });

  await page.goto("#/results?view=year-by-year");
  await expect(page.getByRole("columnheader", { name: "Salary" })).toBeVisible();

  // Nominal dollars (the default): $145,000 × 1.035^k while working (to age 50), then "—".
  await expectSalaries(page, { 2027: "$150,075", 2042: "$251,428", 2043: "—", 2050: "—" });

  // Today's dollars divide by the inflation index: $150,075 ÷ 1.025.
  await page.getByRole("button", { name: "Today's dollars" }).click();
  await expectSalaries(page, { 2027: "$146,415", 2043: "—" });

  // Autosave waits 500 ms after the last edit; reload once the plan is stored.
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<unknown>((resolve, reject) => {
            const openRequest = indexedDB.open("au-fire-planner");
            openRequest.onerror = () => reject(openRequest.error);
            openRequest.onsuccess = () => {
              const database = openRequest.result;
              const getAll = database.transaction("plans").objectStore("plans").getAll();
              getAll.onsuccess = () => {
                database.close();
                resolve(getAll.result[0]?.document?.household?.people?.[0]?.salary);
              };
              getAll.onerror = () => reject(getAll.error);
            };
          }),
      ),
    )
    .toEqual({ annualDollars: 145000, growth: { kind: "inflationPlus", marginPercent: 1 } });

  await page.reload();

  // Still there after the reload, on the Income & expenses page and in the table.
  await page.goto("#/income-expenses");
  await expect(page.getByLabel("Gross salary per year")).toHaveValue("$145,000");
  await expect(page.getByLabel("Grows at", { exact: true })).toHaveValue("inflationPlus");
  await expect(page.getByLabel("Above inflation by")).toHaveValue("1%");

  await page.goto("#/results?view=year-by-year");
  await page.getByRole("button", { name: "Nominal" }).click();
  await expectSalaries(page, { 2027: "$150,075", 2042: "$251,428", 2043: "—" });
});
