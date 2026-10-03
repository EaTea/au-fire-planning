import type { Locator, Page } from "@playwright/test";

import { expect, startFresh, test } from "./fixtures";

// In-browser contrast sweep (step 3 of "Colour scheme: green and gold" in
// PLAN.md). src/ui/styles/tokens.test.ts only checks the role pairs listed in
// it; this checks what the browser actually renders, so it also catches text
// on a background nobody listed: inherited colours, and browser default
// styles such as the grey background Chrome gives an unstyled <button>.
//
//   for each page and state ─► every element showing text, and every input
//        ─► rendered text colour vs first opaque background behind it
//        ─► fail with the list of anything below 4.5:1

/** WCAG AA minimum contrast for normal-size text. */
const minimumTextContrast = 4.5;

/** The step pages that exist so far (M2), by hash route. */
const stepPages = [
  "#/household",
  "#/income-expenses",
  "#/assets",
  "#/assumptions",
  "#/results",
  "#/year-by-year",
];

/** Pages with input fields, filled in by fillEveryInput. */
const inputPages = ["#/household", "#/income-expenses", "#/assets", "#/assumptions"];

/**
 * Runs in the page: returns one line for every visible element whose text
 * (or, for inputs, typed value) has less than 4.5:1 contrast with the first
 * opaque background behind it. With `onlyHoveredOrFocused`, only elements
 * inside whatever is hovered or focused are checked, which keeps the
 * hover/focus sweep from reporting the same static failures over and over.
 */
