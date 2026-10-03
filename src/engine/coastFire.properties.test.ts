import { fc, test } from "@fast-check/vitest";
import { expect } from "vitest";

import { bundledRuleSet } from "../rules/bundledRuleSet";
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
  salary: fc.integer({ min: 0, max: 300_000 }),
  superBalance: fc.integer({ min: 0, max: 800_000 }),
  salarySacrifice: fc.integer({ min: 0, max: 30_000 }),
  nonConcessional: fc.integer({ min: 0, max: 30_000 }),
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

/**
 * Builds a complete plan from generated settings. `stopAge` overrides when the
 * contributions you choose to make stop: the portfolio's, salary sacrifice
 * and non-concessional (employer contributions continue while working).
 */
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
      people: [
        {
          ...person,
          currentAge: settings.currentAge,
          targetRetirementAge: retirementAge,
          salary: { annual: settings.salary },
          superAccount: {
            balance: settings.superBalance,
            // Unset years mean "to the retirement year"; a stop age pulls the end earlier.
            salarySacrifice: {
              annual: settings.salarySacrifice,
              ...(stopAge === undefined
                ? {}
                : { toYear: START_YEAR + stopAge - settings.currentAge }),
            },
            nonConcessional: {
              annual: settings.nonConcessional,
              ...(stopAge === undefined
                ? {}
                : { toYear: START_YEAR + stopAge - settings.currentAge }),
            },
          },
        },
      ],
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
  const summary = summarisePlan(plan, START_YEAR, bundledRuleSet);
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
// your cash and super if those alone are more.
//
// Only for plans where super is never drawn at or before retirement. From 65 super can pay
// a dated expense in a working year, and the formula's super path leaves dated expenses out,
// so there coast(n) can be a little off. That edge case is why "reached" is decided by
// re-running the projection (see coastFire.ts), not by the formula.
test.prop([settingsArbitrary])(
  "at the retirement row the Coast FIRE number is the FI number (or just the cash and super, if larger)",
  (settings) => {
    const projection = completeProjection(buildPlan(settings));
    const last = projection.coast.path[projection.coast.path.length - 1];
    const retirementRow = projection.rows[projection.coast.path.length - 1];
    if (last === undefined || retirementRow === undefined) throw new Error("empty path");

    const superIsDrawnBeforeRetirement = projection.rows
      .slice(0, projection.coast.path.length)
      .some((row) => row.fromSuper > 0);
    if (superIsDrawnBeforeRetirement) return;

    const expected = Math.max(
      last.fiNumber,
      retirementRow.cashClosing + retirementRow.superClosing,
    );
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
    // "Reached" asks for no shortfall year the plan doesn't already have. Larger contributions can
    // pay a dated expense the smaller plan leaves as a shortfall, which then counts against
    // stopping, so compare only plans where the smaller one has no shortfall before retirement.
    const smallerProjection = completeProjection(buildPlan(settings));
    const retirementIndex = smallerProjection.coast.path.length - 1;
    if (smallerProjection.rows.slice(0, retirementIndex + 1).some((row) => row.shortfall > 0)) {
      return;
    }

    const smaller = smallerProjection.coast.reached?.yearIndex ?? Number.POSITIVE_INFINITY;
    const larger = coastYearIndex(
      buildPlan({
        ...settings,
        annualContribution: settings.annualContribution + extraContribution,
      }),
    );

    expect(larger).toBeLessThanOrEqual(smaller);
  },
);

// The chart's "no more voluntary contributions" line ends at the FI number, with no new shortfall
// year, exactly when the tile says "reached" for today (the exact test at row 0).
test.prop([settingsArbitrary])(
  "stopping now reaches the FI number without a new shortfall exactly when Coast FIRE is reached today",
  (settings) => {
    const plan = buildPlan(settings);
    const { coast, rows } = completeProjection(plan);
    const last = coast.path[coast.path.length - 1];
    if (last === undefined) throw new Error("empty path");

    // Skip knife-edge cases where the two sides are equal to within rounding.
    const gap = Math.abs(last.withoutContributions - last.fiNumber);
    if (gap <= tolerance(last.fiNumber)) return;

    // A shortfall the plan already has doesn't count against stopping; a new one does.
    const stoppedNow = completeProjection(buildPlan(settings, settings.currentAge));
    const hasNewShortfall = stoppedNow.rows
      .slice(0, coast.path.length)
      .some((row, index) => row.shortfall > 0 && (rows[index]?.shortfall ?? 0) <= 0);

    const succeeds = last.withoutContributions >= last.fiNumber && !hasNewShortfall;
    const reachedToday = coast.reached?.yearIndex === 0;

    expect(succeeds).toBe(reachedToday);
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
  salary: fc.integer({ min: 0, max: 300_000 }),
  superBalance: fc.integer({ min: 0, max: 800_000 }),
  salarySacrifice: fc.integer({ min: 0, max: 30_000 }),
  nonConcessional: fc.integer({ min: 0, max: 30_000 }),
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

// The point of the whole feature: reached at row k means stopping your voluntary contributions
// (portfolio, salary sacrifice and non-concessional together) after year k still gets you to the
// FI number by retirement with no new shortfall, and stopping a year earlier doesn't. "Reached"
// is decided by exactly this test (see coastFire.ts), so this holds by construction. It also
// guards the settings-to-engine path: the plan built here stops the contributions through the
// plan's own fields, not through the engine's helper.
test.prop([likelyToCoastArbitrary], { numRuns: 300 })(
  "reached means stoppable: stopping contributions at the reached age still reaches FI, one year earlier doesn't",
  (settings) => {
    const plan = buildPlan(settings);
    const { coast, rows } = completeProjection(plan);
    const reached = coast.reached;
    if (reached === undefined || reached.yearIndex === 0) return;

    const retirementIndex = coast.path.length - 1;

    /** Whether stopping after the given age reaches FI at retirement with no shortfall the plan lacks. */
    function stoppingWorks(stopAge: number): boolean {
      const stopped = completeProjection(buildPlan(settings, stopAge)).rows;
      const atRetirement = stopped[retirementIndex];
      if (atRetirement === undefined) throw new Error("missing retirement row");

      const hasNewShortfall = stopped
        .slice(stopAge - settings.currentAge + 1, retirementIndex + 1)
        .some(
          (row) =>
            row.shortfall > tolerance(row.shortfall) && (rows[row.yearIndex]?.shortfall ?? 0) <= 0,
        );

      return (
        atRetirement.investableClosing >=
          atRetirement.fiNumber - tolerance(atRetirement.fiNumber) && !hasNewShortfall
      );
    }

    expect(stoppingWorks(reached.age)).toBe(true);
    expect(stoppingWorks(reached.age - 1)).toBe(false);
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
