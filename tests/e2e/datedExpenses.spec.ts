import type { Page } from "@playwright/test";

import { expect, startFresh, test } from "./fixtures";

// End-to-end test for the dated and one-off expenses table (M3 step 5, EXP-3)
// in a real browser, covering what jsdom can't: focus moving between the cell
// button and its editor, the blur that Chromium fires when an editor is removed
// (Escape must not commit), and the keyboard-only row menu. The clock is fixed
// in 2026, so a new row starts in 2027.

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

test("dated expenses can be added, edited, duplicated, deleted and survive a reload", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-06-15T12:00:00") });
  await startFresh(page, "./#/income-expenses");

  const table = page.getByRole("table", { name: "Dated and one-off expenses" });
  await expect(page.getByText("No dated expenses yet.")).toBeVisible();

  // Add a row: its name editor opens and has focus, so typing goes straight in.
  await page.getByRole("button", { name: "+ Add expense" }).click();
  await page.keyboard.type("Replace car");
  await page.keyboard.press("Enter");

  // Enter commits the name and returns focus to its cell.
  const nameCell = page.getByRole("button", { name: "Expense for Replace car" });
  await expect(nameCell).toHaveText("Replace car");
  await expect(nameCell).toBeFocused();
  await expect(page.getByRole("button", { name: "From for Replace car" })).toHaveText("2027");
  await expect(page.getByRole("button", { name: "To for Replace car" })).toHaveText("(once)");

  // Edit the amount and commit with Enter.
  await page.getByRole("button", { name: "Per year for Replace car" }).click();
  await page.getByLabel("Amount per year for Replace car").fill("40000");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Per year for Replace car" })).toHaveText(
    "$40,000",
  );

  // Invalid text: the editor stays open and shows an error, and nothing is saved.
  await page.getByRole("button", { name: "Per year for Replace car" }).click();
  await page.getByLabel("Amount per year for Replace car").fill("lots");
  await page.keyboard.press("Enter");
  await expect(page.getByText("Enter a number, for example 60,000.")).toBeVisible();
  await expect(page.getByLabel("Amount per year for Replace car")).toBeFocused();

  // Fix it and commit.
  await page.getByLabel("Amount per year for Replace car").fill("35000");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Per year for Replace car" })).toHaveText(
    "$35,000",
  );

  // Escape cancels: the old value stays, even though the editor is removed while focused.
  await page.getByRole("button", { name: "Per year for Replace car" }).click();
  await page.getByLabel("Amount per year for Replace car").fill("99999");
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("Amount per year for Replace car")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Per year for Replace car" })).toHaveText(
    "$35,000",
  );
  await expect(page.getByRole("button", { name: "Per year for Replace car" })).toBeFocused();

  // Duplicate with the keyboard only: open the row menu, then choose Duplicate.
  await page.getByRole("button", { name: "Actions for Replace car" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menuitem", { name: "Duplicate" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(table.getByRole("button", { name: "Expense for Replace car" })).toHaveCount(2);

  // Delete the first copy with the keyboard only: ArrowDown moves to Delete.
  await page.getByRole("button", { name: "Actions for Replace car" }).first().focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: "Delete" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(table.getByRole("button", { name: "Expense for Replace car" })).toHaveCount(1);

  // Wait for autosave (500 ms after the last edit), then reload.
  await expect.poll(() => savedDatedExpenseCount(page)).toBe(1);
  await page.reload();

  await expect(page.getByRole("button", { name: "Expense for Replace car" })).toHaveText(
    "Replace car",
  );
  await expect(page.getByRole("button", { name: "Per year for Replace car" })).toHaveText(
    "$35,000",
  );
  await expect(page.getByRole("button", { name: "Expense for Replace car" })).toHaveCount(1);
});
