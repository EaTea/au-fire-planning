import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

/** Worked example C: never reaches FI, retires at 60. */
const exampleC: Plan = {
  ...blankPlan,
  household: {
    people: [{ id: "person-1", label: "Person 1", currentAge: 60, targetRetirementAge: 60 }],
  },
  expenses: { livingAnnual: 50000 },
  assumptions: { inflationRate: 0.02 },
  portfolios: [{ id: "portfolio-1", name: "Share portfolio", expectedReturn: 0 }],
};

/** Worked example B from tests/worked-examples/m3-drawdown.json: age 60 retired, runs short in 2031. */
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

/** Worked example C: a car and school fees while still working, 40 to 50 with retirement at 45. */
const exampleCDated: Plan = {
  ...blankPlan,
  household: {
    people: [{ id: "person-1", label: "Person 1", currentAge: 40, targetRetirementAge: 45 }],
    projectionEndAge: 50,
  },
  expenses: {
    livingAnnual: 40000,
    datedExpenses: [
      { id: "car", name: "Replace car", annual: 30000, fromYear: 2028, toYear: 2028 },
      { id: "fees", name: "School fees", annual: 10000, fromYear: 2029, toYear: 2030 },
    ],
  },
  assumptions: { inflationRate: 0.02 },
  portfolios: [
    {
      id: "portfolio-1",
      name: "Share portfolio",
      value: 200000,
      expectedReturn: 0.05,
      annualContribution: 20000,
    },
  ],
};

/** Renders the screen for a plan with the start year fixed at 2026, in today's dollars unless told otherwise. */
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

/** The cell texts of the table row whose first cell is `year`. */
function rowFor(year: number): string[] {
  const row = screen
    .getAllByRole("row")
    .find(
      (candidate) => within(candidate).queryAllByRole("cell")[0]?.textContent === String(year),
    )!;

  return within(row)
    .getAllByRole("cell")
    .map((cell) => cell.textContent ?? "");
}

