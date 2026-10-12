import { fc, test } from "@fast-check/vitest";
import { expect } from "vitest";

import { bundledRuleSet } from "../rules/bundledRuleSet";
import { assessBridge } from "./bridge";
import { projectPortfolio, type ProjectionInputs } from "./projection";

// Property-based test for the bridge check (M6 step 3): a part's status is MET
// exactly when none of its years has a shortfall, whatever the plan.

const START_YEAR = 2026;

/** Generated plans with super, a generated access age and enough variety to be short or funded. */
const planArbitrary = fc
  .record({
    currentAge: fc.integer({ min: 30, max: 60 }),
    yearsToRetirement: fc.integer({ min: 0, max: 15 }),
    yearsAfterRetirement: fc.integer({ min: 1, max: 30 }),
    accessAge: fc.option(fc.integer({ min: 55, max: 70 }), { nil: undefined }),
    portfolio: fc.integer({ min: 0, max: 800_000 }),
    cash: fc.integer({ min: 0, max: 100_000 }),
    superOpening: fc.integer({ min: 0, max: 800_000 }),
    spending: fc.integer({ min: 0, max: 80_000 }),
    inflationRate: fc.integer({ min: 0, max: 50 }).map((tenths) => tenths / 1000),
  })
  .map((settings): ProjectionInputs => {
    const retirementAge = settings.currentAge + settings.yearsToRetirement;

    return {
      currentAge: settings.currentAge,
      endAge: retirementAge + settings.yearsAfterRetirement,
      retirementAge,
      expectedReturn: 0.05,
      interestRate: 0.03,
      inflationRate: settings.inflationRate,
      annualContribution: 0,
      contributionsStopAge: retirementAge,
      portfolioOpening: settings.portfolio,
      cashOpening: settings.cash,
      livingAnnual: settings.spending,
      retirementSpendingAnnual: settings.spending,
      datedExpenses: [],
      fiNumberToday: 1_000_000,
      superAccount: {
        opening: settings.superOpening,
        returnRate: 0.06,
        salarySacrifice: { annual: 0 },
        nonConcessional: { annual: 0 },
        ...(settings.accessAge === undefined ? {} : { accessAge: settings.accessAge }),
        ruleSet: bundledRuleSet,
      },
    };
  });

test.prop([planArbitrary], { numRuns: 300 })(
  "each part is MET exactly when none of its years has a shortfall",
  (inputs) => {
    const rows = projectPortfolio(inputs, START_YEAR);
    const result = assessBridge(rows, inputs);

    for (const part of [result.bridge, result.afterAccess]) {
      if (part === undefined) continue;

      const shortfallYears = rows
        .filter((row) => row.calendarYear >= part.firstYear && row.calendarYear <= part.lastYear)
        .filter((row) => row.shortfall > 0)
        .map((row) => row.calendarYear);

      expect(part.shortYears).toEqual(shortfallYears);
      expect(part.status).toBe(shortfallYears.length === 0 ? "met" : "short");
    }
  },
);

test.prop([planArbitrary], { numRuns: 300 })(
  "the bridge only exists for years before the effective access age, and after access starts at it",
  (inputs) => {
    const rows = projectPortfolio(inputs, START_YEAR);
    const result = assessBridge(rows, inputs);
    const accessAge = result.effectiveAccessAge as number;

    if (result.bridge !== undefined) {
      expect(result.bridge.firstAge).toBe(inputs.retirementAge + 1);
      expect(result.bridge.lastAge).toBeLessThan(accessAge);
    }
    if (result.afterAccess !== undefined) {
      expect(result.afterAccess.firstAge).toBe(Math.max(accessAge, inputs.currentAge + 1));
      expect(result.afterAccess.lastAge).toBe(inputs.endAge);
    }
  },
);
