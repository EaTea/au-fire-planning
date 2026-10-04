// The single place where the in-memory plan changes.
//
//   UI event ──► dispatch(action) ──► planReducer(plan, action) ──► new Plan
//
// The reducer is pure: it never mutates the plan it is given and always
// returns a new object, so React can detect the change and the engine's
// derived summary can be recomputed from it.

import type {
  DatedExpense,
  Person,
  Plan,
  Portfolio,
  RetirementSpending,
  Salary,
  SalaryGrowth,
  SuperAccount,
  SuperContribution,
} from "./types";

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
  | { readonly type: "setSuperAccessAge"; readonly personId: string; readonly age?: number }
  | { readonly type: "setSalary"; readonly personId: string; readonly annual?: number }
  | { readonly type: "setSalaryGrowth"; readonly personId: string; readonly growth?: SalaryGrowth }
  | { readonly type: "setSuperBalance"; readonly personId: string; readonly balance?: number }
  | { readonly type: "setSuperReturn"; readonly personId: string; readonly rate?: number }
  | { readonly type: "setEmployerRate"; readonly personId: string; readonly rate?: number }
  | { readonly type: "setEarningsTaxRate"; readonly personId: string; readonly rate?: number }
  | { readonly type: "setSalarySacrifice"; readonly personId: string; readonly annual?: number }
  | {
      readonly type: "setSalarySacrificeFromYear";
      readonly personId: string;
      readonly year?: number;
    }
  | { readonly type: "setSalarySacrificeToYear"; readonly personId: string; readonly year?: number }
  | { readonly type: "setNonConcessional"; readonly personId: string; readonly annual?: number }
  | {
      readonly type: "setNonConcessionalFromYear";
      readonly personId: string;
      readonly year?: number;
    }
  | {
      readonly type: "setNonConcessionalToYear";
      readonly personId: string;
      readonly year?: number;
    }
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
  | { readonly type: "setProjectionEndAge"; readonly age?: number }
  | { readonly type: "setCashBalance"; readonly balance?: number }
  | { readonly type: "setInterestRate"; readonly rate?: number }
  | { readonly type: "addDatedExpense"; readonly id: string; readonly startYear: number }
  | {
      readonly type: "updateDatedExpense";
      readonly id: string;
      readonly changes: Partial<Pick<DatedExpense, "name" | "annual" | "fromYear" | "toYear">>;
    }
  | { readonly type: "duplicateDatedExpense"; readonly id: string; readonly newId: string }
  | { readonly type: "removeDatedExpense"; readonly id: string }
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

    case "setSuperAccessAge":
      return updatePerson(plan, action.personId, { superAccessAge: action.age });

    case "setSalary":
      return updateSalary(plan, action.personId, { annual: action.annual });

    case "setSalaryGrowth":
      return updateSalary(plan, action.personId, { growth: action.growth });

    case "setSuperBalance":
      return updateSuperAccount(plan, action.personId, () => ({ balance: action.balance }));

    case "setSuperReturn":
      return updateSuperAccount(plan, action.personId, () => ({ returnRate: action.rate }));

    case "setEmployerRate":
      return updateSuperAccount(plan, action.personId, () => ({ employerRate: action.rate }));

    case "setEarningsTaxRate":
      return updateSuperAccount(plan, action.personId, () => ({ earningsTaxRate: action.rate }));

    case "setSalarySacrifice":
      return updateContribution(plan, action.personId, "salarySacrifice", "annual", action.annual);

    case "setSalarySacrificeFromYear":
      return updateContribution(plan, action.personId, "salarySacrifice", "fromYear", action.year);

    case "setSalarySacrificeToYear":
      return updateContribution(plan, action.personId, "salarySacrifice", "toYear", action.year);

    case "setNonConcessional":
      return updateContribution(plan, action.personId, "nonConcessional", "annual", action.annual);

    case "setNonConcessionalFromYear":
      return updateContribution(plan, action.personId, "nonConcessional", "fromYear", action.year);

    case "setNonConcessionalToYear":
      return updateContribution(plan, action.personId, "nonConcessional", "toYear", action.year);

    case "setInflationRate":
      return { ...plan, assumptions: { ...plan.assumptions, inflationRate: action.rate } };

    case "setExpectedReturn":
      return updatePortfolio(plan, action.portfolioId, { expectedReturn: action.rate });

    case "setAnnualContribution":
      return updatePortfolio(plan, action.portfolioId, { annualContribution: action.annual });

    case "setContributionsStopAge":
      return updatePortfolio(plan, action.portfolioId, { contributionsStopAge: action.age });

    case "setProjectionEndAge":
      return { ...plan, household: { ...plan.household, projectionEndAge: action.age } };

    case "setCashBalance":
      return { ...plan, cash: { ...plan.cash, balance: action.balance } };

    case "setInterestRate":
      return { ...plan, assumptions: { ...plan.assumptions, interestRate: action.rate } };

    case "addDatedExpense": {
      // A new row is a valid one-off in the first year with flows (row 0 is today).
      const firstYearWithFlows = action.startYear + 1;
      const newExpense: DatedExpense = {
        id: action.id,
        name: "",
        fromYear: firstYearWithFlows,
        toYear: firstYearWithFlows,
      };

      return withDatedExpenses(plan, [...(plan.expenses.datedExpenses ?? []), newExpense]);
    }

    case "updateDatedExpense":
      return withDatedExpenses(
        plan,
        (plan.expenses.datedExpenses ?? []).map((expense) =>
          expense.id === action.id ? applyDatedExpenseChanges(expense, action.changes) : expense,
        ),
      );

    case "duplicateDatedExpense": {
      const expenses = plan.expenses.datedExpenses ?? [];
      const originalIndex = expenses.findIndex((expense) => expense.id === action.id);
      const original = expenses[originalIndex];
      if (original === undefined) return plan;

      // The copy sits straight after the original, so it is easy to find and edit.
      return withDatedExpenses(plan, [
        ...expenses.slice(0, originalIndex + 1),
        { ...original, id: action.newId },
        ...expenses.slice(originalIndex + 1),
      ]);
    }

    case "removeDatedExpense":
      return withDatedExpenses(
        plan,
        (plan.expenses.datedExpenses ?? []).filter((expense) => expense.id !== action.id),
      );

    case "replacePlan":
      return action.plan;
  }
}

