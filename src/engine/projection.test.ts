import { describe, expect, it } from "vitest";

import type { SalaryGrowth } from "../plan/types";
import {
  findFiReached,
  salaryGrowthRate,
  projectPortfolio,
  type ProjectionInputs,
  type ProjectionRow,
} from "./projection";

/**
 * M2's example B: $100,000 at 10%, $10,000 a year until 41, no inflation. The
 * retirement age is set past the end age and there is no cash, so these rows
 * show only M2's growth rules (no spending is drawn).
 */
const exampleB: ProjectionInputs = {
  currentAge: 40,
  endAge: 100,
  retirementAge: 100,
  expectedReturn: 0.1,
  interestRate: 0.04,
  inflationRate: 0,
  annualContribution: 10000,
  contributionsStopAge: 41,
  portfolioOpening: 100000,
  cashOpening: 0,
  livingAnnual: 20000,
  retirementSpendingAnnual: 20000,
  datedExpenses: [],
  fiNumberToday: 400000,
};

/** The plan's example B (by hand, runs out): $100,000 at 10%, $10,000 cash at 5%, spending $30,000, age 60 to 65. */
const runsOutExample: ProjectionInputs = {
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

// Tests for the year-by-year projection and its timing rules.
describe("projectPortfolio", () => {
  // Row 0 is today: nothing grows or is contributed yet.
  it("starts with row 0 as today, with no growth or contribution", () => {
    const [today] = projectPortfolio(exampleB, 2026);

    expect(today).toMatchObject({
      yearIndex: 0,
      calendarYear: 2026,
      age: 40,
      inflationIndex: 1,
      portfolioGrowth: 0,
      contribution: 0,
      portfolioClosing: 100000,
      livingExpenses: 20000,
      fiNumber: 400000,
    });
  });

  // Growth is on the opening balance; the contribution is added on top.
  it("adds growth and a contribution in row 1", () => {
    const row = projectPortfolio(exampleB, 2026)[1];

    expect(row).toMatchObject({
      calendarYear: 2027,
      age: 41,
      portfolioOpening: 100000,
      portfolioGrowth: 10000,
      contribution: 10000,
      portfolioClosing: 120000,
    });
  });

  // The year you turn the stop age is the last with a contribution (age 42 > 41).
  it("stops contributing after the stop age but keeps growing", () => {
    const row = projectPortfolio(exampleB, 2026)[2];

    expect(row).toMatchObject({
      age: 42,
      portfolioGrowth: 12000,
      contribution: 0,
      portfolioClosing: 132000,
    });
  });

  // Every value in a row shares one index, (1+i)^k.
  it("grows living expenses and the FI number by the same inflation index", () => {
    const rows = projectPortfolio({ ...exampleB, inflationRate: 0.025 }, 2026);
    const row = rows[3];

    expect(row?.inflationIndex).toBeCloseTo(1.025 ** 3, 12);
    expect(row?.livingExpenses).toBeCloseTo(20000 * 1.025 ** 3, 8);
    expect(row?.fiNumber).toBeCloseTo(400000 * 1.025 ** 3, 8);
  });

  // The projection ends at the end age, inclusive.
  it("runs up to and including the end age", () => {
    const rows = projectPortfolio({ ...exampleB, endAge: 95 }, 2026);

    expect(rows).toHaveLength(95 - 40 + 1);
    expect(rows[rows.length - 1]?.age).toBe(95);
  });

  // Someone already at or past the end age still gets today's row.
  it("returns only row 0 when the current age is past the end age", () => {
    expect(projectPortfolio({ ...exampleB, currentAge: 105 }, 2026)).toHaveLength(1);
  });

  // Row 0 is today: no flows, and cash plus portfolio is the investable total.
  it("starts cash and investable from today's balances", () => {
    const [today] = projectPortfolio({ ...exampleB, cashOpening: 5000 }, 2026);

    expect(today).toMatchObject({
      phase: "working",
      cashClosing: 5000,
      cashInterest: 0,
      spending: 0,
      shortfall: 0,
      investableClosing: 105000,
    });
  });
});

// Cash earns interest on its opening balance; interest doesn't touch the portfolio.
describe("projectPortfolio: cash", () => {
  it("earns interest on the opening cash", () => {
    const row = projectPortfolio({ ...exampleB, cashOpening: 20000 }, 2026)[1];

    expect(row).toMatchObject({
      cashOpening: 20000,
      cashInterest: 800,
      cashClosing: 20800,
      portfolioClosing: 120000,
      investableClosing: 140800,
    });
  });
});

// Retired years are those after the retirement age; spending is drawn from
// the portfolio first and cash last, so cash stays as a buffer.
describe("projectPortfolio: retirement spending", () => {
  const rows = projectPortfolio(runsOutExample, 2026);

  // Age 60 is today and the retirement age itself, so the first retired row is age 61.
  it("starts drawing spending in the year after the retirement age, from the portfolio", () => {
    expect(rows[0]?.phase).toBe("working");
    expect(rows[1]).toMatchObject({
      phase: "retired",
      cashInterest: 500,
      portfolioGrowth: 10000,
      spending: 30000,
      fromPortfolio: 30000,
      fromCash: 0,
      shortfall: 0,
      cashClosing: 10500,
      portfolioClosing: 80000,
    });
  });

  // Cash keeps earning interest, untouched, while the portfolio can pay.
  it("leaves cash alone while the portfolio can pay", () => {
    expect(rows[2]).toMatchObject({ fromCash: 0, fromPortfolio: 30000, portfolioClosing: 58000 });
    expect(rows[2]?.cashClosing).toBeCloseTo(11025, 8);
    expect(rows[4]?.portfolioClosing).toBeCloseTo(7180, 8);
    expect(rows[4]?.cashClosing).toBeCloseTo(12155.0625, 8);
  });

  // Spending a few years later keeps growing with inflation, like living expenses.
  it("grows retirement spending by the inflation index", () => {
    const inflated = projectPortfolio({ ...runsOutExample, inflationRate: 0.02 }, 2026);

    expect(inflated[2]?.spending).toBeCloseTo(30000 * 1.02 ** 2, 8);
  });

  // 2031: the portfolio has $7,898, cash $12,762.82, and spending is $30,000.
  it("draws cash once the portfolio is empty, and records the rest as a shortfall", () => {
    expect(rows[5]).toMatchObject({
      calendarYear: 2031,
      age: 65,
      cashClosing: 0,
      portfolioClosing: 0,
    });
    expect(rows[5]?.fromPortfolio).toBeCloseTo(7898, 8);
    expect(rows[5]?.fromCash).toBeCloseTo(12762.815625, 8);
    expect(rows[5]?.shortfall).toBeCloseTo(9339.184375, 8);
  });

  // The portfolio covering spending exactly leaves cash untouched and no shortfall.
  it("handles the portfolio exactly covering spending", () => {
    const [, row] = projectPortfolio(
      { ...runsOutExample, portfolioOpening: 30000 / 1.1, retirementSpendingAnnual: 30000 },
      2026,
    );

    expect(row?.fromPortfolio).toBeCloseTo(30000, 8);
    expect(row?.fromCash).toBeCloseTo(0, 8);
    expect(row?.shortfall).toBeCloseTo(0, 8);
    expect(row?.portfolioClosing).toBeCloseTo(0, 8);
    expect(row?.cashClosing).toBeCloseTo(10500, 8);
  });

  // After the money runs out, each later year is a full shortfall.
  it("keeps flagging shortfall years after the money has run out", () => {
    const longer = projectPortfolio({ ...runsOutExample, endAge: 68 }, 2026);

    expect(longer.filter((row) => row.shortfall > 0).map((row) => row.age)).toEqual([
      65, 66, 67, 68,
    ]);
    expect(longer[6]).toMatchObject({ spending: 30000, shortfall: 30000, investableClosing: 0 });
  });
});

// Dated expenses are drawn from savings in any year they apply, working or retired.
describe("projectPortfolio: dated expenses", () => {
  // Plan example C, with its car in 2028 only and school fees 2029 to 2030.
  const exampleC: ProjectionInputs = {
    currentAge: 40,
    endAge: 50,
    retirementAge: 45,
    expectedReturn: 0.05,
    interestRate: 0.04,
    inflationRate: 0.02,
    annualContribution: 20000,
    contributionsStopAge: 45,
    portfolioOpening: 200000,
    cashOpening: 0,
    livingAnnual: 40000,
    retirementSpendingAnnual: 40000,
    datedExpenses: [
      { annual: 30000, fromYear: 2028, toYear: 2028 },
      { annual: 10000, fromYear: 2029, toYear: 2030 },
    ],
    fiNumberToday: 1000000,
  };
  const rows = projectPortfolio(exampleC, 2026);

  // Before retirement the expense still comes out of savings: nothing else pays it until salary exists.
  it("draws an expense before retirement from savings", () => {
    expect(rows[2]).toMatchObject({
      calendarYear: 2028,
      age: 42,
      phase: "working",
    });
    expect(rows[2]?.spending).toBeCloseTo(31212, 6);
    expect(rows[2]?.fromPortfolio).toBeCloseTo(31212, 6);
    expect(rows[2]?.portfolioClosing).toBeCloseTo(230288, 6);
  });

  // With cash on hand, a working-year expense still comes from the portfolio:
  // cash is the last thing drawn, so it keeps earning interest untouched.
  it("leaves cash alone when paying an expense before retirement", () => {
    const withCash = projectPortfolio({ ...exampleC, cashOpening: 50000 }, 2026);

    expect(withCash[2]?.fromCash).toBe(0);
    expect(withCash[2]?.fromPortfolio).toBeCloseTo(31212, 6);
    expect(withCash[2]?.cashClosing).toBeCloseTo(50000 * 1.04 ** 2, 6);
  });

  // The range is inclusive at both ends.
  it("applies an expense in every year from its From year to its To year", () => {
    expect(rows[1]?.spending).toBe(0);
    expect(rows[3]?.spending).toBeCloseTo(10612.08, 6);
    expect(rows[4]?.spending).toBeCloseTo(10000 * 1.02 ** 4, 6);
    expect(rows[5]?.spending).toBe(0);
  });

  // The first retired row is age 46 (2032); here only retirement spending applies.
  it("starts retirement spending the year after the retirement age", () => {
    expect(rows[6]).toMatchObject({ calendarYear: 2032, age: 46, phase: "retired" });
    expect(rows[6]?.spending).toBeCloseTo(45046.5, 2);
    expect(rows[6]?.portfolioClosing).toBeCloseTo(276853.88, 2);
    expect(rows[10]?.portfolioClosing).toBeCloseTo(132703.89, 2);
  });

  // An expense that spans the retirement year adds to retirement spending from then on.
  it("adds an expense that spans retirement to retirement spending", () => {
    const spanning = projectPortfolio(
      { ...exampleC, datedExpenses: [{ annual: 5000, fromYear: 2030, toYear: 2033 }] },
      2026,
    );

    // 2031 is age 45 (working): only the expense. 2032 is age 46 (retired): both.
    expect(spanning[5]?.spending).toBeCloseTo(5000 * 1.02 ** 5, 6);
    expect(spanning[6]?.spending).toBeCloseTo((40000 + 5000) * 1.02 ** 6, 6);
  });
});

// Tests for salary (IN-7): one index per row, working years only.
describe("salary in the projection", () => {
  /** Age 40, retiring at 42, 2.5% inflation, $100,000 salary today. */
  const withSalary = (growth: SalaryGrowth): ProjectionInputs => ({
    ...exampleB,
    currentAge: 40,
    endAge: 45,
    retirementAge: 42,
    inflationRate: 0.025,
    salary: { annual: 100000, growth },
  });

  it("grows with inflation plus the margin", () => {
    const rows = projectPortfolio(withSalary({ kind: "inflationPlus", margin: 0.01 }), 2026);

    expect(rows[0]?.salary).toBeCloseTo(100000, 6);
    expect(rows[1]?.salary).toBeCloseTo(103500, 6);
    expect(rows[2]?.salary).toBeCloseTo(100000 * 1.035 ** 2, 6);
  });

  it("grows with inflation alone for a margin of 0, and slower for a negative margin", () => {
    const flatMargin = projectPortfolio(withSalary({ kind: "inflationPlus", margin: 0 }), 2026);
    const negativeMargin = projectPortfolio(
      withSalary({ kind: "inflationPlus", margin: -0.01 }),
      2026,
    );

    expect(flatMargin[1]?.salary).toBeCloseTo(102500, 6);
    expect(negativeMargin[1]?.salary).toBeCloseTo(101500, 6);
  });

  it("grows at a fixed rate whatever inflation is", () => {
    const rows = projectPortfolio(withSalary({ kind: "fixed", rate: 0.04 }), 2026);

    expect(rows[2]?.salary).toBeCloseTo(100000 * 1.04 ** 2, 6);
  });

  it("stays flat with no growth", () => {
    const rows = projectPortfolio(withSalary({ kind: "none" }), 2026);

    expect(rows[1]?.salary).toBe(100000);
    expect(rows[2]?.salary).toBe(100000);
  });

  it("pays nothing after the retirement age, including the year after", () => {
    const rows = projectPortfolio(withSalary({ kind: "none" }), 2026);

    // Age 42 is the last working year; age 43 is retired.
    expect(rows[2]?.salary).toBe(100000);
    expect(rows[3]?.salary).toBe(0);
    expect(rows[5]?.salary).toBe(0);
  });

  it("is 0 when there is no salary", () => {
    expect(projectPortfolio(exampleB, 2026).every((candidate) => candidate.salary === 0)).toBe(
      true,
    );
  });

  it("does not change anything else in the rows", () => {
    const withPay = projectPortfolio(withSalary({ kind: "fixed", rate: 0.05 }), 2026);
    const withoutPay = projectPortfolio(
      { ...withSalary({ kind: "none" }), salary: undefined },
      2026,
    );

    for (const [index, payRow] of withPay.entries()) {
      expect({ ...payRow, salary: 0 }).toEqual({ ...withoutPay[index], salary: 0 });
    }
  });

  it("salaryGrowthRate maps each kind to a yearly rate", () => {
    expect(salaryGrowthRate({ kind: "inflationPlus", margin: 0.01 }, 0.025)).toBeCloseTo(0.035);
    expect(salaryGrowthRate({ kind: "fixed", rate: 0.03 }, 0.025)).toBe(0.03);
    expect(salaryGrowthRate({ kind: "none" }, 0.025)).toBe(0);
  });
});

/** A minimal row for exercising `findFiReached`. */
function row(yearIndex: number, investableClosing: number, fiNumber: number): ProjectionRow {
  return {
    yearIndex,
    calendarYear: 2026 + yearIndex,
    age: 40 + yearIndex,
    phase: "working",
    inflationIndex: 1,
    cashOpening: 0,
    cashInterest: 0,
    cashClosing: 0,
    portfolioOpening: 0,
    portfolioGrowth: 0,
    contribution: 0,
    portfolioClosing: investableClosing,
    spending: 0,
    fromCash: 0,
    fromPortfolio: 0,
    shortfall: 0,
    investableClosing,
    livingExpenses: 0,
    fiNumber,
    salary: 0,
  };
}

// Tests for finding the year FI is reached.
describe("findFiReached", () => {
  // Today can already be FI.
  it("can be row 0", () => {
    expect(findFiReached([row(0, 500, 400), row(1, 600, 410)])?.yearIndex).toBe(0);
  });

  // The balance equalling the FI number counts as reaching it.
  it("counts a balance equal to the FI number", () => {
    expect(findFiReached([row(0, 100, 400), row(1, 410, 410)])?.yearIndex).toBe(1);
  });

  // Only the first qualifying row is returned.
  it("returns the first qualifying row", () => {
    expect(findFiReached([row(0, 100, 400), row(1, 450, 410), row(2, 500, 420)])?.yearIndex).toBe(
      1,
    );
  });

  // No row qualifies, so FI isn't reached.
  it("returns undefined when no row reaches the FI number", () => {
    expect(findFiReached([row(0, 100, 400), row(1, 200, 410)])).toBeUndefined();
  });

  // The explanation names the year and age, as the plan specifies.
  it("explains with the balance, the FI number and the result", () => {
    const milestone = findFiReached([row(0, 100, 400), row(1, 450, 410)]);

    expect(milestone).toMatchObject({ calendarYear: 2027, age: 41 });
    expect(milestone?.explanation.lines.map((line) => line.label)).toEqual([
      "Balance at end of 2027 (age 41)",
      "FI number in 2027",
      "FI reached",
    ]);
    expect(milestone?.explanation.lines.map((line) => line.value)).toEqual([450, 410, 40]);
  });
});
