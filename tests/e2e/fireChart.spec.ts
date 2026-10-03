import type { Page } from "@playwright/test";

import { expect, startFresh, test } from "./fixtures";

// End-to-end test for M3's FIRE chart (FIRE-3, FIRE-7): enter worked example A
// (tests/worked-examples/m3-drawdown.json) through the real screens, see the
// earliest retirement age, check the chart draws its lines in the role colours
// (not the library's default blue), that hovering shows a tooltip, and that
// clicking a year scrolls to that row, outlined, on the same page. The clock is
// fixed in 2026 so the calendar years don't depend on the real date.

/** Types `value` into the field with `label` and presses Tab to commit it. */
async function enter(page: Page, label: string, value: string): Promise<void> {
  await page.getByLabel(label).fill(value);
  await page.getByLabel(label).press("Tab");
}

test("worked example A: earliest retirement at 43, a coloured chart with a tooltip, and click-through to a year", async ({
  page,
}) => {
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
  await enter(page, "Cash savings", "20000");

  await page.getByRole("link", { name: "Next: Assumptions →" }).click();
  await enter(page, "Inflation per year", "2.5");
  await enter(page, "Safe withdrawal rate", "4");

  await page.getByRole("link", { name: "Next: Results →" }).click();

  // The earliest retirement tile.
  const earliestTile = page.locator(".metric", { hasText: "Earliest retirement" });
  await expect(earliestTile.getByText("Age 43", { exact: true })).toBeVisible();

  // The chart card, drawn in the role colours, following the page's dollars toggle.
  const chartCard = page.locator("section.card", { hasText: "Investable net worth vs FI number" });
  await expect(page.getByRole("button", { name: "Nominal" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  const investableLine = chartCard.locator(".chart-series-investable .recharts-line-curve");
  const fiNumberLine = chartCard.locator(".chart-series-fi-number .recharts-line-curve");
  await expect(investableLine).toBeVisible();
  await expect(fiNumberLine).toBeVisible();

  // Gold and white from the role variables, not Recharts' default blue (#3182bd).
  await expect(investableLine).toHaveCSS("stroke", "rgb(255, 205, 0)");
  await expect(fiNumberLine).toHaveCSS("stroke", "rgb(255, 255, 255)");
  await expect(fiNumberLine).toHaveCSS("stroke-dasharray", /\d/);

  // Markers for the FI year and retirement.
  await expect(chartCard.locator(".chart-marker")).toHaveCount(2);
  await expect(chartCard.getByText("FI reached", { exact: true })).toBeVisible();
  await expect(chartCard.getByText("Retirement", { exact: true })).toBeVisible();

  // Hovering shows the year, the age and two dollar values.
  const picture = chartCard.locator(".chart-picture");
  // The mouse can only reach what is in the viewport.
  await picture.scrollIntoViewIfNeeded();
  const box = (await picture.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);

  const tooltip = page.locator(".chart-tooltip");
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toContainText(/20\d\d · age \d+/);
  await expect(tooltip.locator(".chart-tooltip-row")).toHaveCount(2);
  await expect(tooltip.getByText(/^\$[\d,]+$/)).toHaveCount(2);

  // Clicking a year scrolls down to that row in the table on the same page, outlined.
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await expect(page).toHaveURL(/#\/results\?year=\d{4}$/);

  const requestedYear = new URL(page.url()).hash.match(/year=(\d{4})/)?.[1];
  expect(requestedYear).toBeDefined();

  const outlinedRow = page.locator("tr[data-outlined='true']");
  await expect(outlinedRow).toHaveCount(1);
  await expect(outlinedRow.getByRole("cell").first()).toHaveText(requestedYear!);
  await expect(outlinedRow).toBeInViewport();
});
