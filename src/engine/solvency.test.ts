import { describe, expect, it } from "vitest";

import { projectPortfolio, type ProjectionInputs } from "./projection";
import { assessSolvency } from "./solvency";

/** The plan's example B (by hand, runs out): ages 60 to 65, $100,000 + $10,000 cash, $30,000 a year. */
const runsOutInputs: ProjectionInputs = {
  currentAge: 60,
  endAge: 65,
  retirementAge: 60,
  expectedReturn: 0.1,
  interestRate: 0.05,
  inflationRate: 0,
  annualContribution: 0,
  contributionsStopAge: 60,
  portfolioOpening: 100000,
  cashOpening: 10000,
  livingAnnual: 30000,
  retirementSpendingAnnual: 30000,
  datedExpenses: [],
  fiNumberToday: 750000,
};

// Tests for the "does the money last?" check.
describe("assessSolvency", () => {
  // No shortfall rows: the answer is the investable net worth at the end age.
  it("says the money lasts, valued at the investable net worth at the end", () => {
    const rows = projectPortfolio({ ...runsOutInputs, portfolioOpening: 1000000 }, 2026);
    const result = assessSolvency(rows);

    expect(result.status).toBe("lasts");
    expect(result.explanation.value).toBe(rows[rows.length - 1]?.investableClosing);
    expect(result.explanation.lines.map((line) => line.label)).toEqual([
      "Cash at end of 2031 (age 65)",
      "Portfolio",
      "Investable net worth",
    ]);
  });

  // The plan's example B: only the last year is short, by $6,728.95.
  it("finds the first shortfall year and explains it", () => {
    const result = assessSolvency(projectPortfolio(runsOutInputs, 2026));

    expect(result).toMatchObject({
      status: "runsOut",
      year: 2031,
      age: 65,
      shortfallYears: [2031],
    });
    expect(result.explanation.value).toBeCloseTo(6728.95, 2);
    expect(result.explanation.lines.map((line) => [line.operator, line.label])).toEqual([
      [undefined, "Spending to fund in 2031"],
      ["−", "Cash and portfolio available"],
      ["=", "Shortfall"],
    ]);
    expect(result.explanation.lines[0]?.value).toBe(30000);
    expect(result.explanation.lines[1]?.value).toBeCloseTo(23271.05, 2);
  });

  // A shortfall is followed by more shortfall years, all listed.
  it("lists every shortfall year when the money stays out", () => {
    const result = assessSolvency(projectPortfolio({ ...runsOutInputs, endAge: 68 }, 2026));

    expect(result).toMatchObject({
      status: "runsOut",
      year: 2031,
      shortfallYears: [2031, 2032, 2033, 2034],
    });
  });

  // A shortfall year in the middle counts even if later rows are funded (e.g. no spending later).
  it("treats an expense-only shortfall while working as running out", () => {
    const rows = projectPortfolio(
      {
        ...runsOutInputs,
        retirementAge: 65,
        portfolioOpening: 1000,
        cashOpening: 0,
        datedExpenses: [{ annual: 50000, fromYear: 2027, toYear: 2027 }],
      },
      2026,
    );

    expect(assessSolvency(rows)).toMatchObject({ status: "runsOut", year: 2027, age: 61 });
  });
});
