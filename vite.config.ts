import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Vite build and dev-server configuration, plus the Vitest test configuration.
// `base` is the sub-path GitHub Pages serves the site from, so asset URLs in the
// built `index.html` and the dev server both live under /au-fire-planning/.
export default defineConfig({
  plugins: [react()],
  base: "/au-fire-planning/",

  // Unit and component tests (`npm test`). Component tests need a DOM, which
  // jsdom provides. Tests live next to the code they cover (src/) or, for
  // cross-cutting ones, under tests/unit/. E2E tests (tests/e2e/) are run by
  // Playwright instead and are deliberately not matched here.
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}", "tests/unit/**/*.test.{ts,tsx}"],
    setupFiles: ["tests/setup/vitest.setup.ts"],
  },
});
