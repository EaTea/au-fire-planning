import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";

import { PlanProvider } from "../../plan/PlanProvider";
import type { Plan } from "../../plan/types";
import { DollarsModeProvider } from "../dollarsMode";
import { blankPlan } from "../sections/sectionTestHelpers";
import { YearByYearScreen } from "./YearByYearScreen";

/** Worked example A from tests/worked-examples/m2-growth.json: FI in 2038 at age 46, retiring at 50. */
const exampleA: Plan = {
  ...blankPlan,
  household: {
    people: [{ id: "person-1", label: "Person 1", currentAge: 34, targetRetirementAge: 50 }],
  },
  expenses: { livingAnnual: 64000 },
  portfolios: [
    {
      id: "portfolio-1",
      name: "Share portfolio",
      value: 720000,
      expectedReturn: 0.07,
      annualContribution: 30000,
    },
  ],
};

/**
 * Renders the screen for a plan with the start year fixed at 2026, starting in
 * the default (nominal) dollars. `route` can add a query such as `?year=2029`.
 */
function renderYearByYear(plan: Plan, route = "/year-by-year") {
  return render(
    <PlanProvider initialPlan={plan} startYear={2026}>
      <DollarsModeProvider>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path="/year-by-year" element={<YearByYearScreen />} />
            <Route path="/household" element={<p>Household page</p>} />
            <Route path="/income-expenses" element={<p>Income and expenses page</p>} />
          </Routes>
        </MemoryRouter>
      </DollarsModeProvider>
    </PlanProvider>,
  );
}

// The step is going away (PLAN.md, one-page Results, step B); the table itself is tested in YearByYearSection.test.tsx.
describe("YearByYearScreen", () => {
  it("shows the Year by year section and a dollars toggle for a complete plan", () => {
    renderYearByYear(exampleA);

    expect(screen.getByRole("heading", { level: 1, name: "Year by year" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Show values in" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Year by year projection" })).toBeInTheDocument();
  });

  it("asks for the ages when the projection is incomplete, linking to Household", () => {
    renderYearByYear({ ...blankPlan, expenses: { livingAnnual: 64000 } });

    expect(screen.getByRole("alert")).toHaveTextContent("Current age");
    expect(screen.getByRole("link", { name: "Current age → Household" })).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("asks for living expenses when the plan is empty", () => {
    renderYearByYear(blankPlan);

    expect(
      screen.getByRole("link", { name: "Living expenses → Income & expenses" }),
    ).toBeInTheDocument();
  });
});
