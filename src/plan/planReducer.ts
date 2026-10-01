// The single place where the in-memory plan changes.
//
//   UI event ──► dispatch(action) ──► planReducer(plan, action) ──► new Plan
//
// The reducer is pure: it never mutates the plan it is given and always
// returns a new object, so React can detect the change and the engine's
// derived summary can be recomputed from it.

import type { Plan, RetirementSpending } from "./types";

/**
 * Every way the plan can change. Optional payload values mean "clear this
 * back to its default": passing `undefined` leaves the field unset in the plan.
 */
export type PlanAction =
  | { readonly type: "setLivingExpenses"; readonly annual?: number }
  | { readonly type: "setRetirementSpending"; readonly spending?: RetirementSpending }
  | { readonly type: "setSafeWithdrawalRate"; readonly rate?: number }
  | { readonly type: "setPortfolioValue"; readonly portfolioId: string; readonly value?: number }
  | { readonly type: "renamePortfolio"; readonly portfolioId: string; readonly name: string }
  | { readonly type: "replacePlan"; readonly plan: Plan };

/**
 * Applies one action to a plan and returns the updated plan.
 *
 * Used by `PlanProvider` (via `useReducer`), which is how every screen edits
 * the plan. `replacePlan` is for when a saved plan finishes loading (step 7).
 * Actions naming a portfolio id that doesn't exist leave the portfolios unchanged.
 */
export function planReducer(plan: Plan, action: PlanAction): Plan {
  switch (action.type) {
    case "setLivingExpenses":
      return { ...plan, expenses: { ...plan.expenses, livingAnnual: action.annual } };

    case "setRetirementSpending":
      return { ...plan, expenses: { ...plan.expenses, retirementSpending: action.spending } };

    case "setSafeWithdrawalRate":
      return { ...plan, assumptions: { ...plan.assumptions, safeWithdrawalRate: action.rate } };

    case "setPortfolioValue":
      return {
        ...plan,
        portfolios: plan.portfolios.map((portfolio) =>
          portfolio.id === action.portfolioId ? { ...portfolio, value: action.value } : portfolio,
        ),
      };

    case "renamePortfolio":
      return {
        ...plan,
        portfolios: plan.portfolios.map((portfolio) =>
          portfolio.id === action.portfolioId ? { ...portfolio, name: action.name } : portfolio,
        ),
      };

    case "replacePlan":
      return action.plan;
  }
}
