import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { App } from "./App";

// Component tests for the top-level App: header, routing and Back/Next. The
// hash router reads window.location, so each test sets the hash first.
describe("App", () => {
  beforeEach(() => {
    window.location.hash = "";
  });

  // Smoke test: proves the toolchain works and the header shows the app title.
  it("shows the AU FIRE Planner logo in the header", () => {
    render(<App />);

    expect(screen.getByText("AU FIRE Planner")).toBeInTheDocument();
  });

  // Unknown routes redirect to the first step.
  it("lands on the Household placeholder for an unknown route", () => {
    window.location.hash = "#/no-such-page";

    render(<App />);

    expect(screen.getByRole("heading", { level: 1, name: "Household" })).toBeInTheDocument();
    expect(screen.getByText("Arrives in milestone M2")).toBeInTheDocument();
  });

  // Next moves along the journey.
  it("moves to Income & expenses when Next is clicked", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("link", { name: "Next: Income & expenses →" }));

    expect(
      screen.getByRole("heading", { level: 1, name: "Income & expenses" }),
    ).toBeInTheDocument();
  });

  // Values entered on one step are still there after visiting another.
  it("keeps entered values when moving between steps", async () => {
    const user = userEvent.setup();
    window.location.hash = "#/income-expenses";
    render(<App />);

    await user.type(screen.getByLabelText("Per year, after tax"), "64000{Enter}");
    await user.click(screen.getByRole("link", { name: "Next: Assets →" }));
    await user.type(screen.getByLabelText("Current value"), "720000{Enter}");
    await user.click(screen.getByRole("link", { name: "Next: Assumptions →" }));
    await user.type(screen.getByLabelText("Safe withdrawal rate"), "3.5{Enter}");

    await user.click(screen.getByRole("link", { name: "← Assets" }));
    expect(screen.getByLabelText("Current value")).toHaveValue("$720,000");
    await user.click(screen.getByRole("link", { name: "← Income & expenses" }));
    expect(screen.getByLabelText("Per year, after tax")).toHaveValue("$64,000");
  });
});
