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

/** Worked example A from tests/worked-examples/m2-growth.json: FI in 2038 at age 46. */
const exampleA: Plan = {
  ...workedPlan,
  household: {
    people: [{ id: "person-1", label: "Person 1", currentAge: 34, targetRetirementAge: 50 }],
  },
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

/** Worked example C: no money, no contributions, so FI is never reached. */
const exampleC: Plan = {
  ...blankPlan,
  household: {
    people: [{ id: "person-1", label: "Person 1", currentAge: 60, targetRetirementAge: 60 }],
  },
  expenses: { livingAnnual: 50000 },
  assumptions: { inflationRate: 0.02 },
  portfolios: [{ id: "portfolio-1", name: "Share portfolio", expectedReturn: 0 }],
};

/** Renders the Results screen for a plan, with a stand-in route that shows where a link went. */
function renderResults(plan: Plan) {
  return render(
    <PlanProvider initialPlan={plan} startYear={2026}>
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

    expect(screen.getByText(/Not yet modelled: withdrawals in retirement/)).toBeInTheDocument();
  });

  it("says what is not modelled yet when complete", () => {
    renderResults(workedPlan);

    expect(screen.getByText(/Not yet modelled: withdrawals in retirement/)).toBeInTheDocument();
  });

  describe("with the projection", () => {
    it("shows the nominal FI number at retirement as a second sub-line, in nominal dollars", () => {
      renderResults(exampleA);

      expect(screen.getByText("$64,000/yr ÷ 4%")).toBeInTheDocument();
      expect(screen.getByText("$2,375,209 at age 50 (2042)")).toBeInTheDocument();
    });

    it("adds the inflation lines to the FI number breakdown", async () => {
      const user = userEvent.setup();
      renderResults(exampleA);

      await user.click(screen.getAllByRole("button", { name: "How is this calculated?" })[0]!);

      const rows = screen.getAllByRole("row").map((row) => row.textContent);
      expect(rows).toEqual([
        "Retirement spending per year$64,000",
        "÷ Safe withdrawal rate (default)4%",
        "= FI number$1,600,000",
        "× Inflation growth over 16 years1.4845",
        "= FI number at retirement$2,375,209",
      ]);
    });

    it("shows the year and age FI is reached, with its breakdown", async () => {
      const user = userEvent.setup();
      renderResults(exampleA);

      expect(screen.getByText("FI reached")).toBeInTheDocument();
      expect(screen.getByText("2038")).toBeInTheDocument();
      expect(screen.getByText("Age 46")).toBeInTheDocument();

      await user.click(screen.getAllByRole("button", { name: "How is this calculated?" })[2]!);
      expect(screen.getAllByRole("row").map((row) => row.textContent)).toEqual([
        "Balance at end of 2038 (age 46)$2,158,231",
        "− FI number in 2038$2,151,822",
        "= FI reached$6,409",
      ]);
    });

    it("says FI isn't reached when no year gets there", () => {
      renderResults(exampleC);

      expect(screen.getByText("Not by age 95")).toBeInTheDocument();
      expect(screen.getByText("With today's inputs and no withdrawals")).toBeInTheDocument();
    });

    it("keeps the M1 tiles and asks for the missing ages when the projection is incomplete", () => {
      renderResults(workedPlan);

      expect(screen.getByText("$1,600,000")).toBeInTheDocument();
      expect(screen.getByText("45%")).toBeInTheDocument();
      expect(screen.queryByText("FI reached")).not.toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Current age → Household" })).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "Target retirement age → Household" }),
      ).toBeInTheDocument();
    });

    it("links the plan-until age validation messages to the Household step", () => {
      renderResults({
        ...exampleA,
        household: { ...exampleA.household, projectionEndAge: 50 },
      });

      expect(
        screen.getByRole("link", {
          name: "Target retirement age must be before your plan-until age → Household",
        }),
      ).toBeInTheDocument();

      renderResults({
        ...exampleA,
        household: {
          people: [{ id: "person-1", label: "Person 1", currentAge: 60, targetRetirementAge: 60 }],
          projectionEndAge: 55,
        },
      });

      expect(
        screen.getByRole("link", {
          name: "Plan until age must be after your current age → Household",
        }),
      ).toBeInTheDocument();
    });
  });
});
