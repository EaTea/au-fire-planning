import { describe, expect, it } from "vitest";

import { createNewPlan } from "./createNewPlan";
import { resolvePlanInputs } from "./resolvePlanInputs";
import type { Person, Plan } from "./types";

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
      endAge: { value: 95, source: "default" },
      interestRate: { value: 0.04, source: "default" },
      datedExpenses: [],
      salaryAnnual: { value: 0, source: "default" },
      salaryGrowth: { value: { kind: "inflationPlus", margin: 0 }, source: "default" },
      superAccount: {
        balance: { value: 0, source: "default" },
        returnRate: { value: 0.07, source: "default" },
        employerRate: { value: undefined, source: "rule" },
        salarySacrifice: { annual: { value: 0, source: "default" } },
        nonConcessional: { annual: { value: 0, source: "default" } },
        earningsTaxRate: { value: undefined, source: "rule" },
      },
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

// Tests for the M3 inputs: end age, cash, interest and dated expenses.
describe("resolvePlanInputs: drawdown inputs", () => {
  /** A plan with ages 34 and 50, living expenses, and the M3 fields from the overrides. */
  function planWithDrawdownInputs(overrides: {
    currentAge?: number;
    targetRetirementAge?: number;
    projectionEndAge?: number;
    cashBalance?: number;
    interestRate?: number;
    datedExpenses?: Plan["expenses"]["datedExpenses"];
  }): Plan {
    const blank = blankPlan();
    const [person] = blank.household.people;
    if (person === undefined) throw new Error("blank plan is empty");

    return {
      ...blank,
      household: {
        people: [
          {
            ...person,
            currentAge: overrides.currentAge ?? 34,
            targetRetirementAge: overrides.targetRetirementAge ?? 50,
          },
        ],
        projectionEndAge: overrides.projectionEndAge,
      },
      cash: { balance: overrides.cashBalance },
      expenses: { livingAnnual: 64000, datedExpenses: overrides.datedExpenses },
      assumptions: { interestRate: overrides.interestRate },
    };
  }

  /** Resolves a plan known to be complete overall. */
  function resolved(plan: Plan) {
    const result = resolvePlanInputs(plan);
    if (result.status !== "complete") throw new Error("expected complete");
    return result.inputs;
  }

  it("defaults cash to $0", () => {
    expect(resolved(planWithDrawdownInputs({})).cashBalance).toEqual({
      value: 0,
      source: "default",
    });
  });

  it("keeps an entered cash balance, interest rate and end age", () => {
    const inputs = resolved(
      planWithDrawdownInputs({ cashBalance: 20000, interestRate: 0.03, projectionEndAge: 90 }),
    );
    const projection = inputs.projection;

    expect(inputs.cashBalance).toEqual({ value: 20000, source: "input" });
    expect(projection.status).toBe("complete");
    if (projection.status !== "complete") return;
    expect(projection.inputs.interestRate).toEqual({ value: 0.03, source: "input" });
    expect(projection.inputs.endAge).toEqual({ value: 90, source: "input" });
  });

  // An amount left blank counts as $0, and is marked as defaulted so the UI can show it dashed.
  it("resolves dated expenses, with an unset amount counting as $0", () => {
    const projection = resolved(
      planWithDrawdownInputs({
        datedExpenses: [
          { id: "a", name: "Replace car", annual: 30000, fromYear: 2028, toYear: 2028 },
          { id: "b", name: "", fromYear: 2029, toYear: 2030 },
        ],
      }),
    ).projection;

    expect(projection.status).toBe("complete");
    if (projection.status !== "complete") return;
    expect(projection.inputs.datedExpenses).toEqual([
      {
        id: "a",
        name: "Replace car",
        annual: { value: 30000, source: "input" },
        fromYear: 2028,
        toYear: 2028,
      },
      { id: "b", name: "", annual: { value: 0, source: "default" }, fromYear: 2029, toYear: 2030 },
    ]);
  });

  it("reports an end age that isn't after the current age", () => {
    expect(
      resolved(
        planWithDrawdownInputs({ currentAge: 40, targetRetirementAge: 40, projectionEndAge: 40 }),
      ).projection,
    ).toMatchObject({
      status: "incomplete",
      missing: expect.arrayContaining([
        { field: "projectionEndAge", label: "Plan until age must be after your current age" },
      ]),
    });
  });

  it("reports a target retirement age that isn't before the end age", () => {
    expect(
      resolved(planWithDrawdownInputs({ targetRetirementAge: 90, projectionEndAge: 90 }))
        .projection,
    ).toEqual({
      status: "incomplete",
      missing: [
        {
          field: "targetRetirementAge",
          label: "Target retirement age must be before your plan-until age",
        },
      ],
    });
  });

  it("accepts a retirement age one year before the end age", () => {
    expect(
      resolved(planWithDrawdownInputs({ targetRetirementAge: 89, projectionEndAge: 90 })).projection
        .status,
    ).toBe("complete");
  });
});

