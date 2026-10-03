import { fc, test } from "@fast-check/vitest";
import { describe, expect, it } from "vitest";

import { findEarliestRetirementAge, type EarliestRetirementInputs } from "./earliestRetirement";
import { projectPortfolio } from "./projection";
import { assessSolvency } from "./solvency";

/** Example B (by hand): ages 60 to 65, $100,000 + $10,000 cash, $30,000 a year. Earliest age is 61. */
const exampleBInputs: EarliestRetirementInputs = {
  currentAge: 60,
  endAge: 65,
  retirementAge: 60,
  expectedReturn: 0.1,
  interestRate: 0.05,
  inflationRate: 0,
  annualContribution: 0,
  contributionsStopAge: 60,
  contributionsStopAgeFollowsRetirementAge: true,
  portfolioOpening: 100000,
  cashOpening: 10000,
  livingAnnual: 30000,
  retirementSpendingAnnual: 30000,
  datedExpenses: [],
  fiNumberToday: 750000,
};

/** Whether the plan's money lasts when retiring at the given age, using the same engine pieces the search uses. */
function lastsWhenRetiringAt(inputs: EarliestRetirementInputs, age: number): boolean {
  const rows = projectPortfolio(
    {
      ...inputs,
      retirementAge: age,
      contributionsStopAge: inputs.contributionsStopAgeFollowsRetirementAge
        ? age
        : inputs.contributionsStopAge,
    },
    2026,
  );

  return assessSolvency(rows).status === "lasts";
}

// Tests for the earliest-feasible-retirement-age search (FIRE-3).
describe("findEarliestRetirementAge", () => {
  // Example B: retiring at 60 runs short, retiring at 61 lasts to the end age.
  it("finds age 61 for example B, explained by the last failure and the first success", () => {
    const result = findEarliestRetirementAge(exampleBInputs, 2026);

    expect(result.status).toBe("feasible");
    if (result.status !== "feasible") return;

    expect(result.age).toBe(61);
    expect(result.year).toBe(2027);
    expect(result.explanation.value).toBe(61);
    expect(result.explanation.unit).toBe("years");

    const [failure, success, answer] = result.explanation.lines;
    expect(failure?.label).toMatch(/^Retiring at 60: runs short in \d{4} \(age \d+\)$/);
    expect(failure?.value).toBeGreaterThan(0);
    expect(success?.label).toBe("Retiring at 61: lasts to age 65");
    expect(answer).toMatchObject({
      label: "Earliest feasible retirement age",
      value: 61,
      unit: "years",
      operator: "=",
    });
  });

  // A plan that is solvent today has nothing to fail first, so the explanation has no failure line.
  it("retires now when the plan is already solvent", () => {
    const result = findEarliestRetirementAge(
      { ...exampleBInputs, portfolioOpening: 5000000 },
      2026,
    );

    expect(result.status).toBe("feasible");
    if (result.status !== "feasible") return;

    expect(result.age).toBe(60);
    expect(result.year).toBe(2026);
    expect(result.explanation.lines).toHaveLength(2);
    expect(result.explanation.lines[0]?.label).toBe("Retiring at 60: lasts to age 65");
  });

  // A dated expense far beyond everything you'll ever have fails at every age, even retiring at end age − 1.
  it("reports not feasible when no age works", () => {
    const result = findEarliestRetirementAge(
      {
        ...exampleBInputs,
        datedExpenses: [{ annual: 10000000, fromYear: 2028, toYear: 2028 }],
      },
      2026,
    );

    expect(result.status).toBe("notFeasible");
    expect(result.explanation.lines).toHaveLength(1);
    expect(result.explanation.lines[0]?.label).toMatch(/^Retiring at 64: runs short in 2028/);
  });

  // With an entered stop age, trying a later retirement doesn't add contributions after that age.
  it("keeps a stop age the user entered, instead of following the tried age", () => {
    const base: EarliestRetirementInputs = {
      ...exampleBInputs,
      annualContribution: 20000,
      portfolioOpening: 60000,
      cashOpening: 0,
      endAge: 70,
    };

    const following = findEarliestRetirementAge(
      { ...base, contributionsStopAgeFollowsRetirementAge: true },
      2026,
    );
    const fixed = findEarliestRetirementAge(
      { ...base, contributionsStopAge: 60, contributionsStopAgeFollowsRetirementAge: false },
      2026,
    );

    expect(following.status).toBe("feasible");
    expect(fixed.status).toBe("feasible");
    if (following.status !== "feasible" || fixed.status !== "feasible") return;

    // Following the retirement age adds contributions while retiring later, so it can't be later than the fixed case.
    expect(following.age).toBeLessThanOrEqual(fixed.age);
    expect(following.age).toBeLessThan(fixed.age);
  });

  // The defining property: solvent at the answer, and not solvent one year earlier (unless that is before today).
  test.prop([
    fc.integer({ min: 0, max: 3_000_000 }),
    fc.integer({ min: 0, max: 100_000 }),
    fc.integer({ min: 10_000, max: 120_000 }),
    fc.integer({ min: 0, max: 10 }).map((percent) => percent / 100),
    fc.boolean(),
  ])(
    "is solvent at the returned age and not at the age before",
    (portfolio, contribution, spending, expectedReturn, followsRetirementAge) => {
      const inputs: EarliestRetirementInputs = {
        ...exampleBInputs,
        currentAge: 35,
        endAge: 90,
        portfolioOpening: portfolio,
        annualContribution: contribution,
        retirementSpendingAnnual: spending,
        expectedReturn,
        inflationRate: 0.025,
        contributionsStopAge: 50,
        contributionsStopAgeFollowsRetirementAge: followsRetirementAge,
      };

      const result = findEarliestRetirementAge(inputs, 2026);

      if (result.status === "notFeasible") {
        expect(lastsWhenRetiringAt(inputs, inputs.endAge - 1)).toBe(false);
        return;
      }

      expect(lastsWhenRetiringAt(inputs, result.age)).toBe(true);
      if (result.age > inputs.currentAge) {
        expect(lastsWhenRetiringAt(inputs, result.age - 1)).toBe(false);
      }
    },
  );
});
