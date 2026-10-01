import { defineConfig, devices } from "@playwright/test";

// Playwright configuration for the end-to-end tests (`npm run test:e2e`).
// The tests run against the production build served by `vite preview`, so they
// exercise the same files that get deployed to GitHub Pages.
//
//   playwright test --> webServer: build + preview on :4173 --> chromium --> tests/e2e/*.spec.ts
//
// The app lives under the /au-fire-planning/ sub-path (see `base` in
// vite.config.ts), so the base URL includes it and the tests can use relative
// URLs such as page.goto("./#/results").
const appBaseUrl = "http://localhost:4173/au-fire-planning/";

// Environments with a preinstalled Chromium (e.g. the lead's development
// sandbox) point at it with PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH. CI leaves it
// unset and uses the browser installed by `npx playwright install`.
const preinstalledChromiumPath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

export default defineConfig({
  testDir: "tests/e2e",

  // One retry in CI absorbs the odd flaky start-up; locally a failure should
  // show up immediately.
  retries: process.env.CI ? 1 : 0,

  // The HTML report is kept as a CI artifact; locally the console list is enough.
  reporter: process.env.CI ? [["html"], ["list"]] : "list",

  use: {
    baseURL: appBaseUrl,
    trace: "on-first-retry",
    launchOptions: {
      ...(preinstalledChromiumPath !== undefined &&
        preinstalledChromiumPath !== "" && { executablePath: preinstalledChromiumPath }),
    },
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  // Builds the app and serves it before the tests start. Locally an already
  // running preview server on the same port is reused to save time.
  webServer: {
    command: "npm run build && npm run preview -- --port 4173 --strictPort",
    url: appBaseUrl,
    reuseExistingServer: !process.env.CI,
  },
});
