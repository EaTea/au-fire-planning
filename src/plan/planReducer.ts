// The single place where the in-memory plan changes.
//
//   UI event ──► dispatch(action) ──► planReducer(plan, action) ──► new Plan
//
// The reducer is pure: it never mutates the plan it is given and always
// returns a new object, so React can detect the change and the engine's
// derived summary can be recomputed from it.

import type { Person, Plan, Portfolio, RetirementSpending } from "./types";

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
  | { readonly type: "setCurrentAge"; readonly personId: string; readonly age?: number }
  | { readonly type: "setTargetRetirementAge"; readonly personId: string; readonly age?: number }
  | { readonly type: "setInflationRate"; readonly rate?: number }
  | { readonly type: "setExpectedReturn"; readonly portfolioId: string; readonly rate?: number }
  | {
      readonly type: "setAnnualContribution";
      readonly portfolioId: string;
      readonly annual?: number;
    }
  | {
      readonly type: "setContributionsStopAge";
      readonly portfolioId: string;
      readonly age?: number;
    }
  | { readonly type: "replacePlan"; readonly plan: Plan };

/**
 * Applies one action to a plan and returns the updated plan.
 *
 * Used by `PlanProvider` (via `useReducer`), which is how every screen edits
 * the plan. `replacePlan` is for when a saved plan finishes loading (step 7).
 * Actions naming a person or portfolio id that doesn't exist leave the people
 * or portfolios unchanged.
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

    case "setCurrentAge":
      return updatePerson(plan, action.personId, { currentAge: action.age });

    case "setTargetRetirementAge":
      return updatePerson(plan, action.personId, { targetRetirementAge: action.age });

    case "setInflationRate":
      return { ...plan, assumptions: { ...plan.assumptions, inflationRate: action.rate } };

    case "setExpectedReturn":
      return updatePortfolio(plan, action.portfolioId, { expectedReturn: action.rate });

    case "setAnnualContribution":
      return updatePortfolio(plan, action.portfolioId, { annualContribution: action.annual });

    case "setContributionsStopAge":
      return updatePortfolio(plan, action.portfolioId, { contributionsStopAge: action.age });

    case "replacePlan":
      return action.plan;
  }
}

/** Returns the plan with the given changes applied to one person; other people are untouched. Used by the age actions. */
function updatePerson(plan: Plan, personId: string, changes: Partial<Person>): Plan {
  return {
    ...plan,
    household: {
      ...plan.household,
      people: plan.household.people.map((person) =>
        person.id === personId ? { ...person, ...changes } : person,
      ),
    },
  };
}

/** Returns the plan with the given changes applied to one portfolio; others are untouched. Used by the growth actions. */
function updatePortfolio(plan: Plan, portfolioId: string, changes: Partial<Portfolio>): Plan {
  return {
    ...plan,
    portfolios: plan.portfolios.map((portfolio) =>
      portfolio.id === portfolioId ? { ...portfolio, ...changes } : portfolio,
    ),
  };
}
