import { fc, test } from "@fast-check/vitest";
import { expect } from "vitest";

import { createNewPlan } from "../plan/createNewPlan";
import type { Plan } from "../plan/types";
import { summarisePlan } from "./fiNumber";

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
