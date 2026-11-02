import { fc, test } from "@fast-check/vitest";
import { expect } from "vitest";

import { bundledRuleSet } from "../rules/bundledRuleSet";
import { rulesForYear } from "../rules/ruleSet";
import { calculateIncomeTaxFigures } from "./incomeTax";
import { projectPortfolio, type ProjectionInputs, type ProjectionPerson } from "./projection";
import { onePersonInputs } from "./testing/onePersonInputs";

// Property-based test for the tax in each projection row (M8): for any plan
// the tax is exactly the income tax calculation applied to
// max(0, salary - salary sacrifice) + an equal share of the cash interest,
// with the rules of the row's year, and the household's tax is the sum.

const START_YEAR = 2026;

/** One generated person: pay, sacrifice and ages. */
const personArbitrary = fc.record({
  currentAge: fc.integer({ min: 25, max: 60 }),
  yearsToRetirement: fc.integer({ min: 0, max: 20 }),
  salary: fc.integer({ min: 0, max: 400_000 }),
  salarySacrifice: fc.integer({ min: 0, max: 60_000 }),
});

/** One or two people, with cash, interest and inflation, including years beyond the rules files. */
const planArbitrary = fc.record({
  people: fc.array(personArbitrary, { minLength: 1, maxLength: 2 }),
  cashOpening: fc.integer({ min: 0, max: 1_500_000 }),
  interestRate: fc.integer({ min: 0, max: 80 }).map((tenths) => tenths / 1000),
  inflationRate: fc.integer({ min: 0, max: 60 }).map((tenths) => tenths / 1000),
});

/** What `planArbitrary` generates. */
type GeneratedPlan = typeof planArbitrary extends fc.Arbitrary<infer Plan> ? Plan : never;

/** Builds the engine's inputs from a generated plan. */
function inputsFor(plan: GeneratedPlan): ProjectionInputs {
  const base = onePersonInputs(
    {
      currentAge: 30,
      endAge: 70,
      retirementAge: 60,
      expectedReturn: 0.05,
      interestRate: plan.interestRate,
      inflationRate: plan.inflationRate,
      annualContribution: 0,
      portfolioOpening: 100_000,
      cashOpening: plan.cashOpening,
      livingAnnual: 50_000,
      retirementSpendingAnnual: 50_000,
      datedExpenses: [],
      fiNumberToday: 1_000_000,
    },
    START_YEAR,
  );

  const people = plan.people.map((generated, index): ProjectionPerson => ({
    id: `person-${index}`,
    label: `Person ${index}`,
    currentAge: generated.currentAge,
    retirementAge: generated.currentAge + generated.yearsToRetirement,
    salary: { annual: generated.salary, growth: { kind: "inflationPlus", margin: 0.01 } },
    superAccount: {
      opening: 0,
      returnRate: 0.06,
      salarySacrifice: { annual: generated.salarySacrifice },
      nonConcessional: { annual: 0 },
      ruleSet: bundledRuleSet,
    },
  }));
  const [firstPerson, ...otherPeople] = people as [ProjectionPerson, ...ProjectionPerson[]];

  return {
    ...base,
    people: [firstPerson, ...otherPeople],
    endAge: Math.min(...people.map((person) => person.currentAge)) + 40,
    contributionsStop: { kind: "throughYear", year: START_YEAR },
  };
}

test.prop([planArbitrary], { numRuns: 150 })(
  "each person's tax is the tax calculation on max(0, salary − sacrifice) + their share of the interest, and the row is the sum",
  (plan) => {
    const inputs = inputsFor(plan);
    const rows = projectPortfolio(inputs, START_YEAR);

    for (const row of rows.slice(1)) {
      const rules = rulesForYear(bundledRuleSet, row.calendarYear, inputs.inflationRate).incomeTax;
      const interestShare = row.cashInterest / row.people.length;
      let expectedHouseholdTax = 0;

      for (const personYear of row.people) {
        const taxableIncome =
          Math.max(0, personYear.salary - personYear.salarySacrifice) + interestShare;
        const expected = calculateIncomeTaxFigures(taxableIncome, rules);

        expect(personYear.taxableIncome).toBeCloseTo(taxableIncome, 6);
        expect(personYear.tax).toBeCloseTo(expected.tax, 6);
        expect(personYear.incomeTax + personYear.medicareLevy).toBeCloseTo(personYear.tax, 6);
        expectedHouseholdTax += expected.tax;
      }

      expect(row.tax).toBeCloseTo(expectedHouseholdTax, 6);
    }
  },
);
