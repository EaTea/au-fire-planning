import { fc, test } from "@fast-check/vitest";
import { expect } from "vitest";

import { bundledRuleSet } from "../rules/bundledRuleSet";
import { rulesForYear } from "../rules/ruleSet";
import { projectPortfolio, type ProjectionInputs } from "./projection";

// Property-based tests for super accumulation and access (M5 step 5): rules
// that must hold for any plan with a super account.

const START_YEAR = 2026;

/** A full set of generated settings for a plan with salary, super and spending. */
const superInputsArbitrary = fc
  .record({
    currentAge: fc.integer({ min: 20, max: 64 }),
    yearsToRetirement: fc.integer({ min: 0, max: 30 }),
    inflationRate: fc.integer({ min: 0, max: 60 }).map((tenths) => tenths / 1000),
    returnRate: fc.integer({ min: 0, max: 120 }).map((tenths) => tenths / 1000),
    salary: fc.integer({ min: 0, max: 600_000 }),
    employerRate: fc.option(
      fc.integer({ min: 0, max: 200 }).map((tenths) => tenths / 1000),
      {
        nil: undefined,
      },
    ),
    earningsTaxRate: fc.option(
      fc.integer({ min: 0, max: 300 }).map((tenths) => tenths / 1000),
      {
        nil: undefined,
      },
    ),
    superOpening: fc.integer({ min: 0, max: 3_000_000 }),
    salarySacrifice: fc.integer({ min: 0, max: 50_000 }),
    nonConcessional: fc.integer({ min: 0, max: 50_000 }),
    nonConcessionalYears: fc.integer({ min: 0, max: 10 }),
    portfolioOpening: fc.integer({ min: 0, max: 500_000 }),
    cashOpening: fc.integer({ min: 0, max: 100_000 }),
    spending: fc.integer({ min: 0, max: 150_000 }),
  })
  .map((settings): ProjectionInputs => {
    const retirementAge = settings.currentAge + settings.yearsToRetirement;

    return {
      currentAge: settings.currentAge,
      endAge: retirementAge + 30,
      retirementAge,
      expectedReturn: 0.07,
      interestRate: 0.04,
      inflationRate: settings.inflationRate,
      annualContribution: 0,
      contributionsStopAge: retirementAge,
      portfolioOpening: settings.portfolioOpening,
      cashOpening: settings.cashOpening,
      livingAnnual: settings.spending,
      retirementSpendingAnnual: settings.spending,
      datedExpenses: [],
      fiNumberToday: 1_000_000,
      salary: { annual: settings.salary, growth: { kind: "inflationPlus", margin: 0.01 } },
      superAccount: {
        opening: settings.superOpening,
        returnRate: settings.returnRate,
        ...(settings.employerRate !== undefined ? { employerRate: settings.employerRate } : {}),
        ...(settings.earningsTaxRate !== undefined
          ? { earningsTaxRate: settings.earningsTaxRate }
          : {}),
        salarySacrifice: { annual: settings.salarySacrifice },
        nonConcessional: {
          annual: settings.nonConcessional,
          fromYear: START_YEAR + 1,
          toYear: START_YEAR + settings.nonConcessionalYears,
        },
        ruleSet: bundledRuleSet,
      },
    };
  });

// The super account always balances: nothing appears or disappears.
test.prop([superInputsArbitrary])(
  "each row: opening + earnings - earnings tax + concessional - contributions tax + non-concessional - drawn = closing",
  (inputs) => {
    for (const row of projectPortfolio(inputs, START_YEAR).slice(1)) {
      const expectedClosing =
        row.superOpening +
        row.superEarnings -
        row.superEarningsTax +
        row.employerContribution +
        row.salarySacrifice -
        row.contributionsTax +
        row.nonConcessional -
        row.fromSuper;

      expect(Math.abs(row.superClosing - expectedClosing)).toBeLessThan(1e-6);
    }
  },
);

// Employer contributions never exceed the rate times the row's maximum base.
test.prop([superInputsArbitrary])(
  "employer contributions never exceed the rate times the maximum contribution base",
  (inputs) => {
    for (const row of projectPortfolio(inputs, START_YEAR).slice(1)) {
      const rules = rulesForYear(
        bundledRuleSet,
        row.calendarYear,
        inputs.inflationRate,
      ).superannuation;
      const rate = inputs.superAccount?.employerRate ?? rules.guaranteeRate;

      expect(row.employerContribution).toBeLessThanOrEqual(
        rate * rules.maximumContributionBaseAnnualDollars + 1e-6,
      );
    }
  },
);

// Locked super is never touched.
test.prop([superInputsArbitrary])("super is never drawn before 65", (inputs) => {
  for (const row of projectPortfolio(inputs, START_YEAR)) {
    if (row.age < 65) expect(row.fromSuper).toBe(0);
  }
});

// More super at the start can only help: no year gets a bigger shortfall.
test.prop([superInputsArbitrary, fc.integer({ min: 1, max: 1_000_000 })])(
  "more starting super never creates a shortfall",
  (inputs, extraSuper) => {
    const account = inputs.superAccount;
    if (account === undefined) return;

    const baseRows = projectPortfolio(inputs, START_YEAR);
    const richerRows = projectPortfolio(
      { ...inputs, superAccount: { ...account, opening: account.opening + extraSuper } },
      START_YEAR,
    );

    for (const [index, baseRow] of baseRows.entries()) {
      expect(richerRows[index]?.shortfall ?? 0).toBeLessThanOrEqual(baseRow.shortfall + 1e-6);
    }
    if (baseRows.every((row) => row.shortfall === 0)) {
      expect(richerRows.every((row) => row.shortfall <= 1e-6)).toBe(true);
    }
  },
);