// Tests for the salary inputs (IN-7).
describe("resolvePlanInputs: salary", () => {
  /** Resolves a plan with ages and the given salary, returning the projection inputs. */
  function resolveWithSalary(salary: Person["salary"]) {
    const blank = blankPlan();
    const [person] = blank.household.people;
    if (person === undefined) throw new Error("blank plan is empty");

    const resolved = resolvePlanInputs({
      ...blank,
      household: {
        people: [{ ...person, currentAge: 40, targetRetirementAge: 50, salary }],
      },
      expenses: { livingAnnual: 50000 },
    });
    if (resolved.status !== "complete" || resolved.inputs.projection.status !== "complete") {
      throw new Error("expected a complete plan");
    }

    return resolved.inputs.projection.inputs;
  }

  it("defaults to no salary, growing with inflation", () => {
    const inputs = resolveWithSalary(undefined);

    expect(inputs.salaryAnnual).toEqual({ value: 0, source: "default" });
    expect(inputs.salaryGrowth).toEqual({
      value: { kind: "inflationPlus", margin: 0 },
      source: "default",
    });
  });

  it("uses the entered salary and growth", () => {
    const inputs = resolveWithSalary({ annual: 145000, growth: { kind: "fixed", rate: 0.03 } });

    expect(inputs.salaryAnnual).toEqual({ value: 145000, source: "input" });
    expect(inputs.salaryGrowth).toEqual({ value: { kind: "fixed", rate: 0.03 }, source: "input" });
  });
});

// Tests for the super account inputs (IN-21 to IN-23).
describe("resolvePlanInputs: super account", () => {
  /** Resolves a plan with ages and the given super account, returning the resolved account. */
  function resolveWithSuper(superAccount: Person["superAccount"]) {
    const blank = blankPlan();
    const [person] = blank.household.people;
    if (person === undefined) throw new Error("blank plan is empty");

    const resolvedPlan = resolvePlanInputs({
      ...blank,
      household: {
        people: [{ ...person, currentAge: 40, targetRetirementAge: 50, superAccount }],
      },
      expenses: { livingAnnual: 50000 },
    });
    if (
      resolvedPlan.status !== "complete" ||
      resolvedPlan.inputs.projection.status !== "complete"
    ) {
      throw new Error("expected a complete plan");
    }

    return resolvedPlan.inputs.projection.inputs.superAccount;
  }

  it("defaults: $0, 7% net of fees, and the employer and earnings tax rates left to the law", () => {
    const account = resolveWithSuper(undefined);

    expect(account.balance).toEqual({ value: 0, source: "default" });
    expect(account.returnRate).toEqual({ value: 0.07, source: "default" });
    expect(account.employerRate).toEqual({ value: undefined, source: "rule" });
    expect(account.earningsTaxRate).toEqual({ value: undefined, source: "rule" });
    expect(account.salarySacrifice.annual).toEqual({ value: 0, source: "default" });
    expect(account.salarySacrifice.fromYear).toBeUndefined();
    expect(account.nonConcessional.toYear).toBeUndefined();
  });

  it("uses what was entered, with source input, and keeps the years", () => {
    const account = resolveWithSuper({
      balance: 185000,
      returnRate: 0.06,
      employerRate: 0.1,
      earningsTaxRate: 0.1,
      salarySacrifice: { annual: 10000, fromYear: 2027, toYear: 2042 },
      nonConcessional: { annual: 5000 },
    });

    expect(account.balance).toEqual({ value: 185000, source: "input" });
    expect(account.returnRate).toEqual({ value: 0.06, source: "input" });
    expect(account.employerRate).toEqual({ value: 0.1, source: "input" });
    expect(account.earningsTaxRate).toEqual({ value: 0.1, source: "input" });
    expect(account.salarySacrifice).toEqual({
      annual: { value: 10000, source: "input" },
      fromYear: 2027,
      toYear: 2042,
    });
    expect(account.nonConcessional).toEqual({ annual: { value: 5000, source: "input" } });
  });
});
