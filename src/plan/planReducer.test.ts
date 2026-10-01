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
