import { describe, expect, it } from "vitest";

import { bundledRuleSet } from "../rules/bundledRuleSet";
import { assessBridge } from "./bridge";
import { calculateCoastSplit } from "./coastSplit";
import { projectPortfolio, type ProjectionInputs } from "./projection";

// Unit tests for Coast FIRE for super and outside super (M6 step 4), beyond the
// worked examples in tests/worked-examples/m6-bridge.json.

/** B1: aged 55, retire at 56, plan until 66, $100,000 outside and in super, $20,000 a year, 0% everything. */
function splitInputs(overrides: Partial<ProjectionInputs> = {}): ProjectionInputs {
  return {
    currentAge: 55,
    endAge: 66,
    retirementAge: 56,
    expectedReturn: 0,
    interestRate: 0,
    inflationRate: 0,
    annualContribution: 0,
    contributionsStopAge: 56,
    portfolioOpening: 100_000,
    cashOpening: 0,
    livingAnnual: 20_000,
    retirementSpendingAnnual: 20_000,
    datedExpenses: [],
    fiNumberToday: 500_000,
    superAccount: {
      opening: 100_000,
      returnRate: 0,
      employerRate: 0,
      earningsTaxRate: 0,
      salarySacrifice: { annual: 0 },
      nonConcessional: { annual: 0 },
      accessAge: 60,
      ruleSet: bundledRuleSet,
    },
    ...overrides,
  };
}

/** Projects, assesses the bridge and splits Coast FIRE. */
function split(inputs: ProjectionInputs) {
  const rows = projectPortfolio(inputs, 2026);

  return calculateCoastSplit(rows, inputs, assessBridge(rows, inputs));
}

describe("calculateCoastSplit", () => {
  it("has nothing for outside super to coast to when there is no bridge", () => {
    expect(split(splitInputs({ retirementAge: 61, endAge: 64 })).outside).toBeUndefined();
  });

  it("has nothing for super when the plan ends before access, and nothing for either without super", () => {
    const beforeAccess = splitInputs({
      endAge: 62,
      superAccount: { ...splitInputs().superAccount!, accessAge: 65 },
    });

    expect(split(beforeAccess).super).toBeUndefined();
    expect(split(beforeAccess).outside).toBeDefined();
    expect(split(splitInputs({ superAccount: undefined }))).toEqual({});
  });

  it("super with a 0% return and no employer contributions needs exactly the after-access need", () => {
    const result = split(splitInputs());

    expect(result.super?.needToday.value).toBe(140_000);
  });

  it("counts cash on both sides of the outside-super test", () => {
    const result = split(splitInputs({ cashOpening: 10_000 }));

    // The portfolio needed is $50,000 once $10,000 of cash is counted, so $60,000 with the cash.
    expect(result.outside?.needToday.value).toBe(60_000);
    expect(result.outside?.hasToday).toBe(110_000);
  });

  it("grows employer contributions into what super needs today", () => {
    // $100,000 salary, 10% employer, 0% return and tax: $10,000 less 15% tax = $8,500 a year to 2026 + 1 (the retirement year).
    const result = split(
      splitInputs({
        salary: { annual: 100_000, growth: { kind: "none" } },
        superAccount: { ...splitInputs().superAccount!, employerRate: 0.1 },
      }),
    );

    // Employer contributions after row 0 up to the row before access (age 59): working only in 2027.
    expect(result.super?.needToday.value).toBeCloseTo(140_000 - 8_500, 6);
  });
});