function findLowContrastText(page: Page, onlyHoveredOrFocused = false): Promise<string[]> {
  return page.evaluate(
    ({ minimum, onlyActive }) => {
      /** Reads "rgb(r, g, b)" or "rgba(r, g, b, a)" into numbers (alpha defaults to 1). */
      const parseColour = (colour: string): [number, number, number, number] => {
        const [red = 0, green = 0, blue = 0, alpha = 1] = (colour.match(/[\d.]+/g) ?? []).map(
          Number,
        );
        return [red, green, blue, alpha];
      };

      /** WCAG relative luminance of an sRGB colour. */
      const luminance = ([red, green, blue]: number[]): number => {
        const linear = (channel = 0) => {
          const value = channel / 255;
          return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue);
      };

      /** The first mostly-opaque background at or above the element (white if none). */
      const backgroundBehind = (element: Element): number[] => {
        for (let current: Element | null = element; current; current = current.parentElement) {
          const background = parseColour(getComputedStyle(current).backgroundColor);
          if (background[3] > 0.5) {
            return background;
          }
        }
        return [255, 255, 255];
      };

      // Elements that directly contain text, plus inputs (their value is text too).
      const textElements = [...document.querySelectorAll("body *")].filter(
        (element) =>
          element.tagName === "INPUT" ||
          [...element.childNodes].some(
            (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
          ),
      );

      const active = onlyActive ? [...document.querySelectorAll(":hover, :focus")] : [];

      const failures: string[] = [];
      for (const element of textElements) {
        if (onlyActive && !active.some((activeElement) => activeElement.contains(element))) {
          continue;
        }

        const style = getComputedStyle(element);
        const box = element.getBoundingClientRect();
        if (style.visibility === "hidden" || box.width === 0 || box.height === 0) {
          continue;
        }

        const text = luminance(parseColour(style.color));
        const background = luminance(backgroundBehind(element));
        const ratio = (Math.max(text, background) + 0.05) / (Math.min(text, background) + 0.05);

        if (ratio < minimum) {
          const label =
            element instanceof HTMLInputElement ? element.value : (element.textContent ?? "");
          failures.push(
            `${ratio.toFixed(2)}:1 <${element.tagName.toLowerCase()} class="${element.className}"> ` +
              `"${label.trim().slice(0, 40)}" (text ${style.color} on ${backgroundBehind(element).join(",")})`,
          );
        }
      }

      return failures;
    },
    { minimum: minimumTextContrast, onlyActive: onlyHoveredOrFocused },
  );
}

/**
 * Hovers and then focuses every link, button and input on the current page,
 * collecting low-contrast text inside it in each state. Hover and focus
 * styles (pill hover, toggle states, focused inputs) only show up this way.
 */
async function findLowContrastWhileInteracting(page: Page): Promise<string[]> {
  const failures: string[] = [];

  for (const control of await page.locator("a, button, input").all()) {
    if (!(await control.isVisible())) {
      continue;
    }

    await control.hover();
    failures.push(...(await findLowContrastText(page, true)).map((line) => `hover: ${line}`));

    await control.focus();
    failures.push(...(await findLowContrastText(page, true)).map((line) => `focus: ${line}`));
  }

  return failures;
}

/**
 * Types a value into every input on the current page, then moves focus away.
 * "valid" uses a value every field accepts: 50 for ages (15 to 100), 90 for
 * "Plan until age" (50 to 110, and after the other ages), and 5 for everything
 * else (percentages are capped at 15%). "invalid" uses -5, which every field
 * rejects.
 */
async function fillEveryInput(page: Page, values: "valid" | "invalid"): Promise<void> {
  for (const input of await page.locator("input").all()) {
    const labelText = await labelTextOf(input);
    const isAge = /age/i.test(labelText);
    const isEndAge = /plan until age/i.test(labelText);

    if (values === "invalid") {
      await input.fill("-5");
    } else {
      await input.fill(isEndAge ? "90" : isAge ? "50" : "5");
    }
  }
  await page.locator("h1").click();
}

/**
 * Fills the dated expenses table on the Income & expenses page, leaving it in
 * the state the sweep should look at. Makes sure the table has one row, then:
 * "valid" gives the row an amount and opens its actions menu; "invalid" types
 * a negative amount and presses Enter, which leaves that editor open showing
 * its error. Does nothing on other pages.
 */
async function fillDatedExpensesTable(page: Page, values: "valid" | "invalid"): Promise<void> {
  const addButton = page.getByRole("button", { name: "+ Add expense" });
  if ((await addButton.count()) === 0) {
    return;
  }

  // One row is enough to cover the table; the add button also opens the name editor.
  if ((await page.locator(".editable-cell").count()) === 0) {
    await addButton.click();
    await page.keyboard.type("Replace car");
    await page.keyboard.press("Enter");
  }

  // The second editable cell is "Per year".
  await page.locator(".editable-cell").nth(1).click();
  await page.locator(".editable-cell-editor input").fill(values === "valid" ? "5" : "-5");
  await page.keyboard.press("Enter");

  if (values === "valid") {
    await page.getByRole("button", { name: /^Actions for/ }).click();
  }
}

/** Fills every input on `inputPage` (see fillEveryInput), then its dated expenses table if it has one. */
async function fillPage(page: Page, inputPage: string, values: "valid" | "invalid") {
  await page.goto(inputPage);
  await fillEveryInput(page, values);
  await fillDatedExpensesTable(page, values);
}

/** The text of the <label> that names `input`, or "" if it has none. */
async function labelTextOf(input: Locator): Promise<string> {
  return input.evaluate((element) => (element as HTMLInputElement).labels?.[0]?.textContent ?? "");
}

test("the welcome page has readable text, including while hovering and focusing", async ({
  page,
}) => {
  // A first visit is redirected to the welcome page.
  await page.goto("./");
  await expect(page.getByRole("button", { name: "Start planning" })).toBeVisible();

  expect(await findLowContrastText(page)).toEqual([]);
  expect(await findLowContrastWhileInteracting(page)).toEqual([]);
});

test("every step page has readable text with its fields empty", async ({ page }) => {
  await startFresh(page);

  for (const stepPage of stepPages) {
    await page.goto(stepPage);
    await expect(page.locator("h1")).toBeVisible();

    expect(await findLowContrastText(page), stepPage).toEqual([]);
    expect(await findLowContrastWhileInteracting(page), stepPage).toEqual([]);
  }
});

test("every input page has readable text with valid and with invalid values", async ({ page }) => {
  await startFresh(page);

  for (const value of ["valid", "invalid"] as const) {
    for (const inputPage of inputPages) {
      await fillPage(page, inputPage, value);

      // Makes sure each pass is what it says: errors to check in the invalid
      // pass, and none in the valid one.
      if (value === "invalid") {
        await expect(page.locator(".field-error").first()).toBeVisible();
      } else {
        await expect(page.locator(".field-error")).toHaveCount(0);
      }

      expect(await findLowContrastText(page), `${inputPage} with ${value}`).toEqual([]);
      expect(await findLowContrastWhileInteracting(page), `${inputPage} with ${value}`).toEqual([]);
    }
  }
});

test("the results page has readable text with every explanation open", async ({ page }) => {
  await startFresh(page);

  for (const inputPage of inputPages) {
    await fillPage(page, inputPage, "valid");
  }

  await page.goto("#/results");
  for (const explainToggle of await page.getByRole("button", { name: /How is this/ }).all()) {
    await explainToggle.click();
  }

  expect(await findLowContrastText(page)).toEqual([]);
  expect(await findLowContrastWhileInteracting(page)).toEqual([]);
});

test("the year by year table has readable text in both dollar modes, including the FI row", async ({
  page,
}) => {
  await startFresh(page);
  for (const inputPage of inputPages) {
    await fillPage(page, inputPage, "valid");
  }
  await page.goto("#/year-by-year");

  // The highlighted FI row is the one styled differently, so make sure it's there.
  await expect(page.locator("tr[data-highlighted='true']")).toHaveCount(1);

  for (const mode of ["Today's dollars", "Nominal"]) {
    await page.getByRole("button", { name: mode }).click();
    expect(await findLowContrastText(page), mode).toEqual([]);
    expect(await findLowContrastWhileInteracting(page), mode).toEqual([]);
  }
});

test("the results and year by year pages have readable text with a shortfall, its banners and an outlined row", async ({
  page,
}) => {
  // Fix "now" so the shortfall year (2031) and the ?year= row are the same on any day.
  await page.clock.install({ time: new Date("2026-06-15T12:00:00") });
  await startFresh(page);

  // Worked example B (tests/worked-examples/m3-drawdown.json): the money runs out in 2031.
  const entries: [string, string, string][] = [
    ["#/household", "Current age", "60"],
    ["#/household", "Target retirement age", "60"],
    ["#/household", "Plan until age", "65"],
    ["#/income-expenses", "Per year, after tax", "30000"],
    ["#/assets", "Current value", "100000"],
    ["#/assets", "Expected return per year", "10"],
    ["#/assets", "Cash savings", "10000"],
    ["#/assumptions", "Inflation per year", "0"],
    ["#/assumptions", "General interest rate", "5"],
  ];
  for (const [route, label, value] of entries) {
    await page.goto(route);
    await page.getByLabel(label).fill(value);
    await page.getByLabel(label).press("Tab");
  }

  // Results with the "Money lasts" tile, the runs-out banner and every explanation open.
  await page.goto("#/results");
  await expect(page.getByRole("alert")).toContainText("Your money runs out at age 65");
  for (const explainToggle of await page.getByRole("button", { name: /How is this/ }).all()) {
    await explainToggle.click();
  }
  expect(await findLowContrastText(page), "results with a shortfall").toEqual([]);
  expect(await findLowContrastWhileInteracting(page), "results with a shortfall").toEqual([]);

  // Opening with ?year= outlines that row for a few seconds, so check it straight away.
  await page.goto("#/year-by-year?year=2029");
  await expect(page.getByRole("alert")).toContainText("1 year can't be funded: 2031");
  await expect(page.getByText("Shortfall −$6,729")).toBeVisible();
  await expect(page.locator("tr[data-outlined='true']")).toHaveCount(1);

  for (const mode of ["Today's dollars", "Nominal"]) {
    await page.getByRole("button", { name: mode }).click();
    expect(await findLowContrastText(page), mode).toEqual([]);
    expect(await findLowContrastWhileInteracting(page), mode).toEqual([]);
  }
});
