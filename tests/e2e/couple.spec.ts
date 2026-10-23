import type { Page } from "@playwright/test";

import { expect, startFresh, test, yearCell } from "./fixtures";

// End-to-end test for M7's headline flow (IN-1, IN-3, IN-6, FIRE-4): choose "A
// couple" and enter worked example D2 (tests/worked-examples/m7-couples.json)
// through the real screens, read the bridge check and Year by year with both
// names, set Sam's super access to 60 to turn it into D, reload to check
// Person 2 is kept, then choose "Just me" and check the plan is one person
// again. The clock is fixed in 2026 so the calendar years don't depend on the
// real date.

/** Types `value` into the field with `label` and presses Tab to commit it. */
async function enter(page: Page, label: string, value: string): Promise<void> {
  await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByLabel(label, { exact: true }).press("Tab");
}

/**
 * Enters example D2 with an interim amount of $20,000: Alex 55 retiring at 56
 * with $150,000 super (access 65), Sam 53 retiring at 58 with $100,000 super
 * (access left at 65), a $200,000 portfolio, $40,000 a year in retirement, all
 * rates 0, plan until Sam is 66. Starts on Household and ends on Results.
 */
async function enterExampleD2(page: Page): Promise<void> {
  await startFresh(page, "./#/household");

  await page.getByRole("button", { name: "A couple" }).click();
  await enter(page, "Person 1: Name (optional)", "Alex");
  await enter(page, "Person 2: Name (optional)", "Sam");
  await enter(page, "Alex: Current age", "55");
  await enter(page, "Alex: Target retirement age", "56");
  await enter(page, "Sam: Current age", "53");
  await enter(page, "Sam: Target retirement age", "58");
  await enter(page, "Plan until age", "66");

  await page.getByRole("link", { name: "Next: Income & expenses →" }).click();
  await enter(page, "Per year, after tax", "40000");
  await page.getByRole("button", { name: "$ amount" }).click();
  await enter(page, "Retirement spending per year", "40000");
  await enter(page, "Drawn from savings while one of you is retired", "20000");

  await page.getByRole("link", { name: "Next: Assets →" }).click();
  await enter(page, "Alex: Super balance", "150000");
  await enter(page, "Alex: Return, net of fees", "0");
  await enter(page, "Sam: Super balance", "100000");
  await enter(page, "Sam: Return, net of fees", "0");
  await enter(page, "Current value", "200000");
  await enter(page, "Expected return per year", "0");
  await enter(page, "Cash savings", "0");

  await page.getByRole("link", { name: "Next: Assumptions →" }).click();
  await enter(page, "Inflation per year", "0");
  await enter(page, "General interest rate", "0");
  await page.getByRole("link", { name: "Next: Results →" }).click();
}

/**
 * Reads the saved plan's household from the browser's IndexedDB, so the test
 * can wait for the debounced autosave (500 ms after the last edit) before it
 * reloads. Returns undefined until a plan has been saved.
 */
function savedPeople(
  page: Page,
): Promise<{ count: number; secondPersonAccessAge: number | undefined } | undefined> {
  return page.evaluate(
    () =>
      new Promise<{ count: number; secondPersonAccessAge: number | undefined } | undefined>(
        (resolve, reject) => {
          const openRequest = indexedDB.open("au-fire-planner");
          openRequest.onerror = () => reject(openRequest.error);
          openRequest.onsuccess = () => {
            const database = openRequest.result;
            const getAll = database.transaction("plans").objectStore("plans").getAll();
            getAll.onsuccess = () => {
              database.close();
              const people = getAll.result[0]?.document?.household?.people;
              resolve(
                people === undefined
                  ? undefined
                  : { count: people.length, secondPersonAccessAge: people[1]?.superAccessAgeYears },
              );
            };
            getAll.onerror = () => reject(getAll.error);
          };
        },
      ),
  );
}

