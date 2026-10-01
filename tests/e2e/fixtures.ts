// Shared Playwright `test` for every E2E spec. It adds an automatic check for
// NFR-4 ("data stays on this device"): whatever a test does, the page must not
// make a single request to any origin other than the app's own.
//
//   spec file ──imports──► test (this file) ──► records page requests ──► asserts after the test

import { expect, test as base } from "@playwright/test";

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

export { expect };
