// Turns a `Plan` (only what the user entered) into complete engine inputs.
//
//   Plan ──► resolvePlanInputs ──┬─► { status: "complete", inputs }   (engine runs)
//                                └─► { status: "incomplete", missing } (UI says what to enter)
//
// The engine never sees `undefined`; this is where defaults are applied.

import {
  DEFAULT_PORTFOLIO_VALUE,
  DEFAULT_RETIREMENT_SPENDING,
  DEFAULT_SAFE_WITHDRAWAL_RATE,
} from "./defaults";
import type { Plan, RetirementSpending, Sourced } from "./types";

/** An input the user still has to provide. The UI maps `field` to the step where it is entered. */
export interface MissingInput {
  readonly field: "livingExpenses" | "retirementSpending";
  readonly label: string;
}

/** A portfolio whose value has been resolved (default $0 if unset). */
export interface ResolvedPortfolio {
  readonly id: string;
  readonly name: string;
  readonly value: Sourced<number>;
}

/** Complete inputs for the engine: every value filled in, each tagged with its source. */
export interface ResolvedPlanInputs {
  readonly livingAnnual: Sourced<number>;
  readonly retirementSpending: Sourced<RetirementSpending>;
  readonly safeWithdrawalRate: Sourced<number>;
  readonly portfolios: readonly ResolvedPortfolio[];
}

/** The result of resolving: either everything needed, or what is missing. */
export type ResolvedPlan =
  | { readonly status: "complete"; readonly inputs: ResolvedPlanInputs }
  | { readonly status: "incomplete"; readonly missing: readonly MissingInput[] };

/**
 * Applies the defaults to a plan, or reports which required inputs are missing.
 *
 * Called by `summarisePlan` (src/engine/fiNumber.ts) at the start of every
 * calculation. In M1 living expenses are the only input that can be missing.
 */
export function resolvePlanInputs(plan: Plan): ResolvedPlan {
  const { livingAnnual, retirementSpending } = plan.expenses;
  const { safeWithdrawalRate } = plan.assumptions;

  // No default exists for living expenses, so an unset value stops the calculation.
  if (livingAnnual === undefined) {
    return {
      status: "incomplete",
      missing: [{ field: "livingExpenses", label: "Living expenses" }],
    };
  }

  const portfolios = plan.portfolios.map((portfolio): ResolvedPortfolio => ({
    id: portfolio.id,
    name: portfolio.name,
    value: sourceOrDefault(portfolio.value, DEFAULT_PORTFOLIO_VALUE),
  }));

  return {
    status: "complete",
    inputs: {
      livingAnnual: { value: livingAnnual, source: "input" },
      retirementSpending: sourceOrDefault(retirementSpending, DEFAULT_RETIREMENT_SPENDING),
      safeWithdrawalRate: sourceOrDefault(safeWithdrawalRate, DEFAULT_SAFE_WITHDRAWAL_RATE),
      portfolios,
    },
  };
}

/** Uses the user's value when set, otherwise the default, and records which one was used. */
function sourceOrDefault<Value>(userValue: Value | undefined, defaultValue: Value): Sourced<Value> {
  return userValue === undefined
    ? { value: defaultValue, source: "default" }
    : { value: userValue, source: "input" };
}
