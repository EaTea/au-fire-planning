// Runs once before each test file (registered in vite.config.ts `setupFiles`).
// Adds the jest-dom matchers (toBeInTheDocument, toHaveTextContent, ...) to
// Vitest's `expect`, so component tests can make readable DOM assertions.
import "@testing-library/jest-dom/vitest";

// Vitest doesn't expose globals, so React Testing Library can't register its
// automatic cleanup. Unmount whatever each test rendered so tests don't see
// each other's DOM.
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
