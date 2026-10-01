import { describe, expect, it } from "vitest";

import {
  MAX_PROJECTION_AGE,
  findFiReached,
  projectPortfolio,
  type ProjectionInputs,
  type ProjectionRow,
} from "./projection";

/** Example B from the plan: $100,000 at 10%, $10,000 a year until 41, no inflation. */
const exampleB: ProjectionInputs = {
  currentAge: 40,
  expectedReturn: 0.1,
  inflationRate: 0,
  annualContribution: 10000,
  contributionsStopAge: 41,
  openingBalance: 100000,
  livingAnnual: 20000,
  fiNumberToday: 400000,
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
      growth: 0,
      contribution: 0,
      closingBalance: 100000,
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
      openingBalance: 100000,
      growth: 10000,
      contribution: 10000,
      closingBalance: 120000,
    });
  });

  // The year you turn the stop age is the last with a contribution (age 42 > 41).
  it("stops contributing after the stop age but keeps growing", () => {
    const row = projectPortfolio(exampleB, 2026)[2];

    expect(row).toMatchObject({ age: 42, growth: 12000, contribution: 0, closingBalance: 132000 });
  });

  // Every value in a row shares one index, (1+i)^k.
  it("grows living expenses and the FI number by the same inflation index", () => {
    const rows = projectPortfolio({ ...exampleB, inflationRate: 0.025 }, 2026);
    const row = rows[3];

    expect(row?.inflationIndex).toBeCloseTo(1.025 ** 3, 12);
    expect(row?.livingExpenses).toBeCloseTo(20000 * 1.025 ** 3, 8);
    expect(row?.fiNumber).toBeCloseTo(400000 * 1.025 ** 3, 8);
  });

  // The projection ends at the maximum age, inclusive.
  it("runs up to and including the maximum age", () => {
    const rows = projectPortfolio(exampleB, 2026);

    expect(rows).toHaveLength(MAX_PROJECTION_AGE - 40 + 1);
    expect(rows[rows.length - 1]?.age).toBe(MAX_PROJECTION_AGE);
  });

  // Someone already past the maximum age still gets today's row.
  it("returns only row 0 when the current age is past the maximum", () => {
    expect(projectPortfolio({ ...exampleB, currentAge: 105 }, 2026)).toHaveLength(1);
  });
});

/** A minimal row for exercising `findFiReached`. */
function row(yearIndex: number, closingBalance: number, fiNumber: number): ProjectionRow {
  return {
    yearIndex,
    calendarYear: 2026 + yearIndex,
    age: 40 + yearIndex,
    inflationIndex: 1,
    openingBalance: 0,
    growth: 0,
    contribution: 0,
    closingBalance,
    livingExpenses: 0,
    fiNumber,
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
