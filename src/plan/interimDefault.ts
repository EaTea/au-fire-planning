// The default for "Drawn from savings while one of you is retired" (EXP-2).
//
// While only one of a couple has retired, the other is still working. If that
// partner earns a salary, their pay is assumed to cover spending (the same
// assumption as working years until take-home pay arrives in M8), so the
// default is $0. If they have no salary there is nothing to cover spending, so
// the default is the household's retirement spending. The owner chose this
// rule on 2026-10-23, after the PR B review.

import { DEFAULT_RETIREMENT_SPENDING } from "./defaults";
import type { Person, Plan } from "./types";

/** Which default applies, and for whom. */
export interface InterimDefault {
  /**
   * The default in today's dollars, or `undefined` when it is the retirement
   * spending and that can't be worked out yet (living expenses not entered).
   */
  readonly amount: number | undefined;
  /** True when the default is the retirement spending, because the later-retiring partner has no salary. */
  readonly followsRetirementSpending: boolean;
  /** The partner who retires later (the one still working in the one-retired years), when there are two people. */
  readonly laterPerson?: Person;
  /** The partner who retires first. */
  readonly earlierPerson?: Person;
  /** Positions of the two in `Plan.household.people`. */
  readonly laterIndex?: number;
  readonly earlierIndex?: number;
}

/**
 * Retirement spending in today's dollars as the plan states it: a dollar
 * amount, or a share of living expenses (100% when nothing is entered).
 * `undefined` when it is a share and living expenses aren't entered. Used by
 * `defaultInterimSpending`.
 */
export function retirementSpendingDollars(plan: Plan): number | undefined {
  const spending = plan.expenses.retirementSpending ?? DEFAULT_RETIREMENT_SPENDING;

  if (spending.kind === "amount") return spending.annual;

  return plan.expenses.livingAnnual === undefined
    ? undefined
    : plan.expenses.livingAnnual * spending.fraction;
}

/**
 * Works out the default interim amount for a plan. With one person there is no
 * such period: $0. With two, it is the retirement spending when the partner
 * who retires later has no salary above $0, and $0 otherwise. If both retire
 * the same year there are no one-retired years, so it doesn't matter and $0 is
 * used. Called by `resolvePlanInputs` (the figure the engine uses) and by the
 * Income & expenses field (to show which default applies).
 */
export function defaultInterimSpending(plan: Plan): InterimDefault {
  const [first, second] = plan.household.people;

  if (first === undefined || second === undefined) {
    return { amount: 0, followsRetirementSpending: false };
  }

  const firstRetirementAge = first.targetRetirementAge;
  const secondRetirementAge = second.targetRetirementAge;

  // Any age unknown: the years aren't known yet, so $0.
  if (
    firstRetirementAge === undefined ||
    secondRetirementAge === undefined ||
    first.currentAge === undefined ||
    second.currentAge === undefined
  ) {
    return { amount: 0, followsRetirementSpending: false };
  }

  // "Retires later" is by retirement year, so compare the years each has left to work.
  const firstYears = firstRetirementAge - first.currentAge;
  const secondYears = secondRetirementAge - second.currentAge;

  // Same year: there are no one-retired years, so the amount doesn't matter.
  if (firstYears === secondYears) return { amount: 0, followsRetirementSpending: false };

  const secondIsLater = secondYears > firstYears;
  const later = secondIsLater ? second : first;
  const earlier = secondIsLater ? first : second;
  const people = {
    laterPerson: later,
    earlierPerson: earlier,
    laterIndex: secondIsLater ? 1 : 0,
    earlierIndex: secondIsLater ? 0 : 1,
  };

  const laterHasSalary = (later.salary?.annual ?? 0) > 0;

  return laterHasSalary
    ? { amount: 0, followsRetirementSpending: false, ...people }
    : { amount: retirementSpendingDollars(plan), followsRetirementSpending: true, ...people };
}
