import type { Page } from "@playwright/test";

import { expect, startFresh, test } from "./fixtures";

// End-to-end tests for M6 step 8: chart (b), "Bridge period: outside super,
// then super", and the Coast FIRE split card, with worked examples B1 and B2
// (tests/worked-examples/m6-bridge.json) entered through the real screens.
// Like fireChart.spec.ts, they check the rendered colours (not the library's
// defaults), the shaded band, the hover tooltip and click-through to a row of
// Year by year. The clock is fixed in 2026 so the calendar years don't depend
// on the real date.

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

test("B2: the bridge chart fills in the role colours, shades the bridge, shows a tooltip and jumps to a year", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-06-15T12:00:00") });
  await enterExampleB(page);

  const card = page.locator("#bridge");
  await expect(
    card.getByRole("heading", { name: "Bridge period: outside super, then super" }),
  ).toBeVisible();

  // Each fill is its role colour (gold, and the green-grey), not Recharts' default.
  const outsideFill = card.locator(".chart-series-outside-super .recharts-area-area");
  const superFill = card.locator(".chart-series-super .recharts-area-area");
  await expect(outsideFill).toBeVisible();
  await expect(superFill).toBeVisible();
  await expect(outsideFill).toHaveCSS("fill", "rgb(255, 205, 0)");
  await expect(superFill).toHaveCSS("fill", "rgb(156, 201, 170)");

  // The legend names both, and the bridge years are shaded and labelled.
  const legend = card.getByRole("list", { name: "Legend" });
  await expect(
    legend.getByText("Outside super (portfolio and cash)", { exact: true }),
  ).toBeVisible();
  await expect(legend.getByText("Super", { exact: true })).toBeVisible();

  const band = card.locator(".chart-band");
  await expect(band).toHaveCount(1);
  await expect(card.locator(".chart-picture").getByText("Bridge", { exact: true })).toBeVisible();
  // The band is the error pink at its low opacity, not Recharts' default grey.
  const bandShape = band.locator(".recharts-reference-area-rect");
  await expect(bandShape).toHaveCSS("fill", "rgb(255, 179, 167)");
  await expect(bandShape).toHaveCSS("fill-opacity", "0.2");

  // Hovering shows the year, the age and the two balances.
  const picture = card.locator(".chart-picture");
  await picture.scrollIntoViewIfNeeded();
  const box = (await picture.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);

  const tooltip = page.locator(".chart-tooltip");
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toContainText(/20\d\d · age \d+/);
  await expect(tooltip.locator(".chart-tooltip-row")).toHaveCount(2);
  await expect(
    tooltip.getByText("Outside super (portfolio and cash)", { exact: true }),
  ).toBeVisible();
  await expect(tooltip.getByText(/^\$[\d,]+$/)).toHaveCount(2);

  // Clicking a year scrolls to that row of Year by year, outlined.
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await expect(page).toHaveURL(/#\/results\?year=\d{4}$/);

  const requestedYear = new URL(page.url()).hash.match(/year=(\d{4})/)?.[1];
  expect(requestedYear).toBeDefined();

  const outlinedRow = page.locator("tr[data-outlined='true']");
  await expect(outlinedRow).toHaveCount(1);
  await expect(outlinedRow.getByRole("cell").first()).toHaveText(requestedYear!);
  await expect(outlinedRow).toBeInViewport();
});

test("B2: the split card says outside super is not reached and super has coasted since 2026", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-06-15T12:00:00") });
  await enterExampleB(page);

  const card = page.locator("#coast-split");
  await expect(card.getByRole("heading", { name: "Super and outside super" })).toBeVisible();

  await expect(
    card.getByText("Needs $160,000 today · has $100,000", { exact: true }),
  ).toBeVisible();
  await expect(card.getByText("Not before retirement", { exact: true })).toBeVisible();
  await expect(card.getByText("Needs $40,000 today · has $100,000", { exact: true })).toBeVisible();
  await expect(card.getByText("Coasting since 2026", { exact: true })).toBeVisible();

  // The working behind a need opens in place.
  await card.getByRole("button", { name: "How is this calculated?" }).first().click();
  await expect(card.locator(".explain-panel")).toHaveCount(1);

  // The "On this page" link scrolls to the card.
  await page.getByRole("link", { name: "Super and outside super", exact: true }).click();
  await expect(page).toHaveURL(/view=coast-split/);
});

test("B1: with super accessible at 60, outside super coasts but super on its own does not", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-06-15T12:00:00") });
  await enterExampleB(page, "60");

  const card = page.locator("#coast-split");
  await expect(card.getByText("Needs $60,000 today · has $100,000", { exact: true })).toBeVisible();
  await expect(card.getByText("Coasting since 2026", { exact: true })).toBeVisible();
  await expect(
    card.getByText("Needs $140,000 today · has $100,000", { exact: true }),
  ).toBeVisible();
  await expect(card.getByText("Not before retirement", { exact: true })).toBeVisible();

  // Statuses are words, with their kind on the meter.
  await expect(card.locator(".status-meter-coasting")).toHaveCount(1);
  await expect(card.locator(".status-meter-notYet")).toHaveCount(1);
});
