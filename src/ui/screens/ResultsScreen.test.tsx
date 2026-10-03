import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";

import { PlanProvider } from "../../plan/PlanProvider";
import type { Plan } from "../../plan/types";
import { DollarsModeProvider } from "../dollarsMode";
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

/** Worked example A from tests/worked-examples/m3-drawdown.json: example A plus $20,000 cash; the money lasts to 95. */
const exampleAWithCash: Plan = { ...exampleA, cash: { balance: 20000 } };

/** Worked example B from the same fixture: age 60 retired, $10,000 cash, runs short in 2031. */
const exampleB: Plan = {
  ...blankPlan,
  household: {
    people: [{ id: "person-1", label: "Person 1", currentAge: 60, targetRetirementAge: 60 }],
    projectionEndAge: 65,
  },
  expenses: { livingAnnual: 30000, retirementSpending: { kind: "amount", annual: 30000 } },
  assumptions: { inflationRate: 0, interestRate: 0.05 },
  cash: { balance: 10000 },
  portfolios: [{ id: "portfolio-1", name: "Share portfolio", value: 100000, expectedReturn: 0.1 }],
};

/** Renders the Results screen for a plan, with a stand-in route that shows where a link went. */
function renderResults(plan: Plan) {
  return render(
    <PlanProvider initialPlan={plan} startYear={2026}>
      <DollarsModeProvider>
        <MemoryRouter initialEntries={["/results"]}>
          <Routes>
            <Route path="/results" element={<ResultsScreen />} />
            <Route path="/income-expenses" element={<p>Income and expenses page</p>} />
            <Route path="/year-by-year" element={<p>Year by year page</p>} />
          </Routes>
        </MemoryRouter>
      </DollarsModeProvider>
    </PlanProvider>,
  );
}

/**
 * The text of every row of the open explanation panels, in order. The chart's
 * visually hidden data table also has rows, so those are left out.
 */
