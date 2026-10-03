import type { Page } from "@playwright/test";

import { expect, startFresh, test } from "./fixtures";

// End-to-end test for M2's headline flow (IN-2, IN-3, IN-11, IN-15, IN-18,
// OUT-1, OUT-2, OUT-4): enter worked example A through the real screens, read
// the FI year on Results, then check the Year by year table and its dollars
// toggle, and that everything survives a reload. The clock is fixed in 2026
// so the calendar years don't depend on the real date.

/** Types `value` into the field with `label` and presses Tab to commit it. */
async function enter(page: Page, label: string, value: string): Promise<void> {
  await page.getByLabel(label).fill(value);
  await page.getByLabel(label).press("Tab");
}

/** The cell texts of the Year by year row for `year`. */
async function rowCells(page: Page, year: number): Promise<string[]> {
  const row = page
    .getByRole("row")
    .filter({ has: page.getByRole("cell", { name: String(year), exact: true }) });

  return row.getByRole("cell").allTextContents();
}

test("worked example A reaches FI in 2038 at age 46 and shows it year by year", async ({
  page,
}) => {
  // Fix "now" in 2026 before the app loads. The clock keeps running, which
  // lets IndexedDB and autosave timers work normally.
  await page.clock.install({ time: new Date("2026-06-15T12:00:00") });

  await startFresh(page, "./#/household");

  await enter(page, "Current age", "34");
  await enter(page, "Target retirement age", "50");

  await page.getByRole("link", { name: "Next: Income & expenses →" }).click();
  await enter(page, "Per year, after tax", "64000");

  await page.getByRole("link", { name: "Next: Assets →" }).click();
  await enter(page, "Current value", "720000");
  await enter(page, "Expected return per year", "7");
  await enter(page, "Contributions per year", "30000");

  await page.getByRole("link", { name: "Next: Assumptions →" }).click();
  await enter(page, "Inflation per year", "2.5");
  await enter(page, "Safe withdrawal rate", "4");

  // Results: the FI year and the nominal FI number at the retirement age.
  await page.getByRole("link", { name: "Next: Results →" }).click();
  await expect(page.getByText("$1,600,000", { exact: true })).toBeVisible();
  await expect(page.getByText("$2,375,209 at age 50 (2042)")).toBeVisible();
  await expect(page.getByText("2038", { exact: true })).toBeVisible();
  await expect(page.getByText("Age 46", { exact: true })).toBeVisible();

  // Year by year: the 2038 row is the only highlighted one.
  await page.getByRole("link", { name: "Next: Year by year →" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Year by year" })).toBeVisible();

  const highlightedRows = page.locator("tr[data-highlighted='true']");
  await expect(highlightedRows).toHaveCount(1);
  await expect(highlightedRows.getByRole("cell").first()).toHaveText("2038");
  await expect(highlightedRows.getByRole("cell").nth(1)).toHaveText("46");

  // The toggle starts on nominal: the balances are the engine's nominal figures.
  await expect(page.getByRole("button", { name: "Nominal" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect((await rowCells(page, 2027))[2]).toBe("$30,000");
  expect((await rowCells(page, 2027))[4]).toBe("$800,400");
  expect((await rowCells(page, 2038))[4]).toBe("$2,158,231");

  // Switching to today's dollars divides by the inflation index: $30,000 ÷ 1.025.
  await page.getByRole("button", { name: "Today's dollars" }).click();
  expect((await rowCells(page, 2027))[2]).toBe("$29,268");
  expect((await rowCells(page, 2027))[4]).toBe("$780,878");

  // Autosave waits 500 ms after the last edit; reload once the plan is stored.
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<number | undefined>((resolve, reject) => {
            const openRequest = indexedDB.open("au-fire-planner");
            openRequest.onerror = () => reject(openRequest.error);
            openRequest.onsuccess = () => {
              const database = openRequest.result;
              const getAll = database.transaction("plans").objectStore("plans").getAll();
              getAll.onsuccess = () => {
                database.close();
                resolve(getAll.result[0]?.document?.assumptions?.safeWithdrawalRatePercent);
              };
              getAll.onerror = () => reject(getAll.error);
            };
          }),
      ),
    )
    .toBe(4);

  await page.reload();

  // The values are still there: the inputs, and the projection built from them.
  await expect(page.locator("tr[data-highlighted='true']").getByRole("cell").first()).toHaveText(
    "2038",
  );
  await page.getByRole("link", { name: "← Results" }).click();
  await expect(page.getByText("Age 46", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "← Assumptions" }).click();
  await expect(page.getByLabel("Inflation per year")).toHaveValue("2.5%");
  await page.getByRole("link", { name: "← Assets" }).click();
  await expect(page.getByLabel("Contributions per year")).toHaveValue("$30,000");
  await page.goto("./#/household");
  await expect(page.getByLabel("Current age")).toHaveValue("34");
  await expect(page.getByLabel("Target retirement age")).toHaveValue("50");
});
