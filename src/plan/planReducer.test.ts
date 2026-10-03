import { describe, expect, it } from "vitest";

import { createNewPlan } from "./createNewPlan";
import { planReducer } from "./planReducer";
import type { Plan } from "./types";

// Builds a blank plan with predictable ids: person "person-1", portfolio "portfolio-1".
function buildBlankPlan(): Plan {
  const ids = ["person-1", "portfolio-1"];
  return createNewPlan(() => ids.shift() ?? "extra");
}

// Tests for the pure reducer that is the only way the plan changes.
describe("planReducer", () => {
  // Living expenses are stored in the expenses section.
  it("sets living expenses", () => {
    const plan = planReducer(buildBlankPlan(), { type: "setLivingExpenses", annual: 64000 });

    expect(plan.expenses.livingAnnual).toBe(64000);
  });

  // Passing undefined must clear back to "unset" so the default applies again.
  it("clears living expenses back to unset", () => {
    const withValue = planReducer(buildBlankPlan(), { type: "setLivingExpenses", annual: 64000 });
    const cleared = planReducer(withValue, { type: "setLivingExpenses" });

    expect(cleared.expenses.livingAnnual).toBeUndefined();
  });

  // Both retirement-spending forms are stored as given, and clearing restores the default.
  it("sets and clears retirement spending", () => {
    const withPercent = planReducer(buildBlankPlan(), {
      type: "setRetirementSpending",
      spending: { kind: "percentOfToday", fraction: 0.9 },
    });
    expect(withPercent.expenses.retirementSpending).toEqual({
      kind: "percentOfToday",
      fraction: 0.9,
    });

    const withAmount = planReducer(withPercent, {
      type: "setRetirementSpending",
      spending: { kind: "amount", annual: 50000 },
    });
    expect(withAmount.expenses.retirementSpending).toEqual({ kind: "amount", annual: 50000 });

    const cleared = planReducer(withAmount, { type: "setRetirementSpending" });
    expect(cleared.expenses.retirementSpending).toBeUndefined();
  });

  // The rate lives in assumptions and clears to unset.
  it("sets and clears the safe withdrawal rate", () => {
    const withRate = planReducer(buildBlankPlan(), { type: "setSafeWithdrawalRate", rate: 0.035 });
    expect(withRate.assumptions.safeWithdrawalRate).toBe(0.035);

    const cleared = planReducer(withRate, { type: "setSafeWithdrawalRate" });
    expect(cleared.assumptions.safeWithdrawalRate).toBeUndefined();
  });

  // Only the named portfolio changes; clearing returns it to unset (default $0).
  it("sets and clears a portfolio's value", () => {
    const withValue = planReducer(buildBlankPlan(), {
      type: "setPortfolioValue",
      portfolioId: "portfolio-1",
      value: 720000,
    });
    expect(withValue.portfolios[0]?.value).toBe(720000);

    const cleared = planReducer(withValue, {
      type: "setPortfolioValue",
      portfolioId: "portfolio-1",
    });
    expect(cleared.portfolios[0]?.value).toBeUndefined();
  });

  // Renaming changes the name and keeps the id and value.
  it("renames a portfolio", () => {
    const withValue = planReducer(buildBlankPlan(), {
      type: "setPortfolioValue",
      portfolioId: "portfolio-1",
      value: 100,
    });
    const renamed = planReducer(withValue, {
      type: "renamePortfolio",
      portfolioId: "portfolio-1",
      name: "My ETFs",
    });

    expect(renamed.portfolios[0]).toEqual({ id: "portfolio-1", name: "My ETFs", value: 100 });
  });

  // An unknown portfolio id must not change any portfolio.
  it("ignores portfolio actions for an unknown portfolio id", () => {
    const before = buildBlankPlan();
    const afterValue = planReducer(before, {
      type: "setPortfolioValue",
      portfolioId: "nope",
      value: 5,
    });
    const afterRename = planReducer(before, {
      type: "renamePortfolio",
      portfolioId: "nope",
      name: "X",
    });

    expect(afterValue.portfolios).toEqual(before.portfolios);
    expect(afterRename.portfolios).toEqual(before.portfolios);
  });

  // replacePlan is how a saved plan is loaded: the new plan wholly replaces the old.
  it("replaces the whole plan", () => {
    const replacement: Plan = {
      household: { people: [{ id: "p", label: "Person 1" }] },
      expenses: { livingAnnual: 1 },
      assumptions: {},
      portfolios: [{ id: "q", name: "Loaded" }],
    };

    expect(planReducer(buildBlankPlan(), { type: "replacePlan", plan: replacement })).toBe(
      replacement,
    );
  });

  // Plans are shared by React and the engine, so the reducer must never edit one in place.
  it("returns a new plan and does not mutate the input", () => {
    const before = buildBlankPlan();
    const snapshot = structuredClone(before);

    const after = planReducer(before, { type: "setLivingExpenses", annual: 64000 });
    planReducer(before, { type: "setPortfolioValue", portfolioId: "portfolio-1", value: 1 });
    planReducer(before, { type: "renamePortfolio", portfolioId: "portfolio-1", name: "Z" });

    expect(after).not.toBe(before);
    expect(before).toEqual(snapshot);
  });

  // Each person action sets its field on the named person, and `undefined` clears it.
  it.each([
    ["setCurrentAge", "currentAge"],
    ["setTargetRetirementAge", "targetRetirementAge"],
  ] as const)("%s sets and clears %s on the named person", (type, field) => {
    const set = planReducer(buildBlankPlan(), { type, personId: "person-1", age: 34 });
    expect(set.household.people[0]?.[field]).toBe(34);

    const cleared = planReducer(set, { type, personId: "person-1" });
    expect(cleared.household.people[0]?.[field]).toBeUndefined();
  });

  // Salary actions edit the named person's salary and tidy up when it is empty.
  it("sets and clears the salary and its growth on the named person", () => {
    const withSalary = planReducer(buildBlankPlan(), {
      type: "setSalary",
      personId: "person-1",
      annual: 145000,
    });
    expect(withSalary.household.people[0]?.salary).toEqual({ annual: 145000 });

    const withGrowth = planReducer(withSalary, {
      type: "setSalaryGrowth",
      personId: "person-1",
      growth: { kind: "fixed", rate: 0.03 },
    });
    expect(withGrowth.household.people[0]?.salary).toEqual({
      annual: 145000,
      growth: { kind: "fixed", rate: 0.03 },
    });

    const growthCleared = planReducer(withGrowth, {
      type: "setSalaryGrowth",
      personId: "person-1",
    });
    expect(growthCleared.household.people[0]?.salary).toEqual({ annual: 145000 });

    // Clearing the last field removes the salary entirely.
    const allCleared = planReducer(growthCleared, { type: "setSalary", personId: "person-1" });
    expect(allCleared.household.people[0]).not.toHaveProperty("salary");
  });

  it("ignores a salary for a person that doesn't exist, and leaves other fields alone", () => {
    const blank = buildBlankPlan();

    expect(planReducer(blank, { type: "setSalary", personId: "nobody", annual: 1 })).toBe(blank);

    const aged = planReducer(blank, { type: "setCurrentAge", personId: "person-1", age: 34 });
    const salaried = planReducer(aged, { type: "setSalary", personId: "person-1", annual: 1 });
    expect(salaried.household.people[0]?.currentAge).toBe(34);
  });

  // An unknown person id changes nothing.
  it("ignores an age for a person that doesn't exist", () => {
    const blank = buildBlankPlan();

    expect(planReducer(blank, { type: "setCurrentAge", personId: "nobody", age: 34 })).toEqual(
      blank,
    );
  });

  // Inflation lives in assumptions; undefined clears it.
  it("sets and clears the inflation rate", () => {
    const set = planReducer(buildBlankPlan(), { type: "setInflationRate", rate: 0.03 });
    expect(set.assumptions.inflationRate).toBe(0.03);

    expect(
      planReducer(set, { type: "setInflationRate" }).assumptions.inflationRate,
    ).toBeUndefined();
  });

  // Each portfolio action sets its field on the named portfolio, and `undefined` clears it.
  it.each([
    [{ type: "setExpectedReturn", portfolioId: "portfolio-1", rate: 0.05 }, "expectedReturn", 0.05],
    [
      { type: "setAnnualContribution", portfolioId: "portfolio-1", annual: 12000 },
      "annualContribution",
      12000,
    ],
    [
      { type: "setContributionsStopAge", portfolioId: "portfolio-1", age: 45 },
      "contributionsStopAge",
      45,
    ],
  ] as const)("%j sets %s, and clearing resets it", (action, field, expected) => {
    const set = planReducer(buildBlankPlan(), action);
    expect(set.portfolios[0]?.[field]).toBe(expected);

    const { type, portfolioId } = action;
    const cleared = planReducer(set, { type, portfolioId });
    expect(cleared.portfolios[0]?.[field]).toBeUndefined();
  });

  // An unknown portfolio id changes nothing.
  it("ignores growth settings for a portfolio that doesn't exist", () => {
    const blank = buildBlankPlan();

    expect(
      planReducer(blank, { type: "setExpectedReturn", portfolioId: "nothing", rate: 0.05 }),
    ).toEqual(blank);
  });
});

