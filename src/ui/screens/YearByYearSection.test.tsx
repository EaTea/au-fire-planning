import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";

import { PlanProvider, usePlanSummary } from "../../plan/PlanProvider";
import type { Plan } from "../../plan/types";
import { DollarsModeProvider, DollarsModeToggle } from "../dollarsMode";
import { blankPlan } from "../sections/sectionTestHelpers";
import { YearByYearSection } from "./YearByYearSection";

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

/**
 * Stands in for Results: the dollars toggle and the section for the plan's
 * complete projection. Every plan in this file has one.
 */
function SectionWithToggle() {
  const summary = usePlanSummary();
  if (summary.status !== "complete" || summary.projection.status !== "complete") {
    throw new Error("The test plan's projection should be complete");
  }

  return (
    <>
      <DollarsModeToggle />
      <YearByYearSection projection={summary.projection} />
    </>
  );
}

/**
 * Renders the section for a plan with the start year fixed at 2026, starting in
 * the default (nominal) dollars. `route` can add a query such as `?year=2029`.
 */
function renderYearByYear(plan: Plan, route = "/results") {
  return render(
    <PlanProvider initialPlan={plan} startYear={2026}>
      <DollarsModeProvider>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path="/results" element={<SectionWithToggle />} />
          </Routes>
        </MemoryRouter>
      </DollarsModeProvider>
    </PlanProvider>,
  );
}

/** The table's column headers, in order. */
function headerTexts(): string[] {
  return screen.getAllByRole("columnheader").map((header) => header.textContent ?? "");
}

/** The text of one cell of the row for `year`, found by its column header rather than its position. */
function cellFor(year: number, header: string): string {
  const columnIndex = headerTexts().indexOf(header);
  if (columnIndex < 0) throw new Error(`No column headed "${header}"`);

  return rowFor(year)[columnIndex] ?? "";
}