test("D2 is SHORT on the bridge with both names, Sam's access at 60 makes it D (MET), Person 2 survives a reload and Just me removes them", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-06-15T12:00:00") });
  await enterExampleD2(page);

  // D2: the bridge is short in 2035; after access is met.
  const card = page.locator("#bridge");
  await expect(card.getByText("Bridge: outside super, 2028 – 2035")).toBeVisible();
  await expect(
    card.getByText("Need $240,000 in 2027 · projected $200,000 · short in 2035"),
  ).toBeVisible();
  await expect(card.getByText("SHORT", { exact: true })).toBeVisible();
  await expect(card.getByText("After super is accessible, 2036 – 2039")).toBeVisible();
  await expect(card.getByText("MET", { exact: true })).toBeVisible();

  // Both names in the tiles and the banner.
  await expect(page.getByText("Runs out at Alex 64 · Sam 62", { exact: true })).toBeVisible();
  await expect(page.getByText(/Your money runs out at Alex 64 · Sam 62 \(2035\)/)).toBeVisible();
  await expect(page.getByText("Alex 58 · Sam 60", { exact: true })).toBeVisible();

  // Year by year: the one-retired band, the bridge band naming each person, and the shortfall says why.
  await expect(page.locator(".projection-band td")).toHaveText([
    "Working · contributing",
    "One retired · Sam working",
    "Bridge · super locked: Alex until 65 (2036), Sam until 65 (2038)",
    "Super accessible",
  ]);
  expect(await yearCell(page, 2035, "Status")).toBe(
    "Shortfall −$40,000 · Alex's super locked until 65 (2036), Sam's until 65 (2038)",
  );
  expect(await yearCell(page, 2030, "Alex · Sam")).toBe("59 · 57");

  // Sam's super accessible at 60: example D, where both parts are met.
  await page.goto("#/household");
  await enter(page, "Sam: Super accessible at", "60");
  await page.goto("#/results");

  await expect(card.getByText("Bridge: outside super, 2028 – 2032")).toBeVisible();
  await expect(
    card.getByText("Need $120,000 in 2027 · projected $200,000", { exact: true }),
  ).toBeVisible();
  await expect(card.getByText("After super is accessible, 2033 – 2039")).toBeVisible();
  await expect(card.getByText("Need $280,000 in 2032 · projected $330,000")).toBeVisible();
  await expect(card.getByText("MET", { exact: true })).toHaveCount(2);

  // Reload: wait for the autosave, then check Person 2 (and the result) are kept.
  // Wait for the latest edit (Sam's access age), not just for a save with two people.
  await expect.poll(() => savedPeople(page)).toEqual({ count: 2, secondPersonAccessAge: 60 });
  await page.reload();

  await page.goto("#/household");
  await expect(page.getByLabel("Sam: Current age", { exact: true })).toHaveValue("53");
  await expect(page.getByLabel("Sam: Super accessible at", { exact: true })).toHaveValue("60");
  await expect(page.getByRole("button", { name: "A couple" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await page.goto("#/results");
  await expect(card.getByText("MET", { exact: true })).toHaveCount(2);

  // Just me: Person 2 is gone, and Results is the one-person plan.
  await page.goto("#/household");
  await page.getByRole("button", { name: "Just me" }).click();
  await expect(page.getByLabel("Sam: Current age", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Current age", { exact: true })).toHaveValue("55");
  await expect.poll(async () => (await savedPeople(page))?.count).toBe(1);

  await page.goto("#/results");
  const table = page.getByRole("table", { name: "Year by year projection" });
  await expect(table.getByRole("columnheader", { name: "Age", exact: true })).toBeVisible();
  await expect(table.getByRole("columnheader", { name: "Alex · Sam" })).toHaveCount(0);
  await expect(table.getByText(/One retired/)).toHaveCount(0);
  await expect(page.getByText("Retirement (your target)")).toBeVisible();
});
