import { fc, test } from "@fast-check/vitest";
import { expect } from "vitest";

import { bundledRuleSet } from "../rules/bundledRuleSet";
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
  return summarisePlanForYear(plan, START_YEAR, bundledRuleSet);
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
      expect(row.portfolioClosing / row.inflationIndex).toBe(row.portfolioClosing);
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

// ---- M3: drawdown properties ----

/** A dated expense as generated: amount in today's dollars and a short range of calendar years. */
const generatedDatedExpenses = fc.array(
  fc.record({
    annual: fc.integer({ min: 0, max: 100_000 }),
    fromYear: fc.integer({ min: START_YEAR + 1, max: START_YEAR + 60 }),
    extraYears: fc.integer({ min: 0, max: 5 }),
  }),
  { maxLength: 3 },
);

/** Everything a drawdown plan varies: ages, money, rates, cash and dated expenses. */
const drawdownSettings = fc.record({
  currentAge: currentAges,
  yearsToRetirement,
  yearsAfterRetirement: fc.integer({ min: 1, max: 30 }),
  expectedReturn: returns,
  inflationRate: inflations,
  annualContribution: contributions,
  livingAnnual: fc.integer({ min: 1, max: 150_000 }),
  portfolioValue: fc.integer({ min: 0, max: 3_000_000 }),
  cashBalance: fc.integer({ min: 0, max: 500_000 }),
  datedExpenses: generatedDatedExpenses,
});

type DrawdownSettings =
  typeof drawdownSettings extends fc.Arbitrary<infer Settings> ? Settings : never;

/** Builds a complete plan with the generated ages, money, cash and dated expenses. */
function drawdownPlan(
  settings: DrawdownSettings,
  overrides: { cashBalance?: number; endAge?: number } = {},
): Plan {
  const base = buildPlan(
    settings.livingAnnual,
    { kind: "percentOfToday", fraction: 1 },
    0.04,
    settings.portfolioValue,
  );
  const [person] = base.household.people;
  const [portfolio] = base.portfolios;
  if (person === undefined || portfolio === undefined) throw new Error("blank plan is empty");

  const retirementAge = settings.currentAge + settings.yearsToRetirement;

  return {
    ...base,
    household: {
      people: [{ ...person, currentAge: settings.currentAge, targetRetirementAge: retirementAge }],
      projectionEndAge: overrides.endAge ?? retirementAge + settings.yearsAfterRetirement,
    },
    cash: { balance: overrides.cashBalance ?? settings.cashBalance },
    expenses: {
      ...base.expenses,
      datedExpenses: settings.datedExpenses.map((expense, index) => ({
        id: `expense-${index}`,
        name: "",
        annual: expense.annual,
        fromYear: expense.fromYear,
        toYear: expense.fromYear + expense.extraYears,
      })),
    },
    assumptions: { ...base.assumptions, inflationRate: settings.inflationRate },
    portfolios: [
      {
        ...portfolio,
        expectedReturn: settings.expectedReturn,
        annualContribution: settings.annualContribution,
      },
    ],
  };
}

// Money in = money out: every dollar is either still held at year end, spent, or unfunded.
test.prop([drawdownSettings])(
  "every row conserves money, and each row opens where the last one closed",
  (settings) => {
    const { rows } = completeProjection(drawdownPlan(settings));

    for (const [index, row] of rows.entries()) {
      const moneyIn =
        row.cashOpening +
        row.cashInterest +
        row.portfolioOpening +
        row.portfolioGrowth +
        row.contribution;
      const moneyOut = row.cashClosing + row.portfolioClosing + row.spending - row.shortfall;

      // Tolerance scales with the size of the numbers: floating point, not a modelling gap.
      expect(Math.abs(moneyIn - moneyOut)).toBeLessThanOrEqual(1e-6 * Math.max(1, moneyIn));
      expect(row.investableClosing).toBe(row.cashClosing + row.portfolioClosing);

      const previous = rows[index - 1];
      if (previous !== undefined) {
        expect(row.cashOpening).toBe(previous.cashClosing);
        expect(row.portfolioOpening).toBe(previous.portfolioClosing);
      }
    }
  },
);

test.prop([drawdownSettings])("balances and flows are never negative", (settings) => {
  for (const row of completeProjection(drawdownPlan(settings)).rows) {
    expect(row.cashClosing).toBeGreaterThanOrEqual(0);
    expect(row.portfolioClosing).toBeGreaterThanOrEqual(0);
    expect(row.fromCash).toBeGreaterThanOrEqual(0);
    expect(row.fromPortfolio).toBeGreaterThanOrEqual(0);
    expect(row.shortfall).toBeGreaterThanOrEqual(0);
  }
});

// Cash is spent first and the portfolio is untouched until it's gone, so more cash only helps.
test.prop([drawdownSettings, fc.integer({ min: 0, max: 500_000 })])(
  "more cash never creates a shortfall that wasn't there",
  (settings, extraCash) => {
    const lessCash = completeProjection(drawdownPlan(settings)).rows;
    const moreCash = completeProjection(
      drawdownPlan(settings, { cashBalance: settings.cashBalance + extraCash }),
    ).rows;

    for (const [index, row] of moreCash.entries()) {
      // A tiny tolerance absorbs floating-point noise in a year that is exactly funded.
      expect(row.shortfall).toBeLessThanOrEqual((lessCash[index]?.shortfall ?? 0) + 1e-6);
    }
  },
);

// Extending the plan only adds years at the end; the earlier rows are identical.
test.prop([drawdownSettings, fc.integer({ min: 1, max: 20 })])(
  "a later end age never removes a shortfall year that's still in range",
  (settings, extraYears) => {
    const retirementAge = settings.currentAge + settings.yearsToRetirement;
    const endAge = retirementAge + settings.yearsAfterRetirement;

    const shortYears = shortfallYearsOf(drawdownPlan(settings, { endAge }));
    const longYears = shortfallYearsOf(drawdownPlan(settings, { endAge: endAge + extraYears }));

    for (const year of shortYears) {
      expect(longYears).toContain(year);
    }
  },
);

/** The calendar years in which a plan's spending can't be fully funded. */
function shortfallYearsOf(plan: Plan): number[] {
  return completeProjection(plan)
    .rows.filter((row) => row.shortfall > 0)
    .map((row) => row.calendarYear);
}