/** A row's cells keyed by column header, so a test names the column it checks. */
function rowRecord(year: number): Record<string, string> {
  const headers = headerTexts();

  return Object.fromEntries(rowFor(year).map((text, index) => [headers[index], text]));
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

describe("YearByYearSection", () => {
  it("has a Year by year heading that in-page links can target", () => {
    renderYearByYear(exampleA);

    expect(screen.getByRole("heading", { level: 2, name: "Year by year" })).toHaveAttribute(
      "id",
      "year-by-year",
    );
  });

  it("shows the headers and a row for every year to the plan-until age", () => {
    renderYearByYear(exampleA);

    const headers = screen.getAllByRole("columnheader").map((header) => header.textContent);
    expect(headers).toEqual([
      "Year",
      "Age",
      "Salary",
      "Into portfolio",
      "Into super",
      "Growth & interest",
      "Spending",
      "Cash",
      "Portfolio",
      "Super",
      "Investable",
      "FI number",
      "Status",
    ]);

    // Age 34 (2026) to age 95 (2087) is 62 rows, plus the header row and two band rows.
    expect(screen.getAllByRole("row")).toHaveLength(65);
  });

  it("starts in nominal dollars, matching worked example A", () => {
    renderYearByYear(exampleA);

    expect(screen.getByRole("button", { name: "Nominal" })).toHaveAttribute("aria-pressed", "true");

    // Row 1: growth $50,400, contribution $30,000, portfolio $800,400. Row 2's portfolio is $886,428.
    expect(cellFor(2027, "Into portfolio")).toBe("$30,000");
    expect(cellFor(2027, "Growth & interest")).toBe("$50,400");
    expect(cellFor(2027, "Portfolio")).toBe("$800,400");
    expect(cellFor(2028, "Portfolio")).toBe("$886,428");

    // Row 12 (2038, age 46): investable $2,158,231 against an FI number of $2,151,822.
    expect(cellFor(2038, "Portfolio")).toBe("$2,158,231");
    expect(cellFor(2038, "Investable")).toBe("$2,158,231");
    expect(cellFor(2038, "FI number")).toBe("$2,151,822");
    expect(cellFor(2038, "Status")).toBe("✓");
  });

  it("shows today's dollars after switching: row 1's contribution is $30,000 ÷ 1.025", async () => {
    const user = userEvent.setup();
    renderYearByYear(exampleA);

    await user.click(screen.getByRole("button", { name: "Today's dollars" }));

    expect(cellFor(2027, "Year")).toBe("2027");
    expect(cellFor(2027, "Age")).toBe("35");
    expect(cellFor(2027, "Into portfolio")).toBe("$29,268");
  });

  it("shows the salary until retirement, then a dash, and follows the dollars toggle", async () => {
    const user = userEvent.setup();
    // Example A plus $145,000 at inflation + 1% (tests/worked-examples/m5-super.json).
    const [person] = exampleA.household.people;
    renderYearByYear({
      ...exampleA,
      household: {
        ...exampleA.household,
        people: [
          {
            ...person!,
            salary: { annual: 145000, growth: { kind: "inflationPlus", margin: 0.01 } },
          },
        ],
      },
    });

    expect(cellFor(2027, "Salary")).toBe("$150,075");
    expect(cellFor(2042, "Salary")).toBe("$251,428");
    // 2043 is the first retired year (age 51).
    expect(cellFor(2043, "Salary")).toBe("—");

    // Today's dollars: $150,075 ÷ 1.025.
    await user.click(screen.getByRole("button", { name: "Today's dollars" }));
    expect(cellFor(2027, "Salary")).toBe("$146,415");
  });

  it("shows a dash in the salary column when there is no salary", () => {
    renderYearByYear(exampleA);

    expect(cellFor(2027, "Salary")).toBe("—");
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
      "Retired · spending drawn from the portfolio, then cash",
    ]);

    // The working band comes first (after the header), and the retired band sits before the 2043 row (age 51).
    expect(rows.indexOf(bandRows[0]!)).toBe(1);
    expect(rows[rows.indexOf(bandRows[1]!) + 1]).toHaveTextContent(/^2043/);
    expect(rows[rows.indexOf(bandRows[1]!) - 1]).toHaveTextContent(/^2042/);
  });

  it("shows example B's five years and flags the 2031 shortfall, in nominal dollars", () => {
    renderYearByYear(exampleB);

    expect(rowRecord(2027)).toEqual({
      Year: "2027",
      Age: "61",
      Salary: "—",
      "Into portfolio": "$0",
      "Into super": "$0",
      "Growth & interest": "$10,500",
      Spending: "$30,000",
      Cash: "$10,500",
      Portfolio: "$80,000",
      Super: "$0",
      Investable: "$90,500",
      "FI number": "$750,000",
      Status: "✓",
    });
    expect(cellFor(2028, "Growth & interest")).toBe("$8,525");
    expect(cellFor(2028, "Spending")).toBe("$30,000");
    expect(cellFor(2028, "Cash")).toBe("$11,025");
    expect(cellFor(2028, "Portfolio")).toBe("$58,000");
    expect(cellFor(2029, "Portfolio")).toBe("$33,800");
    expect(cellFor(2030, "Portfolio")).toBe("$7,180");

    // 2031: the portfolio's $7,898 and cash's $12,763 against $30,000 spending (cash drawn last), so $9,339 is unfunded and everything ends at $0.
    expect(rowRecord(2031)).toEqual({
      Year: "2031",
      Age: "65",
      Salary: "—",
      "Into portfolio": "$0",
      "Into super": "$0",
      "Growth & interest": "$1,326",
      Spending: "$30,000",
      Cash: "$0",
      Portfolio: "$0",
      Super: "$0",
      Investable: "$0",
      "FI number": "$750,000",
      Status: "Shortfall −$9,339",
    });
    expect(screen.getByText("Shortfall −$9,339")).toHaveClass("projection-shortfall");
    expect(screen.getAllByText("Shortfall", { exact: false })).toHaveLength(1);
  });

  it("shows a dated expense while still working (example C, 2028)", () => {
    renderYearByYear(exampleCDated);

    // $30,000 × 1.02² = $31,212 spent from the portfolio in a working year; portfolio $230,288.
    expect(cellFor(2028, "Age")).toBe("42");
    expect(cellFor(2028, "Into portfolio")).toBe("$20,000");
    expect(cellFor(2028, "Spending")).toBe("$31,212");
    expect(cellFor(2028, "Cash")).toBe("$0");
    expect(cellFor(2028, "Portfolio")).toBe("$230,288");
    expect(cellFor(2028, "Status")).toBe("✓");
  });

  it("shows example A's super: 2027 salary $150,075, into super $23,808, super $219,815", () => {
    // tests/worked-examples/m5-super.json example A: employer 12% ($18,009) plus $10,000 salary
    // sacrifice, less 15% contributions tax ($4,201.35), is $23,807.65 into super.
    const [person] = exampleA.household.people;
    renderYearByYear({
      ...exampleA,
      cash: { balance: 20000 },
      household: {
        ...exampleA.household,
        people: [
          {
            ...person!,
            salary: { annual: 145000, growth: { kind: "inflationPlus", margin: 0.01 } },
            superAccount: {
              balance: 185000,
              salarySacrifice: { annual: 10000, fromYear: 2027, toYear: 2042 },
            },
          },
        ],
      },
    });

    expect(cellFor(2027, "Salary")).toBe("$150,075");
    expect(cellFor(2027, "Into super")).toBe("$23,808");
    expect(cellFor(2027, "Super")).toBe("$219,815");
    // Investable includes super: $1,041,015.15.
    expect(cellFor(2027, "Investable")).toBe("$1,041,015");
  });

  it("says super is locked in S4's shortfall years, then draws from it at 65", () => {
    // S4: retired at 60 with $500,000 super and nothing else; $20,000 a year, no inflation, no return.
    const [person] = exampleB.household.people;
    renderYearByYear({
      ...blankPlan,
      household: {
        people: [
          {
            ...person!,
            currentAge: 60,
            targetRetirementAge: 60,
            superAccount: { balance: 500000, returnRate: 0 },
          },
        ],
        projectionEndAge: 67,
      },
      expenses: { livingAnnual: 20000 },
      assumptions: { inflationRate: 0 },
      portfolios: [{ id: "portfolio-1", name: "Share portfolio", expectedReturn: 0.07 }],
    });

    for (const year of [2027, 2028, 2029, 2030]) {
      expect(cellFor(year, "Status")).toBe("Shortfall −$20,000 · super locked until 65");
      expect(cellFor(year, "Super")).toBe("$500,000");
    }

    // 2031 (age 65): drawn from super, so funded and no longer locked.
    expect(cellFor(2031, "Status")).toBe("✓");
    expect(cellFor(2031, "Super")).toBe("$480,000");
    expect(screen.getByRole("alert")).toHaveTextContent("4 years can't be funded: 2027 – 2030");
  });

  it("quotes the person's own access age in the locked wording", () => {
    // S4 again, but super is accessible from 62: only age 61 (2027) is locked.
    const [person] = exampleB.household.people;
    renderYearByYear({
      ...blankPlan,
      household: {
        people: [
          {
            ...person!,
            currentAge: 60,
            targetRetirementAge: 60,
            superAccessAge: 62,
            superAccount: { balance: 500000, returnRate: 0 },
          },
        ],
        projectionEndAge: 67,
      },
      expenses: { livingAnnual: 20000 },
      assumptions: { inflationRate: 0 },
      portfolios: [{ id: "portfolio-1", name: "Share portfolio", expectedReturn: 0.07 }],
    });

    expect(cellFor(2027, "Status")).toBe("Shortfall −$20,000 · super locked until 62");
    expect(cellFor(2028, "Status")).toBe("✓");
    expect(cellFor(2028, "Super")).toBe("$480,000");
  });

  it("doesn't say super is locked when there is none", () => {
    renderYearByYear(exampleB);

    expect(screen.queryByText(/super locked/)).not.toBeInTheDocument();
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
    renderYearByYear(exampleA, "/results?year=2038");

    const outlined = screen
      .getAllByRole("row")
      .filter((row) => row.getAttribute("data-outlined") === "true");

    expect(outlined).toHaveLength(1);
    expect(within(outlined[0]!).getAllByRole("cell")[0]).toHaveTextContent("2038");
  });

  it("ignores a ?year= that isn't in the table", () => {
    renderYearByYear(exampleA, "/results?year=1999");

    expect(document.querySelector("[data-outlined]")).toBeNull();
  });
});
