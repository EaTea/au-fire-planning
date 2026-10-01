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

// Tests for the projection inputs resolved alongside M1's.
describe("resolvePlanInputs: projection inputs", () => {
  /** A plan with living expenses and the given ages and overrides. */
  function planWithAges(
    currentAge: number | undefined,
    targetRetirementAge: number | undefined,
    portfolioOverrides: Partial<Plan["portfolios"][number]> = {},
    inflationRate?: number,
  ): Plan {
    const blank = blankPlan();
    const [person] = blank.household.people;
    const [portfolio] = blank.portfolios;
    if (person === undefined || portfolio === undefined) throw new Error("blank plan is empty");

    return {
      ...blank,
      household: { people: [{ ...person, currentAge, targetRetirementAge }] },
      expenses: { livingAnnual: 64000 },
      assumptions: { inflationRate },
      portfolios: [{ ...portfolio, ...portfolioOverrides }],
    };
  }

  /** The projection part of a resolved plan that is complete overall. */
  function projectionOf(plan: Plan) {
    const resolved = resolvePlanInputs(plan);
    if (resolved.status !== "complete") throw new Error("expected complete");
    return resolved.inputs.projection;
  }

  // Ages have no default, so they are reported rather than guessed, without blocking M1's figures.
  it("reports missing ages on the projection only", () => {
    const resolved = resolvePlanInputs(planWithAges(undefined, undefined));

    expect(resolved.status).toBe("complete");
    expect(projectionOf(planWithAges(undefined, undefined))).toEqual({
      status: "incomplete",
      missing: [
        { field: "currentAge", label: "Current age" },
        { field: "targetRetirementAge", label: "Target retirement age" },
      ],
    });
  });

  // A retirement age before today's age makes no sense.
  it("reports a target retirement age below the current age", () => {
    expect(projectionOf(planWithAges(50, 45))).toEqual({
      status: "incomplete",
      missing: [
        {
          field: "targetRetirementAge",
          label: "Target retirement age must be at or after your current age",
        },
      ],
    });
  });

  // Retiring this year is allowed.
  it("accepts a target retirement age equal to the current age", () => {
    expect(projectionOf(planWithAges(50, 50)).status).toBe("complete");
  });

  // Defaults: 2.5% inflation, 7% return, $0 contribution, stop age = retirement age.
  it("fills in defaults, with the stop age defaulting to the retirement age", () => {
    const projection = projectionOf(planWithAges(34, 50));

    expect(projection.status).toBe("complete");
    if (projection.status !== "complete") return;
    expect(projection.inputs).toEqual({
      currentAge: { value: 34, source: "input" },
      targetRetirementAge: { value: 50, source: "input" },
      inflationRate: { value: 0.025, source: "default" },
      expectedReturn: { value: 0.07, source: "default" },
      annualContribution: { value: 0, source: "default" },
      contributionsStopAge: { value: 50, source: "default" },
    });
  });

  // Entered values win and are marked as input.
  it("keeps entered values", () => {
    const projection = projectionOf(
      planWithAges(
        34,
        50,
        { expectedReturn: 0.05, annualContribution: 12000, contributionsStopAge: 45 },
        0.03,
      ),
    );

    expect(projection.status).toBe("complete");
    if (projection.status !== "complete") return;
    expect(projection.inputs.inflationRate).toEqual({ value: 0.03, source: "input" });
    expect(projection.inputs.expectedReturn).toEqual({ value: 0.05, source: "input" });
    expect(projection.inputs.annualContribution).toEqual({ value: 12000, source: "input" });
    expect(projection.inputs.contributionsStopAge).toEqual({ value: 45, source: "input" });
  });
});
