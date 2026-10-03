import { describe, expect, it } from "vitest";

import { bundledRuleSet } from "../rules/bundledRuleSet";
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

  // S4 (tests/worked-examples/m5-super.json): retired at 60 with only locked super.
  describe("with super", () => {
    const lockedSuperInputs: ProjectionInputs = {
      ...runsOutInputs,
      endAge: 67,
      portfolioOpening: 0,
      cashOpening: 0,
      expectedReturn: 0.07,
      interestRate: 0,
      livingAnnual: 20000,
      retirementSpendingAnnual: 20000,
      fiNumberToday: 500000,
      superAccount: {
        opening: 500000,
        returnRate: 0,
        employerRate: 0,
        earningsTaxRate: 0,
        salarySacrifice: { annual: 0 },
        nonConcessional: { annual: 0 },
        ruleSet: bundledRuleSet,
      },
    };

    it("notes the locked super in a shortfall year before 65", () => {
      const result = assessSolvency(projectPortfolio(lockedSuperInputs, 2026));

      expect(result).toMatchObject({
        status: "runsOut",
        year: 2027,
        shortfallYears: [2027, 2028, 2029, 2030],
      });
      if (result.status !== "runsOut") return;

      expect(result.explanation.lines.map((line) => [line.label, line.value])).toEqual([
        ["Spending to fund in 2027", 20000],
        ["Cash and portfolio available", 0],
        ["Shortfall", 20000],
        ["Super (not accessible until 65)", 500000],
      ]);
    });

    it("counts super drawn from 65 as available when the money then runs short", () => {
      // $490,000 at 65 pays $20,000 a year for 24 years, then only $10,000 of the 25th (age 89).
      const result = assessSolvency(
        projectPortfolio(
          {
            ...lockedSuperInputs,
            currentAge: 64,
            retirementAge: 64,
            endAge: 95,
            superAccount: { ...lockedSuperInputs.superAccount!, opening: 490000 },
          },
          2026,
        ),
      );

      expect(result.status).toBe("runsOut");
      if (result.status !== "runsOut") return;

      expect(result.age).toBe(89);
      expect(result.explanation.lines.map((line) => [line.label, line.value])).toEqual([
        ["Spending to fund in 2051", 20000],
        ["Cash and portfolio available", 0],
        ["Super available", 10000],
        ["Shortfall", 10000],
      ]);
    });

    it("adds super to the 'lasts' breakdown so the lines still sum", () => {
      const result = assessSolvency(
        projectPortfolio({ ...lockedSuperInputs, endAge: 61, retirementAge: 70 }, 2026),
      );

      expect(result.status).toBe("lasts");
      expect(result.explanation.lines.map((line) => line.label)).toContain("Super");
    });
  });
});
