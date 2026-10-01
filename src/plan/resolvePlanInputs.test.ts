import { describe, expect, it } from "vitest";

import { createNewPlan } from "./createNewPlan";
import { resolvePlanInputs } from "./resolvePlanInputs";
import type { Plan } from "./types";

/** A blank plan with predictable IDs, for tests to build on. */
function blankPlan(): Plan {
  let counter = 0;
  return createNewPlan(() => `id-${++counter}`);
}

// Tests for how a plan of user-entered values becomes complete engine inputs.
describe("resolvePlanInputs", () => {
  // Living expenses have no default, so an unset value must be reported, not guessed.
  it("reports missing living expenses as incomplete", () => {
    expect(resolvePlanInputs(blankPlan())).toEqual({
      status: "incomplete",
      missing: [{ field: "livingExpenses", label: "Living expenses" }],
    });
  });

  // Unset values with a default (4%, 100% of today, $0) are filled in and marked as defaults.
  it("fills in defaults for unset values and marks them as defaults", () => {
    const plan: Plan = { ...blankPlan(), expenses: { livingAnnual: 64000 } };

    const resolved = resolvePlanInputs(plan);

    expect(resolved.status).toBe("complete");
    if (resolved.status !== "complete") return;
    expect(resolved.inputs.livingAnnual).toEqual({ value: 64000, source: "input" });
    expect(resolved.inputs.retirementSpending).toEqual({
      value: { kind: "percentOfToday", fraction: 1 },
      source: "default",
    });
    expect(resolved.inputs.safeWithdrawalRate).toEqual({ value: 0.04, source: "default" });
    expect(resolved.inputs.portfolios[0]?.value).toEqual({ value: 0, source: "default" });
  });

  // Values the user did set must win over the defaults and be marked as input.
  it("keeps values the user entered", () => {
    const plan: Plan = {
      ...blankPlan(),
      expenses: {
        livingAnnual: 60000,
        retirementSpending: { kind: "amount", annual: 50000 },
      },
      assumptions: { safeWithdrawalRate: 0.035 },
      portfolios: [{ id: "p", name: "Shares", value: 100000 }],
    };

    const resolved = resolvePlanInputs(plan);

    expect(resolved.status).toBe("complete");
    if (resolved.status !== "complete") return;
    expect(resolved.inputs.retirementSpending).toEqual({
      value: { kind: "amount", annual: 50000 },
      source: "input",
    });
    expect(resolved.inputs.safeWithdrawalRate).toEqual({ value: 0.035, source: "input" });
    expect(resolved.inputs.portfolios[0]?.value).toEqual({ value: 100000, source: "input" });
  });

  // $0 is a real answer, not "unset": it must not be replaced by the default.
  it("treats an entered zero as input, not as unset", () => {
    const plan: Plan = {
      ...blankPlan(),
      expenses: { livingAnnual: 0 },
      portfolios: [{ id: "p", name: "Shares", value: 0 }],
    };

    const resolved = resolvePlanInputs(plan);

    expect(resolved.status).toBe("complete");
    if (resolved.status !== "complete") return;
    expect(resolved.inputs.livingAnnual.source).toBe("input");
    expect(resolved.inputs.portfolios[0]?.value.source).toBe("input");
  });
});
