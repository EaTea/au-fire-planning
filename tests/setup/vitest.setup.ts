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

// jsdom has no ResizeObserver, which Recharts' ResponsiveContainer needs on
// Results. This stand-in never reports a size, so the chart draws nothing
// there; the chart's own tests give it a fixed width and height instead.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver ??= ResizeObserverStub;
