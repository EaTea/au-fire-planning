import { fc, test } from "@fast-check/vitest";
import { expect } from "vitest";

import { bundledRuleSet } from "../rules/bundledRuleSet";
import { assessBridge } from "./bridge";
import { calculateCoastSplit } from "./coastSplit";
import { projectPortfolio, type ProjectionInputs } from "./projection";

// Property-based tests for Coast FIRE for super and outside super (M6 step 4):
// a larger balance never makes either test later, and super with a 0% return
// and no employer contributions needs exactly the after-access need.

const START_YEAR = 2026;

/** Generated settings for a plan with a bridge, super and a salary. */
const settingsArbitrary = fc.record({
  currentAge: fc.integer({ min: 30, max: 50 }),
  yearsToRetirement: fc.integer({ min: 1, max: 12 }),
  yearsAfterRetirement: fc.integer({ min: 5, max: 30 }),
  accessAge: fc.option(fc.integer({ min: 60, max: 65 }), { nil: undefined }),
  portfolio: fc.integer({ min: 0, max: 500_000 }),
  cash: fc.integer({ min: 0, max: 50_000 }),
  superOpening: fc.integer({ min: 0, max: 500_000 }),
  extra: fc.integer({ min: 0, max: 300_000 }),
  spending: fc.integer({ min: 10_000, max: 60_000 }),
  salary: fc.integer({ min: 0, max: 200_000 }),
  contribution: fc.integer({ min: 0, max: 30_000 }),
  inflationRate: fc.integer({ min: 0, max: 40 }).map((tenths) => tenths / 1000),
  employerRate: fc.integer({ min: 0, max: 150 }).map((tenths) => tenths / 1000),
});

type Settings = typeof settingsArbitrary extends fc.Arbitrary<infer Value> ? Value : never;

/** Builds the projection inputs from generated settings. */
function inputsFrom(
  settings: Settings,
  overrides: {
    portfolio?: number;
    superOpening?: number;
    returnRate?: number;
    employerRate?: number;
  } = {},
): ProjectionInputs {
  const retirementAge = settings.currentAge + settings.yearsToRetirement;

  return {
    currentAge: settings.currentAge,
    endAge: retirementAge + settings.yearsAfterRetirement,
    retirementAge,
    expectedReturn: 0.06,
    interestRate: 0.03,
    inflationRate: settings.inflationRate,
    annualContribution: settings.contribution,
    contributionsStopAge: retirementAge,
    portfolioOpening: overrides.portfolio ?? settings.portfolio,
    cashOpening: settings.cash,
    livingAnnual: settings.spending,
    retirementSpendingAnnual: settings.spending,
    datedExpenses: [],
    fiNumberToday: 1_000_000,
    salary: { annual: settings.salary, growth: { kind: "none" } },
    superAccount: {
      opening: overrides.superOpening ?? settings.superOpening,
      returnRate: overrides.returnRate ?? 0.07,
      employerRate: overrides.employerRate ?? settings.employerRate,
      salarySacrifice: { annual: 0 },
      nonConcessional: { annual: 0 },
      ...(settings.accessAge === undefined ? {} : { accessAge: settings.accessAge }),
      ruleSet: bundledRuleSet,
    },
  };
}

/** Projects and splits. */
function splitFor(inputs: ProjectionInputs) {
  const rows = projectPortfolio(inputs, START_YEAR);

  return calculateCoastSplit(rows, inputs, assessBridge(rows, inputs));
}

/** The year a part is reached, or infinity when it never is, so "later" is a plain comparison. */
const yearOrNever = (reached: { calendarYear: number } | undefined) =>
  reached?.calendarYear ?? Number.POSITIVE_INFINITY;

test.prop([settingsArbitrary], { numRuns: 150 })(
  "a larger portfolio never makes outside super later",
  (settings) => {
    const smaller = splitFor(inputsFrom(settings)).outside;
    const larger = splitFor(
      inputsFrom(settings, { portfolio: settings.portfolio + settings.extra }),
    ).outside;

    // Both sides have a bridge or neither does: the retirement age and access age are the same.
    expect(larger === undefined).toBe(smaller === undefined);
    if (smaller === undefined || larger === undefined) return;

    expect(yearOrNever(larger.reached)).toBeLessThanOrEqual(yearOrNever(smaller.reached));
  },
);

test.prop([settingsArbitrary], { numRuns: 150 })(
  "a larger super balance never makes super later",
  (settings) => {
    const smaller = splitFor(inputsFrom(settings)).super;
    const larger = splitFor(
      inputsFrom(settings, { superOpening: settings.superOpening + settings.extra }),
    ).super;

    expect(larger === undefined).toBe(smaller === undefined);
    if (smaller === undefined || larger === undefined) return;

    expect(yearOrNever(larger.reached)).toBeLessThanOrEqual(yearOrNever(smaller.reached));
  },
);

test.prop([settingsArbitrary], { numRuns: 150 })(
  "super with a 0% return and no employer contributions needs exactly the after-access need",
  (settings) => {
    const inputs = inputsFrom(settings, { returnRate: 0, employerRate: 0 });
    const rows = projectPortfolio(inputs, START_YEAR);
    const bridge = assessBridge(rows, inputs);
    const result = calculateCoastSplit(rows, inputs, bridge);

    if (bridge.afterAccess === undefined) {
      expect(result.super).toBeUndefined();
      return;
    }

    expect(result.super?.needToday.value).toBeCloseTo(bridge.afterAccess.need.value, 6);
  },
);
