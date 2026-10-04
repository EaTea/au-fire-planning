import { describe, expect, it } from "vitest";

import { bundledRuleSet } from "../rules/bundledRuleSet";
import { assessBridge, projectionHasSuper } from "./bridge";
import { projectPortfolio, type ProjectionInputs } from "./projection";

// Unit tests for the bridge check (M6 step 3), beyond the worked examples in
// tests/worked-examples/m6-bridge.json: the absent parts, the explanation and
// the arithmetic on a small inflating case.

/** Aged 55, retiring at 56, plan until 66, $100,000 outside and in super, $20,000 a year, 0% everything. */
function bridgeInputs(overrides: Partial<ProjectionInputs> = {}): ProjectionInputs {
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

/** Projects and assesses in one go. */
function assess(inputs: ProjectionInputs) {
  return assessBridge(projectPortfolio(inputs, 2026), inputs);
}

describe("assessBridge", () => {
  it("has no bridge when retiring at or after the access age, and says so by omitting it", () => {
    const result = assess(bridgeInputs({ retirementAge: 61, endAge: 64 }));

    expect(result.effectiveAccessAge).toBe(62);
    expect(result.bridge).toBeUndefined();
    expect(result.afterAccess?.status).toBe("met");
  });

  it("has only the bridge when the plan ends before super opens", () => {
    const result = assess(
      bridgeInputs({
        endAge: 62,
        superAccount: { ...bridgeInputs().superAccount!, accessAge: 65 },
      }),
    );

    expect(result.effectiveAccessAge).toBe(65);
    expect(result.afterAccess).toBeUndefined();
    // Ages 57 to 62 need $120,000 against $100,000: the last year, 2033 (age 62), is short.
    expect(result.bridge).toMatchObject({
      firstYear: 2028,
      lastYear: 2033,
      status: "short",
      shortYears: [2033],
    });
  });

  it("has neither part when there is no super", () => {
    expect(assess(bridgeInputs({ superAccount: undefined }))).toEqual({});
  });

  it("discounts the bridge spending at the portfolio's return, and after access at super's after-tax return", () => {
    // Spending $10,000 a year, no inflation. Bridge: 2028 to 2030 discounted to 2027 at 10%.
    const inputs = bridgeInputs({
      expectedReturn: 0.1,
      retirementSpendingAnnual: 10_000,
      livingAnnual: 10_000,
      superAccount: { ...bridgeInputs().superAccount!, returnRate: 0.1, earningsTaxRate: 0.5 },
    });
    const result = assess(inputs);

    const bridgeNeed = 10_000 / 1.1 + 10_000 / 1.1 ** 2 + 10_000 / 1.1 ** 3;
    expect(result.bridge?.need.value).toBeCloseTo(bridgeNeed, 6);

    // After access: 2031 to 2037 discounted to 2030 at 10% × (1 − 50%) = 5%.
    let afterAccessNeed = 0;
    for (let year = 1; year <= 7; year++) afterAccessNeed += 10_000 / 1.05 ** year;
    expect(result.afterAccess?.need.value).toBeCloseTo(afterAccessNeed, 6);
    expect(result.afterAccess?.need.lines.map((line) => line.label).join("|")).toContain("5%");
  });

  it("names the discount rate, and only the after-access working says withdrawals are tax-free from 60", () => {
    const result = assess(bridgeInputs());
    const labels = result.bridge?.need.lines.map((line) => line.label) ?? [];

    expect(labels.some((label) => label.includes("the portfolio's return"))).toBe(true);

    const bridgeLines = [
      ...(result.bridge?.need.lines ?? []),
      ...(result.bridge?.projected.lines ?? []),
    ];
    expect(bridgeLines.map((line) => line.label)).not.toContain(
      "Withdrawals are tax-free from age",
    );

    const lastAfterAccessLine = result.afterAccess?.projected.lines.at(-1);
    expect(lastAfterAccessLine).toMatchObject({
      label: "Withdrawals are tax-free from age",
      value: 60,
      unit: "years",
    });
  });

  it("projected is portfolio plus cash at retirement, then super plus both after access", () => {
    const result = assess(bridgeInputs({ cashOpening: 5_000 }));

    expect(result.bridge?.projected.value).toBe(105_000);
    expect(result.afterAccess?.projected.value).toBe(
      projectPortfolio(bridgeInputs({ cashOpening: 5_000 }), 2026)[4]?.investableClosing,
    );
  });
});

describe("projectionHasSuper", () => {
  it("is true when super holds money in some year", () => {
    const inputs = bridgeInputs();

    expect(projectionHasSuper(projectPortfolio(inputs, 2026))).toBe(true);
  });

  it("is false for an empty super account that never receives anything", () => {
    const inputs = bridgeInputs();
    const emptyAccount = { ...inputs.superAccount!, opening: 0 };

    expect(
      projectionHasSuper(projectPortfolio({ ...inputs, superAccount: emptyAccount }, 2026)),
    ).toBe(false);
  });

  it("is false when the plan has no super account at all", () => {
    const withoutSuper = { ...bridgeInputs(), superAccount: undefined };

    expect(projectionHasSuper(projectPortfolio(withoutSuper, 2026))).toBe(false);
  });
});