describe("YearByYearScreen", () => {
  it("shows the headers and a row for every year to the plan-until age", () => {
    renderYearByYear(exampleA);

    const headers = screen.getAllByRole("columnheader").map((header) => header.textContent);
    expect(headers).toEqual([
      "Year",
      "Age",
      "Contributions",
      "Growth & interest",
      "Spending",
      "Cash",
      "Portfolio",
      "Investable",
      "FI number",
      "Status",
    ]);

    // Age 34 (2026) to age 95 (2087) is 62 rows, plus the header row and two band rows.
    expect(screen.getAllByRole("row")).toHaveLength(65);
  });

  it("starts in today's dollars: row 1's contribution is $30,000 ÷ 1.025", () => {
    renderYearByYear(exampleA);

    const row = rowFor(2027);
    expect(row[0]).toBe("2027");
    expect(row[1]).toBe("35");
    expect(row[2]).toBe("$29,268");
  });

  it("shows nominal dollars after switching, matching worked example A", async () => {
    const user = userEvent.setup();
    renderYearByYear(exampleA);

    await user.click(screen.getByRole("button", { name: "Nominal" }));

    // Row 1: growth $50,400, contribution $30,000, portfolio $800,400. Row 2's portfolio is $886,428.
    expect(rowFor(2027).slice(2, 4)).toEqual(["$30,000", "$50,400"]);
    expect(rowFor(2027)[6]).toBe("$800,400");
    expect(rowFor(2028)[6]).toBe("$886,428");

    // Row 12 (2038, age 46): investable $2,158,231 against an FI number of $2,151,822.
    const fiRow = rowFor(2038);
    expect(fiRow[6]).toBe("$2,158,231");
    expect(fiRow[7]).toBe("$2,158,231");
    expect(fiRow[8]).toBe("$2,151,822");
    expect(fiRow[9]).toBe("✓");
  });

  it("highlights only the FI row", () => {
    renderYearByYear(exampleA);

    const highlighted = screen
      .getAllByRole("row")
      .filter((row) => row.getAttribute("data-highlighted") === "true");

    expect(highlighted).toHaveLength(1);
    expect(within(highlighted[0]!).getAllByRole("cell")[0]).toHaveTextContent("2038");
    expect(within(highlighted[0]!).getAllByRole("cell")[1]).toHaveTextContent("46");
  });

  it("shows every row to the end age and highlights nothing when FI is never reached", () => {
    renderYearByYear(exampleC);

    // Age 60 (2026) to age 95 (2061) is 36 rows, plus the header row and two band rows.
    expect(screen.getAllByRole("row")).toHaveLength(39);
    expect(document.querySelector("[data-highlighted]")).toBeNull();
  });

  it("starts each phase with a band row, in order", () => {
    renderYearByYear(exampleA);

    const rows = screen.getAllByRole("row");
    const bandRows = rows.filter((row) => row.classList.contains("projection-band"));

    expect(bandRows.map((row) => row.textContent)).toEqual([
      "Working · contributing",
      "Retired · spending drawn from cash, then the portfolio",
    ]);

    // The working band comes first (after the header), and the retired band sits before the 2043 row (age 51).
    expect(rows.indexOf(bandRows[0]!)).toBe(1);
    expect(rows[rows.indexOf(bandRows[1]!) + 1]).toHaveTextContent(/^2043/);
    expect(rows[rows.indexOf(bandRows[1]!) - 1]).toHaveTextContent(/^2042/);
  });

  it("shows example B's five years and flags the 2031 shortfall, in nominal dollars", async () => {
    const user = userEvent.setup();
    renderYearByYear(exampleB);
    await user.click(screen.getByRole("button", { name: "Nominal" }));

    // [year, age, contributions, growth & interest, spending, cash, portfolio, investable, FI number, status]
    expect(rowFor(2027)).toEqual([
      "2027",
      "61",
      "$0",
      "$10,500",
      "$30,000",
      "$0",
      "$90,500",
      "$90,500",
      "$750,000",
      "✓",
    ]);
    expect(rowFor(2028).slice(3, 7)).toEqual(["$9,050", "$30,000", "$0", "$69,550"]);
    expect(rowFor(2029)[6]).toBe("$46,505");
    expect(rowFor(2030)[6]).toBe("$21,156");

    // 2031: $23,271 available against $30,000 spending, so $6,729 is unfunded and everything ends at $0.
    expect(rowFor(2031)).toEqual([
      "2031",
      "65",
      "$0",
      "$2,116",
      "$30,000",
      "$0",
      "$0",
      "$0",
      "$750,000",
      "Shortfall −$6,729",
    ]);
    expect(screen.getByText("Shortfall −$6,729")).toHaveClass("projection-shortfall");
    expect(screen.getAllByText("Shortfall", { exact: false })).toHaveLength(1);
  });

  it("shows a dated expense while still working (example C, 2028)", async () => {
    const user = userEvent.setup();
    renderYearByYear(exampleCDated);
    await user.click(screen.getByRole("button", { name: "Nominal" }));

    // $30,000 × 1.02² = $31,212 spent from the portfolio in a working year; portfolio $230,288.
    const row = rowFor(2028);
    expect(row[1]).toBe("42");
    expect(row[2]).toBe("$20,000");
    expect(row[4]).toBe("$31,212");
    expect(row[5]).toBe("$0");
    expect(row[6]).toBe("$230,288");
    expect(row[9]).toBe("✓");
  });

  it("shows a banner with the unfunded years as a single year", () => {
    renderYearByYear(exampleB);

    expect(screen.getByRole("alert")).toHaveTextContent("1 year can't be funded: 2031");
  });

  it("shows a banner with a range when several years can't be funded", () => {
    renderYearByYear({
      ...exampleB,
      household: { ...exampleB.household, projectionEndAge: 67 },
    });

    expect(screen.getByRole("alert")).toHaveTextContent("3 years can't be funded: 2031 – 2033");
  });

  it("shows no shortfall banner when the money lasts", () => {
    renderYearByYear(exampleA);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText(/can't be funded/)).not.toBeInTheDocument();
  });

  it("scrolls to and outlines the row named by ?year=", () => {
    renderYearByYear(exampleA, "/year-by-year?year=2038");

    const outlined = screen
      .getAllByRole("row")
      .filter((row) => row.getAttribute("data-outlined") === "true");

    expect(outlined).toHaveLength(1);
    expect(within(outlined[0]!).getAllByRole("cell")[0]).toHaveTextContent("2038");
  });

  it("ignores a ?year= that isn't in the table", () => {
    renderYearByYear(exampleA, "/year-by-year?year=1999");

    expect(document.querySelector("[data-outlined]")).toBeNull();
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
