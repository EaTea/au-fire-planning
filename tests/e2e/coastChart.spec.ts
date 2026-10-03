import type { Page } from "@playwright/test";

import { expect, startFresh, test } from "./fixtures";

// End-to-end test for M4's Coast FIRE chart (COAST-6): enter worked example A
// (tests/worked-examples/m4-coast.json) through the real screens, then check
// that all four lines are drawn in their role colours and styles (not
// Recharts' default blue, which is what a lost CSS class would fall back to),
// that the markers are there, that it follows the page's dollars toggle and
// that clicking a year goes to that row. The clock is fixed in 2026.

/** Types `value` into the field with `label` and presses Tab to commit it. */
async function enter(page: Page, label: string, value: string): Promise<void> {
  await page.getByLabel(label).fill(value);
  await page.getByLabel(label).press("Tab");
}

test("worked example A: the Coast FIRE chart draws four styled lines, follows the toggle and links to a year", async ({
  page,
}, testInfo) => {
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

  const card = page.locator("section.card", { hasText: "When could you stop contributing?" });
  await card.scrollIntoViewIfNeeded();

  // Gold solid; muted green-white solid; white dashed; white dotted (round dots).
  const savingsLine = card.locator(".chart-series-savings .recharts-line-curve");
  const noContributionsLine = card.locator(".chart-series-no-contributions .recharts-line-curve");
  const coastLine = card.locator(".chart-series-coast-number .recharts-line-curve");
  const fiLine = card.locator(".chart-series-fi-number .recharts-line-curve");

  await expect(savingsLine).toHaveCSS("stroke", "rgb(255, 205, 0)");
  await expect(noContributionsLine).toHaveCSS("stroke", "rgb(207, 232, 214)");
  await expect(coastLine).toHaveCSS("stroke", "rgb(255, 255, 255)");
  await expect(fiLine).toHaveCSS("stroke", "rgb(255, 255, 255)");

  await expect(savingsLine).toHaveCSS("stroke-dasharray", "none");
  await expect(noContributionsLine).toHaveCSS("stroke-dasharray", "none");
  await expect(coastLine).toHaveCSS("stroke-dasharray", "8px, 5px");
  await expect(fiLine).toHaveCSS("stroke-dasharray", "0.1px, 6px");
  await expect(fiLine).toHaveCSS("stroke-linecap", "round");

  // Markers: Coast FIRE in 2029 and retirement; and the plan's caption, in nominal dollars.
  await expect(card.locator(".chart-marker")).toHaveCount(2);
  await expect(card.getByText("Coast FIRE", { exact: true }).first()).toBeVisible();
  await expect(card.getByText("Retirement", { exact: true }).first()).toBeVisible();
  await expect(card.getByText(/\(nominal dollars\)\.$/)).toContainText(
    "an FI number of $2,375,209",
  );

  // Four legend entries and no toggle of its own.
  await expect(card.locator(".chart-legend li")).toHaveCount(4);
  await expect(card.getByRole("group")).toHaveCount(0);

  // For a person to look at: the four lines on the deep green page.
  await card.screenshot({ path: testInfo.outputPath("coast-chart.png") });

  // It follows the page's toggle: today's dollars end at the $1,600,000 FI number.
  await page.getByRole("button", { name: "Today's dollars" }).click();
  await expect(card.getByRole("row", { name: /^2042 50 .* \$1,600,000 \$1,600,000$/ })).toHaveCount(
    1,
  );

  // Clicking a year goes to that row of the Year by year table.
  const picture = card.locator(".chart-picture");
  await picture.scrollIntoViewIfNeeded();
  const box = (await picture.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await expect(page.locator(".chart-tooltip")).toBeVisible();
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await expect(page).toHaveURL(/#\/results\?year=\d{4}$/);
  await expect(page.locator("tr[data-outlined='true']")).toHaveCount(1);
});
