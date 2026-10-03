import type { Page } from "@playwright/test";

import { expect, startFresh, test } from "./fixtures";

// End-to-end test for M4's headline flow (COAST-1, COAST-2, COAST-6, OUT-4):
// enter worked example A (tests/worked-examples/m4-coast.json) through the real
// screens, see the Coast FIRE tile, the Milestones in year order and the
// chart's marker and hover, switch to example E's inputs to see "not before
// retirement", and check the tile survives a reload. The chart's stroke colours
// and dash styles are asserted in coastChart.spec.ts, so this file stays about
// the user's flow. The clock is fixed in 2026 so the calendar years don't
// depend on the real date.

/** Types `value` into the field with `label` and presses Tab to commit it. */
async function enter(page: Page, label: string, value: string): Promise<void> {
  await page.getByLabel(label).fill(value);
  await page.getByLabel(label).press("Tab");
}

/** Reads the autosaved plan's current age, or undefined before the first save. */
function savedCurrentAge(page: Page): Promise<number | undefined> {
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
            resolve(getAll.result[0]?.document?.household?.people?.[0]?.currentAgeYears);
          };
          getAll.onerror = () => reject(getAll.error);
        };
      }),
  );
}

test("worked example A reaches Coast FIRE in 2029, and example E never does; the tile survives a reload", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-06-15T12:00:00") });
  await startFresh(page, "./#/household");

  // Example A: age 34, retire at 50, $720,000 at 7% plus $30,000 a year, $20,000 cash.
  await enter(page, "Current age", "34");
  await enter(page, "Target retirement age", "50");
  await page.getByRole("link", { name: "Next: Income & expenses →" }).click();
  await enter(page, "Per year, after tax", "64000");
  await page.getByRole("link", { name: "Next: Assets →" }).click();
  await enter(page, "Current value", "720000");
  await enter(page, "Expected return per year", "7");
  await enter(page, "Contributions per year", "30000");
  await enter(page, "Cash savings", "20000");
  await page.getByRole("link", { name: "Next: Assumptions →" }).click();
  await enter(page, "Inflation per year", "2.5");
  await enter(page, "Safe withdrawal rate", "4");
  await page.getByRole("link", { name: "Next: Results →" }).click();

  // The Coast FIRE tile: the number, the retirement-year figure and when it is reached.
  const coastTile = page.locator(".metric", { hasText: "Coast FIRE" });
  await expect(coastTile.getByText("$811,877", { exact: true })).toBeVisible();
  await expect(coastTile.getByText("$1,205,235 in 2042 dollars", { exact: true })).toBeVisible();
  await expect(coastTile.getByText("Reached in 2029, at age 37", { exact: true })).toBeVisible();

  // Milestones: Coast FIRE (2029) comes before FI reached (2038), then retirement (2042).
  const milestones = page.locator("ol.milestone-timeline > li");
  await expect(milestones.first()).toContainText("2029");
  await expect(milestones.first()).toContainText("Coast FIRE");
  await expect(milestones.nth(1)).toContainText("2038");
  await expect(milestones.nth(1)).toContainText("FI reached");
  await expect(milestones.nth(2)).toContainText("2042");
  await expect(milestones.nth(2)).toContainText("Retirement");

  // The chart: a "Coast FIRE" marker, and hovering shows four values.
  const chartCard = page.locator("section.card", { hasText: "When could you stop contributing?" });
  await chartCard.scrollIntoViewIfNeeded();
  await expect(chartCard.getByText("Coast FIRE", { exact: true }).first()).toBeVisible();

  const picture = chartCard.locator(".chart-picture");
  await picture.scrollIntoViewIfNeeded();
  const box = (await picture.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);

  const tooltip = page.locator(".chart-tooltip");
  await expect(tooltip).toBeVisible();
  await expect(tooltip.locator(".chart-tooltip-row")).toHaveCount(4);
  await expect(tooltip.getByText(/^\$[\d,]+$/)).toHaveCount(4);

  // Example E: age 30, retire at 40, $10,000 at 5% plus $1,000 a year, no cash, 3% inflation, $80,000.
  await page.goto("./#/household");
  await enter(page, "Current age", "30");
  await enter(page, "Target retirement age", "40");
  await page.getByRole("link", { name: "Next: Income & expenses →" }).click();
  await enter(page, "Per year, after tax", "80000");
  await page.getByRole("link", { name: "Next: Assets →" }).click();
  await enter(page, "Current value", "10000");
  await enter(page, "Expected return per year", "5");
  await enter(page, "Contributions per year", "1000");
  await enter(page, "Cash savings", "0");
  await page.getByRole("link", { name: "Next: Assumptions →" }).click();
  await enter(page, "Inflation per year", "3");
  await page.getByRole("link", { name: "Next: Results →" }).click();

  await expect(coastTile.getByText("$1,650,096", { exact: true })).toBeVisible();
  await expect(coastTile.getByText("Not before retirement at 40", { exact: true })).toBeVisible();

  // Autosave waits 500 ms after the last edit; reload once the new age is stored.
  await expect.poll(() => savedCurrentAge(page)).toBe(30);
  await page.reload();

  // The saved plan loads after the page does, so wait for the tile to reappear.
  await expect(coastTile.getByText("$1,650,096", { exact: true })).toBeVisible();
  await expect(coastTile.getByText("Not before retirement at 40", { exact: true })).toBeVisible();
});
