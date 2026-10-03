import type { Page } from "@playwright/test";

import { expect, startFresh, test, yearCell } from "./fixtures";

// End-to-end tests for M5's headline flows (IN-21, IN-22, IN-23, SUPER-2,
// SUPER-5): enter worked example A (tests/worked-examples/m5-super.json) through
// the real screens and check Results and Year by year, enter example S4 to see
// that super is locked until 65, and check the super inputs survive a reload.
// The clock is fixed in 2026 so the calendar years don't depend on the real date.

/** Types `value` into the field with `label` and presses Tab to commit it. */
async function enter(page: Page, label: string, value: string): Promise<void> {
  await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByLabel(label, { exact: true }).press("Tab");
}

/**
 * Reads the autosaved super balance and the salary sacrifice amount (entered
 * after the balance, so seeing both means the super edits are stored). The
 * sacrifice years aren't stored because 2027 to 2042 are the defaults (the
 * first year and the retirement year). Undefined before the first save.
 */
function savedSuperInputs(page: Page): Promise<unknown> {
  return page.evaluate(
    () =>
      new Promise<unknown>((resolve, reject) => {
        const openRequest = indexedDB.open("au-fire-planner");
        openRequest.onerror = () => reject(openRequest.error);
        openRequest.onsuccess = () => {
          const database = openRequest.result;
          const getAll = database.transaction("plans").objectStore("plans").getAll();
          getAll.onsuccess = () => {
            database.close();
            const savedSuper = getAll.result[0]?.document?.household?.people?.[0]?.superAccount;
            resolve({
              balance: savedSuper?.balanceDollars,
              sacrificePerYear: savedSuper?.salarySacrifice?.annualDollars,
            });
          };
          getAll.onerror = () => reject(getAll.error);
        };
      }),
  );
}

test("worked example A reaches FI in 2033 with super, and the super inputs survive a reload", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-06-15T12:00:00") });
  await startFresh(page, "./#/household");

  // Example A: age 34, retire at 50, plan until 95.
  await enter(page, "Current age", "34");
  await enter(page, "Target retirement age", "50");
  await enter(page, "Plan until age", "95");

  // Salary $145,000 at inflation + 1%, living expenses $64,000.
  await page.getByRole("link", { name: "Next: Income & expenses →" }).click();
  await enter(page, "Gross salary per year", "145000");
  await page.getByLabel("Grows at", { exact: true }).selectOption({ label: "Inflation + …%" });
  await enter(page, "Above inflation by", "1");
  await enter(page, "Per year, after tax", "64000");

  // Super $185,000 at 7% net of fees with $10,000 a year of salary sacrifice 2027 to 2042.
  await page.getByRole("link", { name: "Next: Assets →" }).click();
  await enter(page, "Super balance", "185000");
  await enter(page, "Return, net of fees", "7");
  await enter(page, "Salary sacrifice per year", "10000");
  await enter(page, "Salary sacrifice from year", "2027");
  await enter(page, "Salary sacrifice to year", "2042");

  // $720,000 portfolio at 7% with $30,000 a year, and $20,000 cash.
  await enter(page, "Current value", "720000");
  await enter(page, "Expected return per year", "7");
  await enter(page, "Contributions per year", "30000");
  await enter(page, "Cash savings", "20000");

  await page.getByRole("link", { name: "Next: Assumptions →" }).click();
  await enter(page, "Inflation per year", "2.5");
  await enter(page, "General interest rate", "4");
  await enter(page, "Safe withdrawal rate", "4");
  await page.getByRole("link", { name: "Next: Results →" }).click();

  // The tiles: FI in 2033 at 41, earliest retirement 40, Coast FIRE already reached.
  const fiTile = page.locator(".metric", { hasText: "FI reached" });
  await expect(fiTile.getByText("2033", { exact: true })).toBeVisible();
  await expect(fiTile.getByText("Age 41", { exact: true })).toBeVisible();

  const earliestTile = page.locator(".metric", { hasText: "Earliest retirement" });
  await expect(earliestTile.getByText("Age 40", { exact: true })).toBeVisible();

  const coastTile = page.locator(".metric", { hasText: "Coast FIRE" });
  await expect(
    coastTile.getByText("Reached: contributions are now optional", { exact: true }),
  ).toBeVisible();

  // Year by year, 2027 (nominal dollars, the default).
  expect(await yearCell(page, 2027, "Salary")).toBe("$150,075");
  expect(await yearCell(page, 2027, "Super")).toBe("$219,815");

  // Autosave waits 500 ms after the last edit; reload once the super balance is stored.
  await expect
    .poll(() => savedSuperInputs(page))
    .toEqual({ balance: 185000, sacrificePerYear: 10000 });
  await page.reload();

  await page.goto("#/assets");
  await expect(page.getByLabel("Super balance", { exact: true })).toHaveValue("$185,000");
  await expect(page.getByLabel("Return, net of fees", { exact: true })).toHaveValue("7%");
  await expect(page.getByLabel("Salary sacrifice per year", { exact: true })).toHaveValue(
    "$10,000",
  );
  await expect(page.getByLabel("Salary sacrifice from year", { exact: true })).toHaveValue("2027");
  await expect(page.getByLabel("Salary sacrifice to year", { exact: true })).toHaveValue("2042");

  await page.goto("#/results?view=year-by-year");
  expect(await yearCell(page, 2027, "Super")).toBe("$219,815");
});

test("worked example S4 can't draw its super until 65, so 2027 to 2030 are shortfalls", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-06-15T12:00:00") });
  await startFresh(page, "./#/household");

  // Example S4: age 60 and retired, plan until 67.
  await enter(page, "Current age", "60");
  await enter(page, "Target retirement age", "60");
  await enter(page, "Plan until age", "67");

  // $20,000 living expenses and $20,000 retirement spending as an amount.
  await page.getByRole("link", { name: "Next: Income & expenses →" }).click();
  await enter(page, "Per year, after tax", "20000");
  await page.getByRole("button", { name: "$ amount" }).click();
  await enter(page, "Retirement spending per year", "20000");

  // Only $500,000 of super at 0%: no portfolio and no cash.
  await page.getByRole("link", { name: "Next: Assets →" }).click();
  await enter(page, "Super balance", "500000");
  await enter(page, "Return, net of fees", "0");
  await enter(page, "Cash savings", "0");

  await page.getByRole("link", { name: "Next: Assumptions →" }).click();
  await enter(page, "Inflation per year", "0");
  await enter(page, "General interest rate", "0");
  await page.getByRole("link", { name: "Next: Results →" }).click();

  // Ages 61 to 64 can't be funded while super is locked; at 65 it is drawn on.
  for (const year of [2027, 2028, 2029, 2030]) {
    expect(await yearCell(page, year, "Status"), `status in ${year}`).toBe(
      "Shortfall −$20,000 · super locked until 65",
    );
  }
  expect(await yearCell(page, 2031, "Status")).toBe("✓");
  expect(await yearCell(page, 2031, "Super")).toBe("$480,000");
});
