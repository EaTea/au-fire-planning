import { fc, test } from "@fast-check/vitest";
import { expect } from "vitest";

import { bundledRuleSet } from "../rules/bundledRuleSet";
import {
  projectPortfolio,
  type ProjectionInputs,
  type ProjectionPerson,
  type ProjectionRow,
} from "./projection";

// Property-based tests for the household as several people (M7 step 5):
// rules that must hold for any couple.

const START_YEAR = 2026;

/** Whole-dollar amounts with some cents, so sums don't line up neatly in binary. */
const dollars = (maximum: number) =>
  fc.integer({ min: 0, max: maximum * 100 }).map((cents) => cents / 100);

/** One generated person: ages, pay and a super account. */
const personArbitrary = fc.record({
  // Past 65 on purpose: super opens by age alone there, which is where an empty account matters.
  currentAge: fc.integer({ min: 30, max: 75 }),
  yearsToRetirement: fc.integer({ min: 0, max: 15 }),
  salary: dollars(300_000),
  superOpening: dollars(800_000),
  salarySacrifice: dollars(20_000),
  accessAge: fc.option(fc.integer({ min: 55, max: 70 }), { nil: undefined }),
});

type GeneratedPerson = typeof personArbitrary extends fc.Arbitrary<infer Value> ? Value : never;

/** Builds the engine's person from generated values; `id` and `label` tell them apart. */
function personFrom(generated: GeneratedPerson, id: string): ProjectionPerson {
  return {
    id,
    label: id,
    currentAge: generated.currentAge,
    retirementAge: generated.currentAge + generated.yearsToRetirement,
    salary: { annual: generated.salary, growth: { kind: "inflationPlus", margin: 0.01 } },
    superAccount: {
      opening: generated.superOpening,
      returnRate: 0.07,
      salarySacrifice: { annual: generated.salarySacrifice },
      nonConcessional: { annual: 0 },
      ...(generated.accessAge === undefined ? {} : { accessAge: generated.accessAge }),
      ruleSet: bundledRuleSet,
    },
  };
}

/** The household money and spending around the people. */
const moneyArbitrary = fc.record({
  portfolio: dollars(600_000),
  cash: dollars(100_000),
  spending: dollars(120_000),
  interim: dollars(60_000),
  contribution: dollars(30_000),
  inflationRate: fc.integer({ min: 0, max: 60 }).map((tenths) => tenths / 1000),
  yearsAfter: fc.integer({ min: 5, max: 30 }),
});

type GeneratedMoney = typeof moneyArbitrary extends fc.Arbitrary<infer Value> ? Value : never;

/** Household inputs for the given people (the youngest reaches the end age after `yearsAfter` years past the last retirement). */
function householdFrom(
  people: ProjectionInputs["people"],
  money: GeneratedMoney,
): ProjectionInputs {
  const lastRetirementRow = Math.max(
    ...people.map((person) => person.retirementAge - person.currentAge),
  );
  const youngestAge = Math.min(...people.map((person) => person.currentAge));

  return {
    people,
    endAge: youngestAge + lastRetirementRow + money.yearsAfter,
    expectedReturn: 0.06,
    interestRate: 0.03,
    inflationRate: money.inflationRate,
    annualContribution: money.contribution,
    contributionsStop: { kind: "whileWorking", personIds: people.map((person) => person.id) },
    portfolioOpening: money.portfolio,
    cashOpening: money.cash,
    livingAnnual: money.spending,
    retirementSpendingAnnual: money.spending,
    interimSpendingAnnual: money.interim,
    datedExpenses: [],
    fiNumberToday: 1_000_000,
  };
}

