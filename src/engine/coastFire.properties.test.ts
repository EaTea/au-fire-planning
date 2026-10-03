import { fc, test } from "@fast-check/vitest";
import { expect } from "vitest";

import { createNewPlan } from "../plan/createNewPlan";
import type { Plan } from "../plan/types";
import { summarisePlan } from "./fiNumber";

// Property-based tests for Coast FIRE: rules that must hold for ANY sensible
// plan. The key one, "reached means stoppable", runs the real projection with
// contributions switched off, so Coast FIRE can't drift away from what the
// projection actually does.

const START_YEAR = 2026;

/** Everything a generated Coast FIRE plan varies. */
const settingsArbitrary = fc.record({
  currentAge: fc.integer({ min: 20, max: 55 }),
  yearsToRetirement: fc.integer({ min: 0, max: 30 }),
  expectedReturn: fc.integer({ min: 0, max: 120 }).map((tenths) => tenths / 1000),
  interestRate: fc.integer({ min: 0, max: 80 }).map((tenths) => tenths / 1000),
  inflationRate: fc.integer({ min: 0, max: 60 }).map((tenths) => tenths / 1000),
  annualContribution: fc.integer({ min: 0, max: 150_000 }),
  livingAnnual: fc.integer({ min: 1000, max: 150_000 }),
  portfolioValue: fc.integer({ min: 0, max: 3_000_000 }),
  cashBalance: fc.integer({ min: 0, max: 500_000 }),
  datedExpenses: fc.array(
    fc.record({
      annual: fc.integer({ min: 0, max: 150_000 }),
      yearsFromStart: fc.integer({ min: 1, max: 30 }),
      extraYears: fc.integer({ min: 0, max: 3 }),
    }),
    { maxLength: 3 },
  ),
});

type Settings = typeof settingsArbitrary extends fc.Arbitrary<infer Value> ? Value : never;

/** The same settings with no dated expenses, for properties that need a simple cash path. */
function withoutDatedExpenses(settings: Settings): Settings {
  return { ...settings, datedExpenses: [] };
}

/** Builds a complete plan from generated settings; `stopAge` overrides when contributions stop. */
function buildPlan(settings: Settings, stopAge?: number): Plan {
  let counter = 0;
  const blank = createNewPlan(() => `id-${++counter}`);
  const [person] = blank.household.people;
  const [portfolio] = blank.portfolios;
  if (person === undefined || portfolio === undefined) throw new Error("blank plan is empty");

  const retirementAge = settings.currentAge + settings.yearsToRetirement;

  return {
    ...blank,
    household: {
      people: [{ ...person, currentAge: settings.currentAge, targetRetirementAge: retirementAge }],
      projectionEndAge: retirementAge + 20,
    },
    cash: { balance: settings.cashBalance },
    expenses: {
      livingAnnual: settings.livingAnnual,
      retirementSpending: { kind: "percentOfToday", fraction: 1 },
      datedExpenses: settings.datedExpenses.map((expense, index) => ({
        id: `expense-${index}`,
        name: "",
        annual: expense.annual,
        fromYear: START_YEAR + expense.yearsFromStart,
        toYear: START_YEAR + expense.yearsFromStart + expense.extraYears,
      })),
    },
    assumptions: {
      safeWithdrawalRate: 0.04,
      inflationRate: settings.inflationRate,
      interestRate: settings.interestRate,
    },
    portfolios: [
      {
        ...portfolio,
        value: settings.portfolioValue,
        expectedReturn: settings.expectedReturn,
        annualContribution: settings.annualContribution,
        contributionsStopAge: stopAge,
      },
    ],
  };
}

/** The completed projection of a plan, failing the test otherwise. */
function completeProjection(plan: Plan) {
  const summary = summarisePlan(plan, START_YEAR);
  if (summary.status !== "complete" || summary.projection.status !== "complete") {
    throw new Error("expected a complete projection");
  }
  return summary.projection;
}