function explanationRows(): (string | null)[] {
  return screen
    .getAllByRole("row")
    .filter((row) => !row.closest(".time-series-chart"))
    .map((row) => row.textContent);
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

    const rows = explanationRows();
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

    const rows = explanationRows();
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

    expect(
      screen.getByText(/Not yet modelled: super \(M5\), the bridge to super \(M6\)/),
    ).toBeInTheDocument();
  });

  it("says what is not modelled yet when complete", () => {
    renderResults(workedPlan);

    expect(
      screen.getByText(/Not yet modelled: super \(M5\), the bridge to super \(M6\)/),
    ).toBeInTheDocument();
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

      const rows = explanationRows();
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
      // The chart's hidden table also has a 2038 cell, so look inside the tile.
      const fiReachedTile = screen.getByText("FI reached").closest<HTMLElement>(".metric")!;
      expect(within(fiReachedTile).getByText("2038")).toBeInTheDocument();
      expect(screen.getByText("Age 46")).toBeInTheDocument();

      await user.click(screen.getAllByRole("button", { name: "How is this calculated?" })[2]!);
      expect(explanationRows()).toEqual([
        "Balance at end of 2038 (age 46)$2,158,231",
        "− FI number in 2038$2,151,822",
        "= FI reached$6,409",
      ]);
    });

    it("says the money lasts to the end age, with the money left and its breakdown (example A)", async () => {
      const user = userEvent.setup();
      renderResults(exampleAWithCash);

      expect(screen.getByText("Money lasts")).toBeInTheDocument();
      expect(screen.getByText("To age 95 ✓")).toBeInTheDocument();
      expect(screen.getByText("$24,101,430 left in 2087 (nominal dollars)")).toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();

      // Tiles in order: FI number, Progress, FI reached, Earliest retirement, Money lasts.
      await user.click(screen.getAllByRole("button", { name: "How is this calculated?" })[4]!);
      expect(explanationRows()).toEqual([
        "Cash at end of 2087 (age 95)$0",
        "+ Portfolio$24,101,430",
        "= Investable net worth$24,101,430",
      ]);
    });

    it("shows the earliest retirement age against the target, with its breakdown (example A)", async () => {
      const user = userEvent.setup();
      renderResults(exampleAWithCash);

      expect(screen.getByText("Earliest retirement")).toBeInTheDocument();
      expect(screen.getByText("Age 43")).toBeInTheDocument();
      expect(screen.getByText("2035 · your target is 50 (2042)")).toBeInTheDocument();

      await user.click(screen.getAllByRole("button", { name: "How is this calculated?" })[3]!);
      const rows = explanationRows();
      expect(rows).toHaveLength(3);
      expect(rows[0]).toMatch(/^Retiring at 42: runs short in 2085 \(age 93\)\$/);
      expect(rows[1]).toMatch(/^Retiring at 43: lasts to age 95\$/);
      expect(rows[2]).toBe("= Earliest feasible retirement age43");
    });

    it("shows the earliest retirement age when it is after the target (example B)", () => {
      renderResults(exampleB);

      expect(screen.getByText("Age 61")).toBeInTheDocument();
      expect(screen.getByText("2027 · your target is 60 (2026)")).toBeInTheDocument();
    });

    it("says when no retirement age is feasible", () => {
      renderResults({
        ...exampleB,
        expenses: {
          ...exampleB.expenses,
          datedExpenses: [
            { id: "big", name: "Huge", annual: 10_000_000, fromYear: 2028, toYear: 2028 },
          ],
        },
      });

      expect(screen.getByText("Not feasible by age 64")).toBeInTheDocument();
      expect(screen.getByText("Even retiring at 64, the money runs short")).toBeInTheDocument();
    });

    it("says when the money runs out, with the shortfall working (example B)", async () => {
      const user = userEvent.setup();
      renderResults(exampleB);

      // FI isn't reached in example B, so its tile has no breakdown: Earliest retirement is the third, Money lasts the fourth.
      expect(screen.getByText("Runs out at age 65")).toBeInTheDocument();
      expect(screen.getByText("2031 · 1 year can't be funded")).toBeInTheDocument();

      await user.click(screen.getAllByRole("button", { name: "How is this calculated?" })[3]!);
      expect(explanationRows()).toEqual([
        "Spending to fund in 2031$30,000",
        "− Cash and portfolio available$23,271",
        "= Shortfall$6,729",
      ]);
    });

    it("counts several unfunded years in the tile", () => {
      renderResults({ ...exampleB, household: { ...exampleB.household, projectionEndAge: 67 } });

      expect(screen.getByText("2031 · 3 years can't be funded")).toBeInTheDocument();
    });

    it("warns with a link to Year by year when the money runs out", async () => {
      const user = userEvent.setup();
      renderResults(exampleB);

      expect(screen.getByRole("alert")).toHaveTextContent(
        "Your money runs out at age 65 (2031). See the years that can't be funded.",
      );

      await user.click(screen.getByRole("link", { name: "See the years that can't be funded." }));
      expect(screen.getByText("Year by year page")).toBeInTheDocument();
    });

    it("says FI isn't reached when no year gets there", () => {
      renderResults(exampleC);

      expect(screen.getByText("Not by age 95")).toBeInTheDocument();
      expect(screen.getByText("With today's inputs")).toBeInTheDocument();
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
  describe("the chart card", () => {
    it("shows the chart's name, a dollars toggle and the figures as a hidden table", () => {
      renderResults(exampleAWithCash);

      expect(
        screen.getByRole("heading", { name: "Investable net worth vs FI number" }),
      ).toBeInTheDocument();
      expect(screen.getByRole("group", { name: "Show values in" })).toBeInTheDocument();
      expect(
        screen.getByRole("img", { name: "Investable net worth against the FI number, by year" }),
      ).toBeInTheDocument();

      // Nominal by default: 2027 is cash $20,800 + portfolio $800,400, against a $1,640,000 FI number.
      expect(
        screen.getByRole("row", { name: /^2027 35 \$821,200 \$1,640,000$/ }),
      ).toBeInTheDocument();
    });

    it("follows the dollars toggle", async () => {
      const user = userEvent.setup();
      renderResults(exampleAWithCash);

      await user.click(screen.getByRole("button", { name: "Today's dollars" }));

      // $821,200 ÷ 1.025 and the unchanged FI number of $1,600,000.
      expect(
        screen.getByRole("row", { name: /^2027 35 \$801,171 \$1,600,000$/ }),
      ).toBeInTheDocument();
    });

    it("is left out when the projection is incomplete", () => {
      renderResults(workedPlan);

      expect(screen.queryByRole("heading", { name: /Investable net worth vs/ })).toBeNull();
      expect(screen.queryByRole("img")).toBeNull();
    });
  });
});
