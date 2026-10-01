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

/** Renders the screen for a plan with the start year fixed at 2026, in today's dollars unless told otherwise. */
function renderYearByYear(plan: Plan) {
  return render(
    <PlanProvider initialPlan={plan} startYear={2026}>
      <DollarsModeProvider>
        <MemoryRouter initialEntries={["/year-by-year"]}>
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
  it("shows the headers and the rows from today to the retirement age", () => {
    renderYearByYear(exampleA);

    const headers = screen.getAllByRole("columnheader").map((header) => header.textContent);
    expect(headers).toEqual([
      "Year",
      "Age",
      "Contributions",
      "Growth",
      "Portfolio balance",
      "Living expenses",
      "FI number",
      "Progress",
    ]);

    // Age 34 (2026) to age 50 (2042) is 17 rows, plus the header row.
    expect(screen.getAllByRole("row")).toHaveLength(18);
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

    // Row 1: growth $50,400, contribution $30,000, balance $800,400. Row 2's balance is $886,428.
    expect(rowFor(2027).slice(2, 5)).toEqual(["$30,000", "$50,400", "$800,400"]);
    expect(rowFor(2028)[4]).toBe("$886,428");

    // Row 12 (2038, age 46): balance $2,158,231 against an FI number of $2,151,822.
    const fiRow = rowFor(2038);
    expect(fiRow[4]).toBe("$2,158,231");
    expect(fiRow[6]).toBe("$2,151,822");
    expect(fiRow[7]).toBe("100.3%");
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

  it("stops at the retirement age and highlights nothing when FI is never reached", () => {
    renderYearByYear(exampleC);

    // Only today's row: age 60 is also the retirement age.
    expect(screen.getAllByRole("row")).toHaveLength(2);
    expect(document.querySelector("[data-highlighted]")).toBeNull();
  });

  it("notes that withdrawals aren't modelled yet", () => {
    renderYearByYear(exampleA);

    expect(
      screen.getByText(/Withdrawals in retirement aren't modelled yet \(M3\)/),
    ).toBeInTheDocument();
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
