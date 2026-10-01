import { fc, test } from "@fast-check/vitest";
import { expect } from "vitest";

import { createNewPlan } from "../plan/createNewPlan";
import type { Plan } from "../plan/types";
import { summarisePlan as summarisePlanForYear } from "./fiNumber";

// Property-based tests: rules that must hold for ANY sensible plan, checked
// against many generated plans rather than a few hand-picked ones.

/** Whole-dollar-and-cent amounts, positive so the FI number is always above 0. */
const positiveDollars = fc.integer({ min: 1, max: 100_000_000 }).map((cents) => cents / 100);

/** Portfolio values from $0 up, to the cent. */
const portfolioDollars = fc.integer({ min: 0, max: 1_000_000_000 }).map((cents) => cents / 100);

/** Withdrawal rates from 0.1% to 20%, always greater than 0. */
const withdrawalRates = fc
  .integer({ min: 1, max: 200 })
  .map((tenthsOfPercent) => tenthsOfPercent / 1000);

/** Retirement spending as either a dollar amount or a share of today's spending (above 0). */
const retirementSpendings = fc.oneof(
  positiveDollars.map((annual) => ({ kind: "amount" as const, annual })),
  fc
    .integer({ min: 1, max: 300 })
    .map((percent) => ({ kind: "percentOfToday" as const, fraction: percent / 100 })),
);

/** The start year used throughout these tests (these properties don't depend on it). */
const START_YEAR = 2026;

/** Summarises a plan with the fixed start year. */
function summarisePlan(plan: Plan) {
  return summarisePlanForYear(plan, START_YEAR);
}

/** Builds a complete plan from generated values. */
function buildPlan(
  livingAnnual: number,
  retirementSpending: NonNullable<Plan["expenses"]["retirementSpending"]>,
  safeWithdrawalRate: number,
  portfolioValue: number,
): Plan {
  let counter = 0;
  const blank = createNewPlan(() => `id-${++counter}`);

  return {
    ...blank,
    expenses: { livingAnnual, retirementSpending },
    assumptions: { safeWithdrawalRate },
    portfolios: [{ id: "portfolio", name: "Share portfolio", value: portfolioValue }],
  };
}

/** Summarises a plan that is known to be complete, failing the test otherwise. */
function completeSummary(plan: Plan) {
  const summary = summarisePlan(plan);
  if (summary.status !== "complete") throw new Error("expected a complete summary");
  return summary;
}

// NFR-2: nothing hidden (clock, randomness) may affect the answer.
test.prop([positiveDollars, retirementSpendings, withdrawalRates, portfolioDollars])(
  "summarising the same plan twice gives deep-equal results (determinism)",
  (livingAnnual, retirementSpending, rate, portfolioValue) => {
    const plan = buildPlan(livingAnnual, retirementSpending, rate, portfolioValue);

    expect(summarisePlan(plan)).toEqual(summarisePlan(plan));
  },
);

// FI number is proportional to spending.
test.prop([positiveDollars, positiveDollars, withdrawalRates, portfolioDollars])(
  "doubling retirement spending doubles the FI number",
  (livingAnnual, annualSpending, rate, portfolioValue) => {
    const single = completeSummary(
      buildPlan(livingAnnual, { kind: "amount", annual: annualSpending }, rate, portfolioValue),
    );
    const doubled = completeSummary(
      buildPlan(livingAnnual, { kind: "amount", annual: annualSpending * 2 }, rate, portfolioValue),
    );

    expect(doubled.fiNumber.value).toBeCloseTo(single.fiNumber.value * 2, 6);
  },
);

// Withdrawing a larger share each year needs a smaller pot.
test.prop([
  positiveDollars,
  retirementSpendings,
  withdrawalRates,
  withdrawalRates,
  portfolioDollars,
])(
  "a higher withdrawal rate never gives a higher FI number",
  (livingAnnual, retirementSpending, rateA, rateB, portfolioValue) => {
    const [lowerRate, higherRate] = rateA <= rateB ? [rateA, rateB] : [rateB, rateA];

    const atLowerRate = completeSummary(
      buildPlan(livingAnnual, retirementSpending, lowerRate, portfolioValue),
    );
    const atHigherRate = completeSummary(
      buildPlan(livingAnnual, retirementSpending, higherRate, portfolioValue),
    );

    expect(atHigherRate.fiNumber.value).toBeLessThanOrEqual(atLowerRate.fiNumber.value);
  },
);

// Progress is a ratio, so multiplying back by the FI number recovers the investable amount.
test.prop([positiveDollars, retirementSpendings, withdrawalRates, portfolioDollars])(
  "progress × FI number equals the investable amount, to the cent",
  (livingAnnual, retirementSpending, rate, portfolioValue) => {
    const summary = completeSummary(
      buildPlan(livingAnnual, retirementSpending, rate, portfolioValue),
    );

    const recovered = summary.progressToFi.value * summary.fiNumber.value;

    expect(Math.abs(recovered - summary.investable.value)).toBeLessThan(0.005);
  },
);

// ---- M2: projection properties ----

