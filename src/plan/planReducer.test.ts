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
});
