import type { Page } from "@playwright/test";

import { expect, startFresh, test, yearCell } from "./fixtures";

// End-to-end tests for M6 step 7: the "Can you bridge to super?" card, the
// "Super accessible" milestone and the Bridge bands in Year by year, with the
// figures of worked examples B1, B2 and A (tests/worked-examples/m6-bridge.json)
// entered through the real screens. (The full flow, including a reload, is
// bridge.spec.ts's job in step 9.) The clock is fixed in 2026 so the calendar
// years don't depend on the real date.

/** Types `value` into the field with `label` and presses Tab to commit it. */
async function enter(page: Page, label: string, value: string): Promise<void> {
  await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByLabel(label, { exact: true }).press("Tab");
}

/**
 * Enters example B2 (B1 with the default access age of 65): age 55, retire at
 * 56, plan until 66, $100,000 in the portfolio and in super (both at 0%),
 * $20,000 a year, no inflation. With `accessAge`, also sets "Super accessible
 * at" (60 makes it B1). Leaves the page on Results.
 */
async function enterExampleB(page: Page, accessAge?: string): Promise<void> {
  await startFresh(page, "./#/household");
  await enter(page, "Current age", "55");
  await enter(page, "Target retirement age", "56");
  await enter(page, "Plan until age", "66");
  if (accessAge !== undefined) await enter(page, "Super accessible at", accessAge);

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

/** The bridge card on Results. */
function bridgeCard(page: Page) {
  return page.locator("#bridge");
}

test("B2: the bridge is SHORT in 2033 to 2035, after access is MET, and Year by year shows the bands", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-06-15T12:00:00") });
  await enterExampleB(page);

  const card = bridgeCard(page);
  await expect(card.getByText("Bridge: outside super, 2028 – 2035")).toBeVisible();
  await expect(
    card.getByText("Need $160,000 in 2027 · projected $100,000 · short in 2033 – 2035"),
  ).toBeVisible();
  await expect(card.getByText("SHORT", { exact: true })).toBeVisible();
  await expect(card.getByText("After super is accessible, 2036 – 2037")).toBeVisible();
  await expect(card.getByText("Need $40,000 in 2035 · projected $100,000")).toBeVisible();
  await expect(card.getByText("MET", { exact: true })).toBeVisible();

  // The milestone and the "On this page" link.
  const milestone = page.locator("#milestones li", { hasText: "Super accessible" });
  await expect(milestone).toContainText("2036");
  await expect(milestone).toContainText("Age 65");
  await page.getByRole("link", { name: "Can you bridge to super?" }).click();
  await expect(page).toHaveURL(/view=bridge/);

  // Year by year: the bands, and the locked wording on a bridge shortfall.
  const bands = page.locator(".projection-band td");
  await expect(bands).toHaveText([
    "Working · contributing",
    "Bridge · retired, super locked until 65",
    "Super accessible",
  ]);
  expect(await yearCell(page, 2033, "Status")).toBe("Shortfall −$20,000 · super locked until 65");
  expect(await yearCell(page, 2036, "Status")).toBe("✓");
});

test("B1: with super accessible at 60 both parts are MET and the bands say 60", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-06-15T12:00:00") });
  await enterExampleB(page, "60");

  const card = bridgeCard(page);
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
});

test("worked example A: the bridge and after-access figures, in nominal and today's dollars", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-06-15T12:00:00") });
  await startFresh(page, "./#/household");

  // Example A as in super.spec.ts, with the default access age of 65.
  await enter(page, "Current age", "34");
  await enter(page, "Target retirement age", "50");
  await enter(page, "Plan until age", "95");

  await page.getByRole("link", { name: "Next: Income & expenses →" }).click();
  await enter(page, "Gross salary per year", "145000");
  await page.getByLabel("Grows at", { exact: true }).selectOption({ label: "Inflation + …%" });
  await enter(page, "Above inflation by", "1");
  await enter(page, "Per year, after tax", "64000");

  await page.getByRole("link", { name: "Next: Assets →" }).click();
  await enter(page, "Super balance", "185000");
  await enter(page, "Return, net of fees", "7");
  await enter(page, "Salary sacrifice per year", "10000");
  await enter(page, "Salary sacrifice from year", "2027");
  await enter(page, "Salary sacrifice to year", "2042");
  await enter(page, "Current value", "720000");
  await enter(page, "Expected return per year", "7");
  await enter(page, "Contributions per year", "30000");
  await enter(page, "Cash savings", "20000");

  await page.getByRole("link", { name: "Next: Assumptions →" }).click();
  await enter(page, "Inflation per year", "2.5");
  await enter(page, "General interest rate", "4");
  await enter(page, "Safe withdrawal rate", "4");
  await page.getByRole("link", { name: "Next: Results →" }).click();

  const card = bridgeCard(page);
  await expect(card.getByText("Bridge: outside super, 2043 – 2056")).toBeVisible();
  await expect(card.getByText("Need $978,217 in 2042 · projected $2,999,659")).toBeVisible();
  await expect(card.getByText("Need $2,559,160 in 2056 · projected $7,821,132")).toBeVisible();
  await expect(card.getByText("MET", { exact: true })).toHaveCount(2);

  // Today's dollars: each figure uses its own year's inflation index.
  await page.getByRole("button", { name: "Today's dollars" }).click();
  await expect(card.getByText("Need $658,951 in 2042 · projected $2,020,645")).toBeVisible();
  await expect(card.getByText("Need $1,220,061 in 2056 · projected $3,728,667")).toBeVisible();
});