/** Ages: current 20-60, then years to retirement 0-30. */
const currentAges = fc.integer({ min: 20, max: 60 });
const yearsToRetirement = fc.integer({ min: 0, max: 30 });
const returns = fc.integer({ min: 0, max: 150 }).map((tenthsOfPercent) => tenthsOfPercent / 1000);
const inflations = fc.integer({ min: 0, max: 80 }).map((tenthsOfPercent) => tenthsOfPercent / 1000);
const contributions = fc.integer({ min: 0, max: 200_000 });

/** Builds a plan with the projection inputs set. */
function projectionPlan(values: {
  currentAge: number;
  yearsToRetirement: number;
  expectedReturn: number;
  inflationRate: number;
  annualContribution: number;
}): Plan {
  const base = buildPlan(60000, { kind: "percentOfToday", fraction: 1 }, 0.04, 100000);
  const [person] = base.household.people;
  const [portfolio] = base.portfolios;
  if (person === undefined || portfolio === undefined) throw new Error("blank plan is empty");

  return {
    ...base,
    household: {
      people: [
        {
          ...person,
          currentAge: values.currentAge,
          targetRetirementAge: values.currentAge + values.yearsToRetirement,
        },
      ],
    },
    assumptions: { ...base.assumptions, inflationRate: values.inflationRate },
    portfolios: [
      {
        ...portfolio,
        expectedReturn: values.expectedReturn,
        annualContribution: values.annualContribution,
      },
    ],
  };
}

/** The completed projection of a plan, failing the test otherwise. */
function completeProjection(plan: Plan) {
  const { projection } = completeSummary(plan);
  if (projection.status !== "complete") throw new Error("expected a complete projection");
  return projection;
}

/** The year index FI is reached, or infinity when it never is (so "later" is "bigger"). */
function fiYearIndex(plan: Plan): number {
  return completeProjection(plan).fiReached?.yearIndex ?? Number.POSITIVE_INFINITY;
}

test.prop([currentAges, yearsToRetirement, returns, inflations, contributions])(
  "the projection is deterministic",
  (currentAge, years, expectedReturn, inflationRate, annualContribution) => {
    const plan = projectionPlan({
      currentAge,
      yearsToRetirement: years,
      expectedReturn,
      inflationRate,
      annualContribution,
    });

    expect(summarisePlan(plan)).toEqual(summarisePlan(plan));
  },
);

test.prop([currentAges, yearsToRetirement, returns, contributions])(
  "with zero inflation, today's and nominal values are equal",
  (currentAge, years, expectedReturn, annualContribution) => {
    const plan = projectionPlan({
      currentAge,
      yearsToRetirement: years,
      expectedReturn,
      inflationRate: 0,
      annualContribution,
    });

    for (const row of completeProjection(plan).rows) {
      expect(row.inflationIndex).toBe(1);
      expect(row.closingBalance / row.inflationIndex).toBe(row.closingBalance);
      expect(row.fiNumber).toBe(60000 / 0.04);
    }
  },
);

test.prop([
  currentAges,
  yearsToRetirement,
  returns,
  inflations,
  contributions,
  fc.integer({ min: 0, max: 50 }),
])(
  "a higher return never makes FI later",
  (currentAge, years, expectedReturn, inflationRate, annualContribution, extraTenthsOfPercent) => {
    const base = { currentAge, yearsToRetirement: years, inflationRate, annualContribution };

    const lower = projectionPlan({ ...base, expectedReturn });
    const higher = projectionPlan({
      ...base,
      expectedReturn: expectedReturn + extraTenthsOfPercent / 1000,
    });

    expect(fiYearIndex(higher)).toBeLessThanOrEqual(fiYearIndex(lower));
  },
);

test.prop([currentAges, yearsToRetirement, returns, inflations, contributions, contributions])(
  "larger contributions never make FI later",
  (currentAge, years, expectedReturn, inflationRate, contribution, extraContribution) => {
    const base = { currentAge, yearsToRetirement: years, expectedReturn, inflationRate };

    const smaller = projectionPlan({ ...base, annualContribution: contribution });
    const larger = projectionPlan({
      ...base,
      annualContribution: contribution + extraContribution,
    });

    expect(fiYearIndex(larger)).toBeLessThanOrEqual(fiYearIndex(smaller));
  },
);

test.prop([currentAges, yearsToRetirement, returns, inflations, contributions])(
  "every row's balance is the previous balance plus growth plus contribution",
  (currentAge, years, expectedReturn, inflationRate, annualContribution) => {
    const plan = projectionPlan({
      currentAge,
      yearsToRetirement: years,
      expectedReturn,
      inflationRate,
      annualContribution,
    });
    const { rows } = completeProjection(plan);

    for (let index = 1; index < rows.length; index++) {
      const previous = rows[index - 1];
      const current = rows[index];
      if (previous === undefined || current === undefined) throw new Error("missing row");

      expect(current.openingBalance).toBe(previous.closingBalance);
      expect(current.closingBalance).toBe(
        previous.closingBalance + current.growth + current.contribution,
      );
    }
  },
);
