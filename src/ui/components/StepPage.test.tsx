import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import { steps, type Step } from "../navigation/steps";
import { StepPage } from "./StepPage";

/** Renders StepPage for the step with the given number (1-7). */
function renderStepPage(stepNumber: number) {
  const step = steps[stepNumber - 1] as Step;

  render(
    <MemoryRouter>
      <StepPage step={step} intro="Intro text">
        <p>Page content</p>
      </StepPage>
    </MemoryRouter>,
  );
}

// Component tests for the shared step page layout and its Back/Next footer.
describe("StepPage", () => {
  // Title, intro and children all appear.
  it("shows the title, intro and content", () => {
    renderStepPage(3);

    expect(screen.getByRole("heading", { level: 1, name: "Assets" })).toBeInTheDocument();
    expect(screen.getByText("Intro text")).toBeInTheDocument();
    expect(screen.getByText("Page content")).toBeInTheDocument();
  });

  // First step: nothing to go back to.
  it("has no Back link on the first step", () => {
    renderStepPage(1);

    expect(screen.queryByText(/^←/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Next: Income & expenses →" })).toBeInTheDocument();
  });

  // Last step: nothing to go forward to.
  it("has no Next link on the last step", () => {
    renderStepPage(7);

    expect(screen.queryByText(/^Next:/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "← Year by year" })).toBeInTheDocument();
  });

  // Middle step: both neighbours, pointing at the right routes.
  it("links to both neighbours on a middle step", () => {
    renderStepPage(4);

    expect(screen.getByRole("link", { name: "← Assets" })).toHaveAttribute("href", "/assets");
    expect(screen.getByRole("link", { name: "Next: Results →" })).toHaveAttribute(
      "href",
      "/results",
    );
  });
});
