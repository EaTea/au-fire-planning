import { describe, expect, it } from "vitest";

import { createNewPlan } from "./createNewPlan";
import { isBlankPlan } from "./isBlankPlan";
import { planReducer } from "./planReducer";

/** A fresh plan with predictable ids, as the tests below edit it by id. */
function freshPlan() {
  let counter = 0;
  return createNewPlan(() => `id-${++counter}`);
}

// Tests for the check that lets "Start over" skip its confirmation.
describe("isBlankPlan", () => {
  // Every new plan is blank, whatever ids it was given.
  it("is true for a new plan", () => {
    expect(isBlankPlan(freshPlan())).toBe(true);
    expect(isBlankPlan(createNewPlan(() => crypto.randomUUID()))).toBe(true);
  });

  // Any entered value is something the user would lose.
  it("is false once a value is entered", () => {
    const plan = planReducer(freshPlan(), { type: "setLivingExpenses", annual: 50_000 });

    expect(isBlankPlan(plan)).toBe(false);
  });

  // An age counts too, though it lives on the person rather than the plan.
  it("is false once an age is entered", () => {
    const plan = planReducer(freshPlan(), { type: "setCurrentAge", personId: "id-1", age: 35 });

    expect(isBlankPlan(plan)).toBe(false);
  });

  // Renaming the default portfolio is an edit, even with no amount.
  it("is false once the portfolio is renamed", () => {
    const plan = planReducer(freshPlan(), {
      type: "renamePortfolio",
      portfolioId: "id-2",
      name: "ETFs",
    });

    expect(isBlankPlan(plan)).toBe(false);
  });

  // A dated expense row is an edit, even before its amount is filled in.
  it("is false once a dated expense is added", () => {
    const plan = planReducer(freshPlan(), {
      type: "addDatedExpense",
      id: "expense-1",
      startYear: 2026,
    });

    expect(isBlankPlan(plan)).toBe(false);
  });

  // Clearing a value or removing the only row leaves nothing to lose.
  it("is true again once entries are cleared or removed", () => {
    let plan = planReducer(freshPlan(), { type: "setLivingExpenses", annual: 50_000 });
    plan = planReducer(plan, { type: "setLivingExpenses", annual: undefined });
    plan = planReducer(plan, { type: "addDatedExpense", id: "expense-1", startYear: 2026 });
    plan = planReducer(plan, { type: "removeDatedExpense", id: "expense-1" });

    expect(isBlankPlan(plan)).toBe(true);
  });
});