/** A tolerance that scales with the size of the numbers: floating point, not a modelling gap. */
function tolerance(...amounts: number[]): number {
  return 1e-6 * Math.max(1, ...amounts.map(Math.abs));
}

/** The year index Coast FIRE is reached, or infinity when it isn't (so "later" is "bigger"). */
function coastYearIndex(plan: Plan): number {
  return completeProjection(plan).coast.reached?.yearIndex ?? Number.POSITIVE_INFINITY;
}

// NFR-2.
test.prop([settingsArbitrary])("Coast FIRE is deterministic", (settings) => {
  expect(completeProjection(buildPlan(settings)).coast).toEqual(
    completeProjection(buildPlan(settings)).coast,
  );
});

// At retirement there is no growing left to do: you need the FI number, or just
// your cash if that alone is more.
test.prop([settingsArbitrary])(
  "at the retirement row the Coast FIRE number is the FI number (or just the cash, if larger)",
  (settings) => {
    const projection = completeProjection(buildPlan(settings));
    const last = projection.coast.path[projection.coast.path.length - 1];
    const retirementRow = projection.rows[projection.coast.path.length - 1];
    if (last === undefined || retirementRow === undefined) throw new Error("empty path");

    const expected = Math.max(last.fiNumber, retirementRow.cashClosing);
    expect(Math.abs(last.coastNumber - expected)).toBeLessThanOrEqual(tolerance(expected));
  },
);

