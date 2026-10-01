import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { PlanProvider, usePlan, usePlanDispatch, usePlanSummary } from "./PlanProvider";
import type { Plan } from "./types";

// A plan with one portfolio and nothing else entered, with fixed ids.
const blankPlan: Plan = {
  household: { people: [{ id: "person-1", label: "Person 1" }] },
  expenses: {},
  assumptions: {},
  portfolios: [{ id: "portfolio-1", name: "Share portfolio" }],
};

// Tiny consumer: shows the summary status and FI number, with buttons that dispatch changes.
function PlanProbe() {
  const plan = usePlan();
  const summary = usePlanSummary();
  const dispatch = usePlanDispatch();

  return (
    <div>
      <p data-testid="living">{String(plan.expenses.livingAnnual)}</p>
      <p data-testid="status">{summary.status}</p>
      <p data-testid="fi-number">
        {summary.status === "complete" ? summary.fiNumber.value : "none"}
      </p>
      <p data-testid="progress">
        {summary.status === "complete" ? summary.progressToFi.value : "none"}
      </p>
      <p data-testid="fi-year">
        {summary.status === "complete" && summary.projection.status === "complete"
          ? (summary.projection.rows[0]?.calendarYear ?? "none")
          : "none"}
      </p>
      <button
        onClick={() => {
          dispatch({ type: "setCurrentAge", personId: "person-1", age: 34 });
          dispatch({ type: "setTargetRetirementAge", personId: "person-1", age: 50 });
        }}
      >
        ages
      </button>
      <button onClick={() => dispatch({ type: "setLivingExpenses", annual: 64000 })}>living</button>
      <button
        onClick={() =>
          dispatch({ type: "setPortfolioValue", portfolioId: "portfolio-1", value: 720000 })
        }
      >
        portfolio
      </button>
    </div>
  );
}

// Tests for the plan context: initial plan, derived summary, and the hooks' error behaviour.
describe("PlanProvider", () => {
  // With no living expenses the engine reports the plan as incomplete.
  it("starts with an incomplete summary for a blank plan", () => {
    render(
      <PlanProvider initialPlan={blankPlan}>
        <PlanProbe />
      </PlanProvider>,
    );

    expect(screen.getByTestId("status")).toHaveTextContent("incomplete");
  });

  // Dispatching changes updates the plan and the summary (the worked example: $1.6m and 45%).
  it("recomputes the summary after dispatched changes", async () => {
    const user = userEvent.setup();
    render(
      <PlanProvider initialPlan={blankPlan}>
        <PlanProbe />
      </PlanProvider>,
    );

    await user.click(screen.getByRole("button", { name: "living" }));
    await user.click(screen.getByRole("button", { name: "portfolio" }));

    expect(screen.getByTestId("living")).toHaveTextContent("64000");
    expect(screen.getByTestId("status")).toHaveTextContent("complete");
    expect(screen.getByTestId("fi-number")).toHaveTextContent("1600000");
    expect(screen.getByTestId("progress")).toHaveTextContent("0.45");
  });

  // The projection appears once the ages are entered, and row 0 uses the start year given.
  it("adds a projection starting at the given start year once ages are entered", async () => {
    const user = userEvent.setup();
    render(
      <PlanProvider initialPlan={blankPlan} startYear={2026}>
        <PlanProbe />
      </PlanProvider>,
    );

    await user.click(screen.getByRole("button", { name: "living" }));
    expect(screen.getByTestId("fi-year")).toHaveTextContent("none");

    await user.click(screen.getByRole("button", { name: "ages" }));
    expect(screen.getByTestId("fi-year")).toHaveTextContent("2026");
  });

  // Without a start year the clock supplies the current calendar year.
  it("defaults the start year to the current calendar year", async () => {
    const user = userEvent.setup();
    render(
      <PlanProvider initialPlan={blankPlan}>
        <PlanProbe />
      </PlanProvider>,
    );

    await user.click(screen.getByRole("button", { name: "living" }));
    await user.click(screen.getByRole("button", { name: "ages" }));

    expect(screen.getByTestId("fi-year")).toHaveTextContent(String(new Date().getFullYear()));
  });

  // Without initialPlan the provider builds a blank plan (one portfolio, nothing entered).
  it("defaults to a new blank plan", () => {
    render(
      <PlanProvider>
        <PlanProbe />
      </PlanProvider>,
    );

    expect(screen.getByTestId("living")).toHaveTextContent("undefined");
    expect(screen.getByTestId("status")).toHaveTextContent("incomplete");
  });

  // Using a hook outside the provider is a programming error and should say so.
  it("throws a clear error when a hook is used outside the provider", () => {
    const consoleError = console.error;
    console.error = () => {}; // React logs the expected error; keep test output clean.

    try {
      expect(() => render(<PlanProbe />)).toThrow("usePlan must be used inside a PlanProvider");
    } finally {
      console.error = consoleError;
    }
  });
});
