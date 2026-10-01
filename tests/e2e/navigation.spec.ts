import type { Page } from "@playwright/test";

import { expect, startFresh, test } from "./fixtures";

// End-to-end tests for the M0 walking skeleton (the header, the seven-step
// navigation and the placeholder pages) and the colour scheme, driven through
// a real browser against the production build (see playwright.config.ts).

/** The seven steps in journey order, matching src/ui/navigation/steps.ts. */
const stepLabels = [
  "Household",
  "Income & expenses",
  "Assets",
  "Assumptions",
  "Results",
  "Year by year",
  "Scenarios",
];

/**
 * Starts recording anything the page logs as an error (console.error calls and
 * uncaught exceptions) and returns the live list, so a test can assert it is
 * still empty after visiting pages. Call before navigating.
 */
function collectBrowserErrors(page: Page): string[] {
  const errors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`console.error: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    errors.push(`uncaught exception: ${error.message}`);
  });

  return errors;
}

test("opening the app shows the header, all seven steps and the Household page", async ({
  page,
}) => {
  await startFresh(page);

  await expect(page.getByText("AU FIRE Planner")).toBeVisible();

  const stepLinks = page.getByRole("navigation", { name: "Steps" }).getByRole("link");
  await expect(stepLinks).toHaveCount(7);
  for (const [index, label] of stepLabels.entries()) {
    await expect(stepLinks.nth(index)).toContainText(label);
  }

  await expect(page.getByRole("heading", { level: 1, name: "Household" })).toBeVisible();
});

test("pressing Next six times visits every step in order and ends on Scenarios", async ({
  page,
}) => {
  await startFresh(page);

  const currentStepLink = page.getByRole("navigation", { name: "Steps" }).locator("[aria-current]");

  for (const [index, label] of stepLabels.entries()) {
    await expect(page.getByRole("heading", { level: 1, name: label })).toBeVisible();
    await expect(currentStepLink).toContainText(label);

    const nextLabel = stepLabels[index + 1];
    if (nextLabel !== undefined) {
      await page.getByRole("link", { name: `Next: ${nextLabel} →` }).click();
    }
  }

  // The journey ends on Scenarios, which has no Next link.
  await expect(page.getByRole("link", { name: /^Next:/ })).toHaveCount(0);
});

test("opening #/results directly shows Results as the current step", async ({ page }) => {
  await startFresh(page, "./#/results");

  await expect(page.getByRole("heading", { level: 1, name: "Results" })).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Steps" }).getByRole("link", { name: /Results/ }),
  ).toHaveAttribute("aria-current", "page");
});

test("no errors are logged to the browser console on any page", async ({ page }) => {
  const browserErrors = collectBrowserErrors(page);

  await startFresh(page);

  for (const [index] of stepLabels.entries()) {
    await page.goto("./");
    await page.getByRole("navigation", { name: "Steps" }).getByRole("link").nth(index).click();
    await expect(page.getByRole("heading", { level: 1, name: stepLabels[index] })).toBeVisible();
  }

  expect(browserErrors).toEqual([]);
});

// The colour scheme (see "Colour scheme: green and gold" in PLAN.md). Checks
// the stylesheets are loaded in the production build and the national colours
// reach the page, which unit tests of tokens.css alone can't show.
test("the app uses green and gold: deep green page and gold current step", async ({ page }) => {
  // Accept the welcome page first: it hides the step navigation until then.
  await startFresh(page);

  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(0, 77, 37)");
  await expect(page.locator("body")).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(page.getByRole("navigation", { name: "Steps" }).locator("[aria-current]")).toHaveCSS(
    "background-color",
    "rgb(255, 205, 0)",
  );
});
