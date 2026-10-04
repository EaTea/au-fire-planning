import type { Page } from "@playwright/test";

import { expect, startFresh, test, yearCell } from "./fixtures";

// End-to-end test for M6's headline flow (IN-5, SUPER-1, FIRE-4): enter worked
// example B2 (tests/worked-examples/m6-bridge.json) through the real screens and
// read the bridge check and Year by year, change "Super accessible at" to 60 to
// turn it into B1, then reload to check the age is kept. The clock is fixed in
// 2026 so the calendar years don't depend on the real date.

/** Types `value` into the field with `label` and presses Tab to commit it. */
async function enter(page: Page, label: string, value: string): Promise<void> {
  await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByLabel(label, { exact: true }).press("Tab");
}

/**
 * Enters example B2 (B1 with the default access age of 65): age 55, retire at
 * 56, plan until 66, $100,000 in the portfolio and in super (both at 0%),
 * $20,000 a year, no inflation. Leaves the page on Results. Called once by the
 * test below; the access age is then changed on the Household screen.
 */
async function enterExampleB2(page: Page): Promise<void> {
  await startFresh(page, "./#/household");
  await enter(page, "Current age", "55");
  await enter(page, "Target retirement age", "56");
  await enter(page, "Plan until age", "66");

  await page.getByRole("link", { name: "Next: Income & expenses →" }).click();
  await enter(page, "Per year, after tax", "20000");
  await page.getByRole("button", { name: "$ amount" }).click();
  await enter(page, "Retirement spending per year", "20000");

  await page.getByRole("link", { name: "Next: Assets →" }).click();
  await enter(page, "Super balance", "100000");
  await enter(page, "Return, net of fees", "0");
  await enter(page, "Current value", "100000");
  await enter(page, "Expected return per year", "0");
  await enter(page, "Cash savings", "0");

  await page.getByRole("link", { name: "Next: Assumptions →" }).click();
  await enter(page, "Inflation per year", "0");
  await enter(page, "General interest rate", "0");
  await page.getByRole("link", { name: "Next: Results →" }).click();
}

/**
 * Reads the super access age stored in the browser's IndexedDB, so the test
 * can wait for the debounced autosave (500 ms after the last edit) before it
 * reloads. Returns undefined until a plan with the age has been saved.
 */
function savedSuperAccessAge(page: Page): Promise<unknown> {
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
            resolve(getAll.result[0]?.document?.household?.people?.[0]?.superAccessAgeYears);
          };
          getAll.onerror = () => reject(getAll.error);
        };
      }),
  );
}

test("B2 is SHORT on the bridge, access at 60 makes it B1 (MET), and the age survives a reload", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-06-15T12:00:00") });
  await enterExampleB2(page);

  // B2: the bridge is short in 2033 to 2035, and after access is met.
  const card = page.locator("#bridge");
  await expect(card.getByText("Bridge: outside super, 2028 – 2035")).toBeVisible();
  await expect(
    card.getByText("Need $160,000 in 2027 · projected $100,000 · short in 2033 – 2035"),
  ).toBeVisible();
  await expect(card.getByText("SHORT", { exact: true })).toBeVisible();
  await expect(card.getByText("After super is accessible, 2036 – 2037")).toBeVisible();
  await expect(card.getByText("MET", { exact: true })).toBeVisible();

  // Year by year: the Bridge band, and the shortfall says why.
  await expect(page.locator(".projection-band td")).toHaveText([
    "Working · contributing",
    "Bridge · retired, super locked until 65",
    "Super accessible",
  ]);
  expect(await yearCell(page, 2033, "Status")).toBe("Shortfall −$20,000 · super locked until 65");

  // Super accessible at 60: example B1, where both parts are met.
  await page.goto("#/household");
  await enter(page, "Super accessible at", "60");
  await page.getByRole("link", { name: "Next: Income & expenses →" }).click();
  await page.goto("#/results");

  await expect(card.getByText("Bridge: outside super, 2028 – 2030")).toBeVisible();
  await expect(card.getByText("Need $60,000 in 2027 · projected $100,000")).toBeVisible();
  await expect(card.getByText("After super is accessible, 2031 – 2037")).toBeVisible();
  await expect(card.getByText("Need $140,000 in 2030 · projected $140,000")).toBeVisible();
  await expect(card.getByText("MET", { exact: true })).toHaveCount(2);
  await expect(page.locator(".projection-band td")).toHaveText([
    "Working · contributing",
    "Bridge · retired, super locked until 60",
    "Super accessible",
  ]);

  // Reload: wait for the autosave, then check the age and the result are kept.
  await expect.poll(() => savedSuperAccessAge(page)).toBe(60);
  await page.reload();

  await page.goto("#/household");
  await expect(page.getByLabel("Super accessible at", { exact: true })).toHaveValue("60");

  await page.goto("#/results");
  await expect(card.getByText("Bridge: outside super, 2028 – 2030")).toBeVisible();
  await expect(card.getByText("MET", { exact: true })).toHaveCount(2);
});
