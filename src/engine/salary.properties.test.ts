import { fc, test } from "@fast-check/vitest";
import { expect } from "vitest";

import { projectPortfolio, type ProjectionInputs } from "./projection";

// Property-based tests for salary (IN-7): rules that hold for any salary.

/** Projection settings with a salary that doesn't grow, and generated ages and amount. */
const flatSalaryInputs = fc
  .record({
    currentAge: fc.integer({ min: 20, max: 60 }),
    yearsToRetirement: fc.integer({ min: 0, max: 30 }),
    annualSalary: fc.integer({ min: 0, max: 500_000 }),
    inflationRate: fc.integer({ min: 0, max: 80 }).map((tenthsOfPercent) => tenthsOfPercent / 1000),
  })
  .map(({ currentAge, yearsToRetirement, annualSalary, inflationRate }): ProjectionInputs => ({
    currentAge,
    endAge: currentAge + yearsToRetirement + 10,
    retirementAge: currentAge + yearsToRetirement,
    expectedReturn: 0.07,
    interestRate: 0.04,
    inflationRate,
    annualContribution: 0,
    contributionsStopAge: currentAge + yearsToRetirement,
    portfolioOpening: 100_000,
    cashOpening: 0,
    livingAnnual: 40_000,
    retirementSpendingAnnual: 40_000,
    datedExpenses: [],
    fiNumberToday: 1_000_000,
    salary: { annual: annualSalary, growth: { kind: "none" } },
  }));

// "No growth" means exactly flat while working, whatever inflation is, and nothing after.
test.prop([flatSalaryInputs])("a salary with no growth is flat while working, then 0", (inputs) => {
  const annualSalary = inputs.salary?.annual ?? 0;

  for (const row of projectPortfolio(inputs, 2026)) {
    expect(row.salary).toBe(row.age <= inputs.retirementAge ? annualSalary : 0);
  }
});
