import { fc, test } from "@fast-check/vitest";
import { expect } from "vitest";

import { bundledRuleSet } from "../rules/bundledRuleSet";
import { projectPortfolio, type ProjectionInputs } from "./projection";
import { onePersonInputs } from "./testing/onePersonInputs";

// Property-based test for the household as a list of people: with ONE person,
// every household field of a row is exactly that person's own figure (not
// just close), so the refactor to people can't have moved a cent.

const START_YEAR = 2026;

/** Generated one-person plans with salary, super, spending and sometimes a locked-super shortfall. */
const onePersonArbitrary = fc
  .record({
    currentAge: fc.integer({ min: 20, max: 66 }),
    yearsToRetirement: fc.integer({ min: 0, max: 25 }),
    yearsAfterRetirement: fc.integer({ min: 1, max: 30 }),
    inflationRate: fc.integer({ min: 0, max: 60 }).map((tenths) => tenths / 1000),
    returnRate: fc.integer({ min: 0, max: 120 }).map((tenths) => tenths / 1000),
    salary: fc.integer({ min: 0, max: 400_000 }),
    superOpening: fc.integer({ min: 0, max: 800_000 }),
    salarySacrifice: fc.integer({ min: 0, max: 30_000 }),
    portfolioOpening: fc.integer({ min: 0, max: 500_000 }),
    cashOpening: fc.integer({ min: 0, max: 100_000 }),
    spending: fc.integer({ min: 0, max: 150_000 }),
    accessAge: fc.option(fc.integer({ min: 55, max: 70 }), { nil: undefined }),
  })
  .map((settings): ProjectionInputs => {
    const retirementAge = settings.currentAge + settings.yearsToRetirement;

    return onePersonInputs(
      {
        currentAge: settings.currentAge,
        endAge: retirementAge + settings.yearsAfterRetirement,
        retirementAge,
        expectedReturn: 0.07,
        interestRate: 0.04,
        inflationRate: settings.inflationRate,
        annualContribution: 5_000,
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
          salarySacrifice: { annual: settings.salarySacrifice },
          nonConcessional: { annual: 1_000 },
          ...(settings.accessAge === undefined ? {} : { accessAge: settings.accessAge }),
          ruleSet: bundledRuleSet,
        },
      },
      START_YEAR,
    );
  });

test.prop([onePersonArbitrary], { numRuns: 200 })(
  "with one person, every household field equals that person's own figure exactly",
  (inputs) => {
    for (const row of projectPortfolio(inputs, START_YEAR)) {
      const person = row.people[0];

      expect(row.people).toHaveLength(1);
      expect(row.salary).toBe(person.salary);
      expect(row.employerContribution).toBe(person.employerContribution);
      expect(row.salarySacrifice).toBe(person.salarySacrifice);
      expect(row.nonConcessional).toBe(person.nonConcessional);
      expect(row.contributionsTax).toBe(person.contributionsTax);
      expect(row.superOpening).toBe(person.superOpening);
      expect(row.superEarnings).toBe(person.superEarnings);
      expect(row.superEarningsTax).toBe(person.superEarningsTax);
      expect(row.fromSuper).toBe(person.fromSuper);
      expect(row.superClosing).toBe(person.superClosing);
      expect(row.superAccessible).toBe(person.superAccessible);
      // Phase "oneRetired" can't occur for one person.
      expect(row.phase).toBe(person.phase);
    }
  },
);