// M3 actions: end age, cash, interest and the dated expenses table.
describe("planReducer: drawdown actions", () => {
  /** A plan holding three dated expenses, ids "a", "b" and "c". */
  function buildPlanWithExpenses(): Plan {
    const blank = buildBlankPlan();

    return {
      ...blank,
      expenses: {
        datedExpenses: [
          { id: "a", name: "Car", annual: 30000, fromYear: 2028, toYear: 2028 },
          { id: "b", name: "School", annual: 10000, fromYear: 2029, toYear: 2030 },
          { id: "c", name: "Trip", fromYear: 2031, toYear: 2031 },
        ],
      },
    };
  }

  // The end age lives in the household and clears to unset (default 95).
  it("sets and clears the projection end age", () => {
    const set = planReducer(buildBlankPlan(), { type: "setProjectionEndAge", age: 90 });
    expect(set.household.projectionEndAge).toBe(90);

    const cleared = planReducer(set, { type: "setProjectionEndAge" });
    expect(cleared.household.projectionEndAge).toBeUndefined();
    expect(cleared.household.people).toEqual(set.household.people);
  });

  // The cash balance is stored under `cash` and clears to unset (default $0).
  it("sets and clears the cash balance", () => {
    const set = planReducer(buildBlankPlan(), { type: "setCashBalance", balance: 20000 });
    expect(set.cash?.balance).toBe(20000);

    const cleared = planReducer(set, { type: "setCashBalance" });
    expect(cleared.cash?.balance).toBeUndefined();
  });

  // The interest rate lives in assumptions and clears to unset (default 4%).
  it("sets and clears the interest rate", () => {
    const set = planReducer(buildBlankPlan(), { type: "setInterestRate", rate: 0.035 });
    expect(set.assumptions.interestRate).toBe(0.035);

    const cleared = planReducer(set, { type: "setInterestRate" });
    expect(cleared.assumptions.interestRate).toBeUndefined();
  });

  // A new row is a valid one-off in the year after the start year, with no amount yet.
  it("adds a dated expense as a one-off in the year after the start year", () => {
    const plan = planReducer(buildBlankPlan(), {
      type: "addDatedExpense",
      id: "new",
      startYear: 2026,
    });

    expect(plan.expenses.datedExpenses).toStrictEqual([
      { id: "new", name: "", fromYear: 2027, toYear: 2027 },
    ]);
  });

  // New rows go at the end of the table.
  it("appends to the existing dated expenses", () => {
    const plan = planReducer(buildPlanWithExpenses(), {
      type: "addDatedExpense",
      id: "d",
      startYear: 2026,
    });

    expect(plan.expenses.datedExpenses?.map((expense) => expense.id)).toEqual(["a", "b", "c", "d"]);
  });

  // Only the named row changes, and only the named fields.
  it("updates one dated expense's name, amount and years", () => {
    const plan = planReducer(buildPlanWithExpenses(), {
      type: "updateDatedExpense",
      id: "b",
      changes: { name: "Fees", annual: 12000, toYear: 2032 },
    });

    expect(plan.expenses.datedExpenses?.[1]).toStrictEqual({
      id: "b",
      name: "Fees",
      annual: 12000,
      fromYear: 2029,
      toYear: 2032,
    });
    expect(plan.expenses.datedExpenses?.[0]).toStrictEqual(
      buildPlanWithExpenses().expenses.datedExpenses?.[0],
    );
  });

  // Clearing the amount sets it back to unset, which counts as $0.
  it("clears a dated expense's amount", () => {
    const plan = planReducer(buildPlanWithExpenses(), {
      type: "updateDatedExpense",
      id: "a",
      changes: { annual: undefined },
    });

    expect(plan.expenses.datedExpenses?.[0]?.annual).toBeUndefined();
  });

  // Moving "From" past "To" drags "To" along, so the range stays valid.
  it("moves toYear up when fromYear passes it", () => {
    const plan = planReducer(buildPlanWithExpenses(), {
      type: "updateDatedExpense",
      id: "b",
      changes: { fromYear: 2035 },
    });

    expect(plan.expenses.datedExpenses?.[1]).toMatchObject({ fromYear: 2035, toYear: 2035 });
  });

  // Moving "From" within the range leaves "To" alone.
  it("leaves toYear alone when fromYear stays before it", () => {
    const plan = planReducer(buildPlanWithExpenses(), {
      type: "updateDatedExpense",
      id: "b",
      changes: { fromYear: 2030 },
    });

    expect(plan.expenses.datedExpenses?.[1]).toMatchObject({ fromYear: 2030, toYear: 2030 });

    const wider = planReducer(buildPlanWithExpenses(), {
      type: "updateDatedExpense",
      id: "b",
      changes: { fromYear: 2027 },
    });
    expect(wider.expenses.datedExpenses?.[1]).toMatchObject({ fromYear: 2027, toYear: 2030 });
  });

  // A "To" year typed before "From" is raised to "From" rather than breaking the invariant.
  it("raises a toYear that is set before fromYear", () => {
    const plan = planReducer(buildPlanWithExpenses(), {
      type: "updateDatedExpense",
      id: "b",
      changes: { toYear: 2020 },
    });

    expect(plan.expenses.datedExpenses?.[1]).toMatchObject({ fromYear: 2029, toYear: 2029 });
  });

  // The copy has the same content, a new id, and sits right after the original.
  it("duplicates a dated expense, inserting the copy after the original", () => {
    const plan = planReducer(buildPlanWithExpenses(), {
      type: "duplicateDatedExpense",
      id: "a",
      newId: "a-copy",
    });

    expect(plan.expenses.datedExpenses?.map((expense) => expense.id)).toEqual([
      "a",
      "a-copy",
      "b",
      "c",
    ]);
    expect(plan.expenses.datedExpenses?.[1]).toStrictEqual({
      id: "a-copy",
      name: "Car",
      annual: 30000,
      fromYear: 2028,
      toYear: 2028,
    });
  });

  // Removing deletes only the named row; removing the last leaves an empty list.
  it("removes a dated expense", () => {
    const plan = planReducer(buildPlanWithExpenses(), { type: "removeDatedExpense", id: "b" });
    expect(plan.expenses.datedExpenses?.map((expense) => expense.id)).toEqual(["a", "c"]);

    const emptied = planReducer(planReducer(plan, { type: "removeDatedExpense", id: "a" }), {
      type: "removeDatedExpense",
      id: "c",
    });
    expect(emptied.expenses.datedExpenses).toEqual([]);
  });

  // Unknown ids change nothing.
  it("ignores update, duplicate and remove for an id that doesn't exist", () => {
    const plan = buildPlanWithExpenses();

    expect(
      planReducer(plan, { type: "updateDatedExpense", id: "zzz", changes: { name: "x" } }),
    ).toEqual(plan);
    expect(planReducer(plan, { type: "duplicateDatedExpense", id: "zzz", newId: "n" })).toEqual(
      plan,
    );
    expect(planReducer(plan, { type: "removeDatedExpense", id: "zzz" })).toEqual(plan);
  });
});
