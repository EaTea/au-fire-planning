import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { App } from "./App";

// Component tests for the top-level App, using React Testing Library to render
// it into jsdom. Later steps extend this with routing and navigation checks.
describe("App", () => {
  // Smoke test: proves the whole toolchain (Vitest, jsdom, React Testing
  // Library, jest-dom matchers) works, and that App shows the app title.
  it("renders the AU FIRE Planner heading", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "AU FIRE Planner" })).toBeInTheDocument();
  });
});
