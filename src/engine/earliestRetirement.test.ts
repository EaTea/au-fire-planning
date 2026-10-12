import { fc, test } from "@fast-check/vitest";
import { describe, expect, it } from "vitest";

import { findEarliestRetirementAge } from "./earliestRetirement";
import { projectPortfolio } from "./projection";
import { assessSolvency } from "./solvency";
import { onePersonInputs, type OnePersonSettings } from "./testing/onePersonInputs";

/** Example B (by hand): ages 60 to 65, $100,000 + $10,000 cash, $30,000 a year. Earliest age is 61. */
const exampleBSettings: OnePersonSettings = {
  currentAge: 60,
  endAge: 65,
  retirementAge: 60,
  expectedReturn: 0.1,
  interestRate: 0.05,
  inflationRate: 0,
  annualContribution: 0,
  // No stop age: contributions stop when the tried retirement age is reached.
  portfolioOpening: 100000,
  cashOpening: 10000,
  livingAnnual: 30000,
  retirementSpendingAnnual: 30000,
  datedExpenses: [],
  fiNumberToday: 750000,
};
const exampleBInputs = onePersonInputs(exampleBSettings);

/** Whether the plan's money lasts when retiring at the given age, using the same engine pieces the search uses. */
function lastsWhenRetiringAt(settings: OnePersonSettings, age: number): boolean {
  const rows = projectPortfolio(onePersonInputs({ ...settings, retirementAge: age }), 2026);

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

  // A position outside the household is a programming error, not bad user data.
  it("throws for a person that isn't in the household", () => {
    expect(() => findEarliestRetirementAge(exampleBInputs, 2026, 1)).toThrow(RangeError);
  });

  // A plan that is solvent today has nothing to fail first, so the explanation has no failure line.
  it("retires now when the plan is already solvent", () => {
    const result = findEarliestRetirementAge(
      onePersonInputs({ ...exampleBSettings, portfolioOpening: 5000000 }),
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
      onePersonInputs({
        ...exampleBSettings,
        datedExpenses: [{ annual: 10000000, fromYear: 2028, toYear: 2028 }],
      }),
      2026,
    );

    expect(result.status).toBe("notFeasible");
    expect(result.explanation.lines).toHaveLength(1);
    expect(result.explanation.lines[0]?.label).toMatch(/^Retiring at 64: runs short in 2028/);
  });

  // With an entered stop age, trying a later retirement doesn't add contributions after that age.
  it("keeps a stop age the user entered, instead of following the tried age", () => {
    const base: OnePersonSettings = {
      ...exampleBSettings,
      annualContribution: 20000,
      portfolioOpening: 60000,
      cashOpening: 0,
      endAge: 70,
    };

    const following = findEarliestRetirementAge(onePersonInputs(base), 2026);
    const fixed = findEarliestRetirementAge(
      onePersonInputs({ ...base, contributionsStopAge: 60 }),
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
      const settings: OnePersonSettings = {
        ...exampleBSettings,
        currentAge: 35,
        endAge: 90,
        portfolioOpening: portfolio,
        annualContribution: contribution,
        retirementSpendingAnnual: spending,
        expectedReturn,
        inflationRate: 0.025,
        // Left out, the stop follows the tried retirement age; otherwise it stays at 50.
        ...(followsRetirementAge ? {} : { contributionsStopAge: 50 }),
      };

      const result = findEarliestRetirementAge(onePersonInputs(settings), 2026);

      if (result.status === "notFeasible") {
        expect(lastsWhenRetiringAt(settings, settings.endAge - 1)).toBe(false);
        return;
      }

      expect(lastsWhenRetiringAt(settings, result.age)).toBe(true);
      if (result.age > settings.currentAge) {
        expect(lastsWhenRetiringAt(settings, result.age - 1)).toBe(false);
      }
    },
  );
});
