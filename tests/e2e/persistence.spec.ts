import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";

// End-to-end test for saving (M1 step 7): values entered through the real
// screens are autosaved to IndexedDB and are still there after a reload.

/** The parts of the stored plan document this test checks. */
interface StoredPlanSummary {
  readonly livingAnnualDollars?: number;
  readonly portfolioValueDollars?: number;
  readonly safeWithdrawalRatePercent?: number;
}

/**
 * Reads the stored plan straight out of the page's IndexedDB (not through the
 * app's own code, so it checks what is really on disk). Returns undefined
 * until the first save has happened.
 */
async function readStoredPlan(page: Page): Promise<StoredPlanSummary | undefined> {
  return page.evaluate(
    () =>
      new Promise<StoredPlanSummary | undefined>((resolve, reject) => {
        const openRequest = indexedDB.open("au-fire-planner");
        openRequest.onerror = () => reject(openRequest.error);
        openRequest.onsuccess = () => {
          const database = openRequest.result;
          if (!database.objectStoreNames.contains("plans")) {
            database.close();
            resolve(undefined);
            return;
          }

          const getAll = database.transaction("plans").objectStore("plans").getAll();
          getAll.onerror = () => reject(getAll.error);
          getAll.onsuccess = () => {
            database.close();
            const document = getAll.result[0]?.document;
            resolve(
              document && {
                livingAnnualDollars: document.expenses?.livingAnnualDollars,
                portfolioValueDollars: document.portfolios?.[0]?.valueDollars,
                safeWithdrawalRatePercent: document.assumptions?.safeWithdrawalRatePercent,
              },
            );
          };
        };
      }),
  );
}

test("values entered are autosaved and still there after a reload", async ({ page }) => {
  await page.goto("./#/income-expenses");

  await page.getByLabel("Per year, after tax").fill("64000");
  await page.getByLabel("Per year, after tax").press("Tab");

  await page.getByRole("link", { name: "Next: Assets →" }).click();
  await page.getByLabel("Current value").fill("720000");
  await page.getByLabel("Current value").press("Tab");

  await page.getByRole("link", { name: "Next: Assumptions →" }).click();
  await page.getByLabel("Safe withdrawal rate").fill("4");
  await page.getByLabel("Safe withdrawal rate").press("Tab");

  // Autosave waits 500 ms after the last edit, so reloading straight away
  // could lose it. Rather than sleeping, poll the real database until every
  // entered value has been written, and only then reload.
  await expect
    .poll(() => readStoredPlan(page))
    .toEqual({
      livingAnnualDollars: 64000,
      portfolioValueDollars: 720000,
      safeWithdrawalRatePercent: 4,
    });

  await page.reload();

  // The inputs are still there on each screen...
  await expect(page.getByLabel("Safe withdrawal rate")).toHaveValue("4%");
  await page.getByRole("link", { name: "← Assets" }).click();
  await expect(page.getByLabel("Current value")).toHaveValue("$720,000");
  await page.getByRole("link", { name: "← Income & expenses" }).click();
  await expect(page.getByLabel("Per year, after tax")).toHaveValue("$64,000");

  // ...and so is the calculated result.
  await page.goto("./#/results");
  await expect(page.getByText("$1,600,000", { exact: true })).toBeVisible();
  await expect(page.getByText("45%", { exact: true })).toBeVisible();
});