/** Returns the plan with its dated expenses list replaced. Used by the dated-expense actions. */
function withDatedExpenses(plan: Plan, datedExpenses: readonly DatedExpense[]): Plan {
  return { ...plan, expenses: { ...plan.expenses, datedExpenses } };
}

/**
 * Applies edits to one dated expense and keeps its years in order: if the
 * "From" year passes the "To" year, "To" moves up to match (so a one-off
 * stays a one-off). A "To" year typed earlier than "From" is raised the same
 * way, so the saved plan always satisfies the schema's `toYear >= fromYear`.
 * A change with `annual: undefined` clears the amount back to unset ($0).
 */
function applyDatedExpenseChanges(
  expense: DatedExpense,
  changes: Partial<Pick<DatedExpense, "name" | "annual" | "fromYear" | "toYear">>,
): DatedExpense {
  const updated = { ...expense, ...changes };

  return { ...updated, toYear: Math.max(updated.toYear, updated.fromYear) };
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

/**
 * Returns the plan with the given salary fields changed on one person. A field
 * set to `undefined` is cleared, and when both are cleared the person's
 * `salary` is removed so an untouched salary stays absent. Used by the salary actions.
 */
function updateSalary(plan: Plan, personId: string, changes: Partial<Salary>): Plan {
  const person = plan.household.people.find((candidate) => candidate.id === personId);
  if (person === undefined) {
    return plan;
  }

  const merged = { ...person.salary, ...changes };
  const salary: Salary = {
    ...(merged.annual !== undefined ? { annual: merged.annual } : {}),
    ...(merged.growth !== undefined ? { growth: merged.growth } : {}),
  };

  const { salary: previousSalary, ...personWithoutSalary } = person;
  void previousSalary;
  const updatedPerson: Person =
    Object.keys(salary).length === 0 ? personWithoutSalary : { ...personWithoutSalary, salary };

  return {
    ...plan,
    household: {
      ...plan.household,
      people: plan.household.people.map((candidate) =>
        candidate.id === personId ? updatedPerson : candidate,
      ),
    },
  };
}

/**
 * Returns the plan with one person's super account changed. `makeChanges`
 * receives the current account and returns the fields to overwrite; a field
 * set to `undefined` is cleared. Empty results are tidied away: a
 * contribution with nothing set is dropped, and when the whole account is
 * empty the person's `superAccount` is removed, so an untouched account stays
 * absent (and is not written to the stored document). An unknown person id
 * leaves the plan unchanged. Used by the super actions.
 */
function updateSuperAccount(
  plan: Plan,
  personId: string,
  makeChanges: (account: SuperAccount) => Partial<SuperAccount>,
): Plan {
  const person = plan.household.people.find((candidate) => candidate.id === personId);
  if (person === undefined) {
    return plan;
  }

  const currentAccount = person.superAccount ?? {};
  const merged = { ...currentAccount, ...makeChanges(currentAccount) };

  // Rebuild the account without any unset (undefined) or empty fields.
  const account: SuperAccount = {
    ...(merged.balance !== undefined ? { balance: merged.balance } : {}),
    ...(merged.returnRate !== undefined ? { returnRate: merged.returnRate } : {}),
    ...(merged.employerRate !== undefined ? { employerRate: merged.employerRate } : {}),
    ...(merged.salarySacrifice !== undefined && !isContributionEmpty(merged.salarySacrifice)
      ? { salarySacrifice: merged.salarySacrifice }
      : {}),
    ...(merged.nonConcessional !== undefined && !isContributionEmpty(merged.nonConcessional)
      ? { nonConcessional: merged.nonConcessional }
      : {}),
    ...(merged.earningsTaxRate !== undefined ? { earningsTaxRate: merged.earningsTaxRate } : {}),
  };

  const { superAccount: previousAccount, ...personWithoutAccount } = person;
  void previousAccount;
  const updatedPerson: Person =
    Object.keys(account).length === 0
      ? personWithoutAccount
      : { ...personWithoutAccount, superAccount: account };

  return {
    ...plan,
    household: {
      ...plan.household,
      people: plan.household.people.map((candidate) =>
        candidate.id === personId ? updatedPerson : candidate,
      ),
    },
  };
}

/** True when a voluntary contribution has none of its fields set. Used to tidy up empty ones. */
function isContributionEmpty(contribution: SuperContribution): boolean {
  return (
    contribution.annual === undefined &&
    contribution.fromYear === undefined &&
    contribution.toYear === undefined
  );
}

/**
 * Sets one field of a person's salary sacrifice or non-concessional
 * contribution (or clears it with `undefined`), keeping `toYear >= fromYear`
 * the way dated expenses do: moving "From" past "To" raises "To" to match, and
 * a "To" typed before "From" is raised to "From". When either year is unset
 * there is nothing to compare, so nothing is adjusted. Used by the
 * contribution actions.
 */
function updateContribution(
  plan: Plan,
  personId: string,
  which: "salarySacrifice" | "nonConcessional",
  field: keyof SuperContribution,
  value: number | undefined,
): Plan {
  return updateSuperAccount(plan, personId, (account) => {
    const changed: SuperContribution = { ...account[which], [field]: value };

    const needsToYearRaised =
      changed.fromYear !== undefined &&
      changed.toYear !== undefined &&
      changed.toYear < changed.fromYear;

    return { [which]: needsToYearRaised ? { ...changed, toYear: changed.fromYear } : changed };
  });
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
