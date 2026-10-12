// Shared Playwright `test` for every E2E spec. It adds an automatic check for
// NFR-4 ("data stays on this device"): whatever a test does, the page must not
// make a single request to any origin other than the app's own.
//
//   spec file ──imports──► test (this file) ──► records page requests ──► asserts after the test

import { expect, test as base, type Page } from "@playwright/test";

export const test = base.extend<{ sameOriginRequestsOnly: void }>({
  // `auto: true` runs this fixture in every test without the test asking for it.
  sameOriginRequestsOnly: [
    async ({ page, baseURL }, use) => {
      if (baseURL === undefined) {
        throw new Error("baseURL must be set in playwright.config.ts");
      }

      const requestedUrls: string[] = [];
      page.on("request", (request) => requestedUrls.push(request.url()));

      // Run the test itself.
      await use();

      // `data:` and `blob:` URLs are built inside the browser and never leave the device.
      const networkUrls = requestedUrls.filter((url) => !/^(data|blob):/.test(url));
      const appOrigin = new URL(baseURL).origin;

      // Guards against a recording that silently captured nothing.
      expect(networkUrls.length).toBeGreaterThan(0);
      expect(networkUrls.filter((url) => !url.startsWith(`${appOrigin}/`))).toEqual([]);
    },
    { auto: true },
  ],
});

/**
 * Opens the app as a first-time visitor (each Playwright test gets a fresh
 * browser context, so storage is empty), accepts the welcome page, then goes
 * to `hash` (default: the app's start page). Existing specs call this instead
 * of `page.goto` so the first-run redirect to #/welcome doesn't get in their
 * way; only welcome.spec.ts opens the app without it.
 *
 *   goto("./") ─► redirected to #/welcome ─► "Start planning" ─► goto(hash)
 */
export async function startFresh(page: Page, hash = "./"): Promise<void> {
  await page.goto("./");
  await page.getByRole("button", { name: "Start planning" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Household" })).toBeVisible();

  await page.goto(hash);
}

/**
 * The Year by year table on Results. Scoped by its accessible name, because
 * the charts' visually hidden data tables also have a row per year.
 */
function yearByYearTable(page: Page) {
  return page.getByRole("table", { name: "Year by year projection" });
}

/**
 * The cell texts of the Year by year row for `year`. Waits for that row to
 * render first: the table appears after a page change or reload, and reading
 * it too early would silently return no cells.
 */
export async function rowCells(page: Page, year: number): Promise<string[]> {
  const row = yearByYearTable(page)
    .getByRole("row")
    .filter({ has: page.getByRole("cell", { name: String(year), exact: true }) });

  await expect(row).toHaveCount(1);
  return row.getByRole("cell").allTextContents();
}

/**
 * One cell of the Year by year row for `year`, found by its column header so
 * that new columns never shift it. Waits for the header and the row to render
 * before reading, so it can't race the table after navigation.
 */
export async function yearCell(page: Page, year: number, header: string): Promise<string> {
  const table = yearByYearTable(page);
  await expect(table.getByRole("columnheader", { name: header, exact: true })).toBeVisible();

  const headers = await table.getByRole("columnheader").allTextContents();
  const columnIndex = headers.indexOf(header);
  if (columnIndex < 0) throw new Error(`No column headed "${header}"`);

  return (await rowCells(page, year))[columnIndex] ?? "";
}

export { expect };