// A partner with nothing, the same ages and the same retirement, changes nothing: the
// household is exactly the first person on their own.
test.prop([personArbitrary, moneyArbitrary], { numRuns: 100 })(
  "a second person with no money and the same ages gives the first person's projection",
  (generated, money) => {
    const alex = personFrom(generated, "alex");
    // The empty account the app carries for someone who entered nothing (not "no account").
    const emptyPartner: ProjectionPerson = {
      id: "sam",
      label: "sam",
      currentAge: alex.currentAge,
      retirementAge: alex.retirementAge,
      salary: { annual: 0, growth: { kind: "none" } },
      superAccount: {
        opening: 0,
        returnRate: 0.07,
        salarySacrifice: { annual: 0 },
        nonConcessional: { annual: 0 },
        ruleSet: bundledRuleSet,
      },
    };

    const alone = projectPortfolio(householdFrom([alex], money), START_YEAR);
    const withPartner = projectPortfolio(householdFrom([alex, emptyPartner], money), START_YEAR);

    expect(withPartner).toHaveLength(alone.length);

    for (const [index, aloneRow] of alone.entries()) {
      const { people: alonePeople, ...aloneFields } = aloneRow;
      const { people: partnerPeople, ...partnerFields } = withPartner[index] as ProjectionRow;

      expect(partnerFields).toEqual(aloneFields);
      expect(partnerPeople[0]).toEqual(alonePeople[0]);
    }
  },
);

/** The household totals of a row that must not depend on the order of the people. */
function householdTotals(row: ProjectionRow): Record<string, number | string | boolean> {
  return {
    phase: row.phase,
    spending: row.spending,
    contribution: row.contribution,
    fromPortfolio: row.fromPortfolio,
    fromSuper: row.fromSuper,
    fromCash: row.fromCash,
    shortfall: row.shortfall,
    portfolioClosing: row.portfolioClosing,
    cashClosing: row.cashClosing,
    salary: row.salary,
    superClosing: row.superClosing,
    investableClosing: row.investableClosing,
    superAccessible: row.superAccessible,
  };
}

// Listing the people the other way round is the same household.
test.prop([personArbitrary, personArbitrary, moneyArbitrary], { numRuns: 100 })(
  "swapping the order of the people doesn't change any household total",
  (firstGenerated, secondGenerated, money) => {
    const alex = personFrom(firstGenerated, "alex");
    const sam = personFrom(secondGenerated, "sam");

    const forwards = projectPortfolio(householdFrom([alex, sam], money), START_YEAR);
    const backwards = projectPortfolio(householdFrom([sam, alex], money), START_YEAR);

    expect(backwards).toHaveLength(forwards.length);

    for (const [index, forwardRow] of forwards.entries()) {
      const forwardTotals = householdTotals(forwardRow);
      const backwardTotals = householdTotals(backwards[index] as ProjectionRow);

      for (const [field, forwardValue] of Object.entries(forwardTotals)) {
        const backwardValue = backwardTotals[field];

        if (typeof forwardValue === "number" && typeof backwardValue === "number") {
          // Adding in a different order moves the last digits, nothing more.
          expect(Math.abs(forwardValue - backwardValue)).toBeLessThan(1e-4);
        } else {
          expect(backwardValue).toBe(forwardValue);
        }
      }
    }
  },
);

// Nothing appears or disappears: every balance rolls forward by its flows, and
// each year's spending is fully accounted for.
test.prop([personArbitrary, personArbitrary, moneyArbitrary], { numRuns: 100 })(
  "money is conserved each year: opening + growth + contributions − drawn = closing",
  (firstGenerated, secondGenerated, money) => {
    const inputs = householdFrom(
      [personFrom(firstGenerated, "alex"), personFrom(secondGenerated, "sam")],
      money,
    );

    for (const row of projectPortfolio(inputs, START_YEAR).slice(1)) {
      expect(
        Math.abs(row.cashOpening + row.cashInterest - row.fromCash - row.cashClosing),
      ).toBeLessThan(1e-6);

      expect(
        Math.abs(
          row.portfolioOpening +
            row.portfolioGrowth +
            row.contribution -
            row.fromPortfolio -
            row.portfolioClosing,
        ),
      ).toBeLessThan(1e-6);

      for (const personYear of row.people) {
        const expectedClosing =
          personYear.superOpening +
          personYear.superEarnings -
          personYear.superEarningsTax +
          personYear.employerContribution +
          personYear.salarySacrifice -
          personYear.contributionsTax +
          personYear.nonConcessional -
          personYear.fromSuper;

        expect(Math.abs(personYear.superClosing - expectedClosing)).toBeLessThan(1e-6);
        expect(personYear.superClosing).toBeGreaterThanOrEqual(0);
      }

      // Every dollar of spending was paid by the portfolio, super or cash, or is the shortfall.
      expect(
        Math.abs(row.spending - (row.fromPortfolio + row.fromSuper + row.fromCash + row.shortfall)),
      ).toBeLessThan(1e-6);
    }
  },
);
