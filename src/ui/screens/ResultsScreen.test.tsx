import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";

import { PlanProvider } from "../../plan/PlanProvider";
import type { Plan } from "../../plan/types";
import { blankPlan } from "../sections/sectionTestHelpers";
import { ResultsScreen } from "./ResultsScreen";

/** The worked example from PLAN.md: $64,000 spending, 100% default, $720,000 invested, 4% default. */
const workedPlan: Plan = {
  ...blankPlan,
  expenses: { livingAnnual: 64000 },
  portfolios: [{ id: "portfolio-1", name: "Share portfolio", value: 720000 }],
};

/** Renders the Results screen for a plan, with a stand-in route that shows where a link went. */
function renderResults(plan: Plan) {
  return render(
    <PlanProvider initialPlan={plan}>
      <MemoryRouter initialEntries={["/results"]}>
        <Routes>
          <Route path="/results" element={<ResultsScreen />} />
          <Route path="/income-expenses" element={<p>Income and expenses page</p>} />
        </Routes>
      </MemoryRouter>
    </PlanProvider>,
  );
}

describe("ResultsScreen", () => {
  it("shows the worked FI number and progress when the plan is complete", () => {
    renderResults(workedPlan);

    expect(screen.getByText("$1,600,000")).toBeInTheDocument();
    expect(screen.getByText("$64,000/yr ÷ 4%")).toBeInTheDocument();
    expect(screen.getByText("45%")).toBeInTheDocument();
    expect(screen.getByText("$720,000 invested of $1,600,000")).toBeInTheDocument();
  });

  it("opens the FI number breakdown with its lines", async () => {
    const user = userEvent.setup();
    renderResults(workedPlan);

    await user.click(screen.getAllByRole("button", { name: "How is this calculated?" })[0]!);

    const rows = screen.getAllByRole("row").map((row) => row.textContent);
    expect(rows).toEqual([
      "Retirement spending per year$64,000",
      "÷ Safe withdrawal rate (default)4%",
      "= FI number$1,600,000",
    ]);
  });

  it("shows the progress breakdown lines", async () => {
    const user = userEvent.setup();
    renderResults(workedPlan);

    await user.click(screen.getAllByRole("button", { name: "How is this calculated?" })[1]!);

    const rows = screen.getAllByRole("row").map((row) => row.textContent);
    expect(rows).toEqual([
      "Investable amount$720,000",
      "÷ FI number$1,600,000",
      "= Progress to FI45%",
    ]);
  });

  it("asks for living expenses, with a link to Income & expenses, when incomplete", async () => {
    const user = userEvent.setup();
    renderResults(blankPlan);

    expect(screen.queryByText("$1,600,000")).not.toBeInTheDocument();
    expect(screen.queryByText("FI number")).not.toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Living expenses → Income & expenses" }));

    expect(screen.getByText("Income and expenses page")).toBeInTheDocument();
  });

  it("links a retirement spending problem to Income & expenses", async () => {
    const user = userEvent.setup();
    renderResults({
      ...workedPlan,
      expenses: { livingAnnual: 64000, retirementSpending: { kind: "amount", annual: 0 } },
    });

    await user.click(
      screen.getByRole("link", { name: /Retirement spending must be more than \$0 → Income/ }),
    );

    expect(screen.getByText("Income and expenses page")).toBeInTheDocument();
  });

  it("says what is not modelled yet when incomplete", () => {
    renderResults(blankPlan);

    expect(screen.getByText(/Not yet modelled: growth over time/)).toBeInTheDocument();
  });

  it("says what is not modelled yet when complete", () => {
    renderResults(workedPlan);

    expect(screen.getByText(/Not yet modelled: growth over time/)).toBeInTheDocument();
  });
});