// If FI is reached by retirement and cash and the portfolio both beat inflation, the money
// would have kept pace by itself, so Coast FIRE can't be later. (Cash must also beat
// inflation: otherwise leftover cash could lose value against a rising FI number.)
test.prop([settingsArbitrary])(
  "with returns and interest at least inflation and no dated expenses, Coast FIRE is reached no later than FI",
  (rawSettings) => {
    const settings = withoutDatedExpenses({
      ...rawSettings,
      expectedReturn: Math.max(rawSettings.expectedReturn, rawSettings.inflationRate),
      interestRate: Math.max(rawSettings.interestRate, rawSettings.inflationRate),
    });
    const projection = completeProjection(buildPlan(settings));
    const fiYearIndex = projection.fiReached?.yearIndex;

    if (fiYearIndex === undefined || fiYearIndex > projection.coast.path.length - 1) return;

    expect(projection.coast.reached).toBeDefined();
    expect(projection.coast.reached?.yearIndex ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(
      fiYearIndex,
    );
  },
);

test.prop([settingsArbitrary, fc.integer({ min: 0, max: 50 })])(
  "a higher return never raises the Coast FIRE number",
  (settings, extraTenthsOfPercent) => {
    const lower = completeProjection(buildPlan(settings)).coast.number.value;
    const higher = completeProjection(
      buildPlan({
        ...settings,
        expectedReturn: settings.expectedReturn + extraTenthsOfPercent / 1000,
      }),
    ).coast.number.value;

    expect(higher).toBeLessThanOrEqual(lower + tolerance(lower));
  },
);

test.prop([settingsArbitrary, fc.integer({ min: 0, max: 100_000 })])(
  "larger contributions never make Coast FIRE later",
  (settings, extraContribution) => {
    const smaller = coastYearIndex(buildPlan(settings));
    const larger = coastYearIndex(
      buildPlan({
        ...settings,
        annualContribution: settings.annualContribution + extraContribution,
      }),
    );

    expect(larger).toBeLessThanOrEqual(smaller);
  },
);

// The chart's "today's savings, no more contributions" line ends at the FI number
// exactly when the tile says "reached" for today.
test.prop([settingsArbitrary])(
  "without contributions, savings reach the FI number at retirement exactly when Coast FIRE is reached today",
  (settings) => {
    const { coast } = completeProjection(buildPlan(settings));
    const last = coast.path[coast.path.length - 1];
    if (last === undefined) throw new Error("empty path");

    const reachesFi = last.withoutContributions >= last.fiNumber - tolerance(last.fiNumber);
    const reachedToday = coast.reached?.yearIndex === 0;

    // Skip knife-edge cases where the two sides are equal to within rounding.
    const gap = Math.abs(last.withoutContributions - last.fiNumber);
    if (gap <= tolerance(last.fiNumber)) return;

    expect(reachesFi).toBe(reachedToday);
  },
);

/**
 * Settings tuned so Coast FIRE is reached after today but before retirement
 * most of the time (modest spending, a long runway, real contributions), so the
 * "reached means stoppable" test checks something in most runs rather than skipping.
 */
const likelyToCoastArbitrary = fc.record({
  currentAge: fc.integer({ min: 25, max: 45 }),
  yearsToRetirement: fc.integer({ min: 8, max: 30 }),
  expectedReturn: fc.integer({ min: 40, max: 100 }).map((tenths) => tenths / 1000),
  interestRate: fc.integer({ min: 0, max: 60 }).map((tenths) => tenths / 1000),
  inflationRate: fc.integer({ min: 0, max: 40 }).map((tenths) => tenths / 1000),
  annualContribution: fc.integer({ min: 15_000, max: 80_000 }),
  livingAnnual: fc.integer({ min: 20_000, max: 60_000 }),
  portfolioValue: fc.integer({ min: 0, max: 400_000 }),
  cashBalance: fc.integer({ min: 0, max: 100_000 }),
  datedExpenses: fc.array(
    fc.record({
      annual: fc.integer({ min: 0, max: 80_000 }),
      yearsFromStart: fc.integer({ min: 1, max: 30 }),
      extraYears: fc.integer({ min: 0, max: 2 }),
    }),
    { maxLength: 2 },
  ),
});

// The point of the whole feature: reached at row k means stopping after year k still gets
// you to the FI number by retirement, and stopping a year earlier doesn't.
test.prop([likelyToCoastArbitrary], { numRuns: 300 })(
  "reached means stoppable: stopping contributions at the reached age still reaches FI, one year earlier doesn't",
  (settings) => {
    const plan = buildPlan(settings);
    const { coast, rows } = completeProjection(plan);
    const reached = coast.reached;
    if (reached === undefined || reached.yearIndex === 0) return;

    const retirementIndex = coast.path.length - 1;

    const stoppedAtReachedAge = completeProjection(buildPlan(settings, reached.age));
    const atRetirement = stoppedAtReachedAge.rows[retirementIndex];
    if (atRetirement === undefined) throw new Error("missing retirement row");
    expect(atRetirement.investableClosing).toBeGreaterThanOrEqual(
      atRetirement.fiNumber - tolerance(atRetirement.fiNumber),
    );

    const stoppedEarlier = completeProjection(buildPlan(settings, reached.age - 1));
    const earlierAtRetirement = stoppedEarlier.rows[retirementIndex];
    if (earlierAtRetirement === undefined) throw new Error("missing retirement row");
    expect(earlierAtRetirement.investableClosing).toBeLessThan(
      earlierAtRetirement.fiNumber + tolerance(earlierAtRetirement.fiNumber),
    );

    // The unchanged plan's rows are the same plan the Coast FIRE path was built from.
    expect(rows.length).toBeGreaterThan(retirementIndex);
  },
);

// Cash earning no more than the portfolio is the less efficient place to hold money, so
// moving savings there can only mean more is needed.
test.prop([settingsArbitrary, fc.integer({ min: 0, max: 200_000 })])(
  "moving savings from the portfolio into cash at a lower rate never lowers the Coast FIRE number",
  (rawSettings, amountMoved) => {
    const settings = {
      ...rawSettings,
      interestRate: Math.min(rawSettings.interestRate, rawSettings.expectedReturn),
    };
    const moved = Math.min(amountMoved, settings.portfolioValue);

    const before = completeProjection(buildPlan(settings)).coast.number.value;
    const after = completeProjection(
      buildPlan({
        ...settings,
        portfolioValue: settings.portfolioValue - moved,
        cashBalance: settings.cashBalance + moved,
      }),
    ).coast.number.value;

    expect(after).toBeGreaterThanOrEqual(before - tolerance(before));
  },
);
