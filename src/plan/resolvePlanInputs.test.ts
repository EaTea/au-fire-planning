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

  /** Example A's plan with a second person, Sam, added after Person 1. */
  function planWithTwoPeople(sam: { currentAge?: number; targetRetirementAge?: number }): Plan {
    const plan = planWithAges(34, 50);
    const [person] = plan.household.people;
    if (person === undefined) throw new Error("blank plan is empty");

    return {
      ...plan,
      household: {
        people: [
          person,
          { id: "person-2", label: "Person 2", name: "Sam", ...sam, superAccessAge: 60 },
        ],
      },
    };
  }

  // Every person is resolved, in order, and the portfolio is owned by the first.
  it("resolves every person, in the plan's order", () => {
    const projection = projectionOf(planWithTwoPeople({ currentAge: 32, targetRetirementAge: 52 }));
    if (projection.status !== "complete") throw new Error("expected complete");

    expect(projection.inputs.people.map((person) => person.id)).toEqual(["id-1", "person-2"]);
    expect(projection.inputs.people[1]?.currentAge).toEqual({ value: 32, source: "input" });
    expect(projection.inputs.people[1]?.superAccessAge).toEqual({ value: 60, source: "input" });
    // With nothing stored, a couple jointly owns the portfolio.
    expect(projection.inputs.portfolioOwnerIds).toEqual(["id-1", "person-2"]);
    expect(projection.inputs.people.map((person) => person.label)).toEqual(["Person 1", "Sam"]);
  });

  // With several people a message names whose input is missing; the one-person labels never change.
  it("names the person in a missing-input message when there are two", () => {
    expect(projectionOf(planWithTwoPeople({}))).toEqual({
      status: "incomplete",
      missing: [
        { field: "currentAge", label: "Sam: Current age" },
        { field: "targetRetirementAge", label: "Sam: Target retirement age" },
      ],
    });
  });

  // The plan-until age is the youngest person's, so the older person's last age is that many years later.
  it("checks each retirement age against that person's own last age", () => {
    // Plan until 95 on the youngest (Sam, 32): Person 1 (34) is 97 in the last row.
    expect(projectionOf(planWithTwoPeople({ currentAge: 32, targetRetirementAge: 95 }))).toEqual({
      status: "incomplete",
      missing: [
        {
          field: "targetRetirementAge",
          label: "Sam: Target retirement age must be before the end of the plan, when Sam is 95",
        },
      ],
    });
  });

  // Regression: an unset current age must not hide the retirement-versus-plan-until message.
  it("still compares the retirement age with the plan-until age when the current age is unset", () => {
    const plan = {
      ...planWithAges(undefined, 60),
      household: { ...planWithAges(undefined, 60).household, projectionEndAge: 40 },
    };

    expect(projectionOf(plan)).toEqual({
      status: "incomplete",
      missing: [
        { field: "currentAge", label: "Current age" },
        {
          field: "targetRetirementAge",
          label: "Target retirement age must be before your plan-until age",
        },
      ],
    });
  });

  // The wording names the person ("Sam's"), where one person's reads "your".
  it("words a couple's retirement-before-today message with the person's name", () => {
    expect(projectionOf(planWithTwoPeople({ currentAge: 40, targetRetirementAge: 38 }))).toEqual({
      status: "incomplete",
      missing: [
        {
          field: "targetRetirementAge",
          label: "Sam: Target retirement age must be at or after Sam's current age",
        },
      ],
    });
  });

  it("words the plan-until message for a couple as the younger person's age", () => {
    const plan = planWithTwoPeople({ currentAge: 32, targetRetirementAge: 40 });

    expect(
      projectionOf({ ...plan, household: { ...plan.household, projectionEndAge: 30 } }),
    ).toMatchObject({
      status: "incomplete",
      missing: expect.arrayContaining([
        {
          field: "projectionEndAge",
          label: "Plan until age must be after the younger person's current age",
        },
      ]),
    });
  });

  // Ownership decides who the portfolio's contributions follow (IN-14, part).
  it.each([
    ["sole Person 2", { kind: "sole", personId: "person-2" }, ["person-2"]],
    [
      "joint",
      {
        kind: "joint",
        shares: [
          { personId: "person-2", fraction: 0.5 },
          { personId: "id-1", fraction: 0.5 },
        ],
      },
      ["id-1", "person-2"],
    ],
    [
      "a joint share of 0% (not an owner)",
      {
        kind: "joint",
        shares: [
          { personId: "id-1", fraction: 1 },
          { personId: "person-2", fraction: 0 },
        ],
      },
      ["id-1"],
    ],
    ["an id that isn't in the plan", { kind: "sole", personId: "gone" }, ["id-1"]],
  ] as const)(
    "resolves %s ownership to the owners, in the plan's order",
    (_name, ownership, owners) => {
      const plan = planWithTwoPeople({ currentAge: 32, targetRetirementAge: 52 });
      const projection = projectionOf({
        ...plan,
        portfolios: [{ ...plan.portfolios[0]!, ownership }],
      });
      if (projection.status !== "complete") throw new Error("expected complete");

      expect(projection.inputs.portfolioOwnerIds).toEqual(owners);
    },
  );

  /**
   * The resolved interim amount for example A's plan plus Sam, after `changes`.
   * Person 1 (34, retiring at 50) has 16 years to go; by default Sam (32,
   * retiring at 52) has 20, so Sam is the later-retiring partner.
   */
  function resolvedInterim(
    changes: (plan: Plan) => Plan,
    sam: { currentAge: number; targetRetirementAge: number } = {
      currentAge: 32,
      targetRetirementAge: 52,
    },
  ) {
    const projection = projectionOf(changes(planWithTwoPeople(sam)));
    if (projection.status !== "complete") throw new Error("expected complete");
    return projection.inputs.interimAnnual;
  }

  /** The plan with one person given a salary, to tell the later partner's pay apart. */
  function withSalary(plan: Plan, personIndex: number, annual: number): Plan {
    return {
      ...plan,
      household: {
        people: plan.household.people.map((person, index) =>
          index === personIndex ? { ...person, salary: { annual } } : person,
        ),
      },
    };
  }

  it("resolves an entered interim amount as an input, and $0 entered stays $0", () => {
    expect(
      resolvedInterim((plan) => ({
        ...plan,
        expenses: { ...plan.expenses, interimAnnual: 20000 },
      })),
    ).toEqual({ value: 20000, source: "input" });
    expect(
      resolvedInterim((plan) => ({ ...plan, expenses: { ...plan.expenses, interimAnnual: 0 } })),
    ).toEqual({ value: 0, source: "input" });
  });

  it("defaults to the retirement spending when the later-retiring partner has no salary", () => {
    // Sam retires later and has no salary.
    const interim = resolvedInterim((plan) => ({
      ...plan,
      expenses: {
        ...plan.expenses,
        livingAnnual: 50000,
        retirementSpending: { kind: "amount", annual: 40000 },
      },
    }));

    expect(interim).toEqual({ value: 40000, source: "default" });
  });

  it("follows a percent retirement spending, as a share of living expenses", () => {
    const interim = resolvedInterim((plan) => ({
      ...plan,
      expenses: {
        ...plan.expenses,
        livingAnnual: 50000,
        retirementSpending: { kind: "percentOfToday", fraction: 0.8 },
      },
    }));

    expect(interim).toEqual({ value: 40000, source: "default" });
  });

  it("defaults to $0 when the later-retiring partner has a salary", () => {
    const interim = resolvedInterim((plan) =>
      withSalary(
        {
          ...plan,
          expenses: {
            ...plan.expenses,
            livingAnnual: 50000,
            retirementSpending: { kind: "amount", annual: 40000 },
          },
        },
        1,
        90000,
      ),
    );

    expect(interim).toEqual({ value: 0, source: "default" });
  });

  // A stop age is an age of the first owner; one before their age today can't happen.
  it("reports a stop age before the first owner's current age", () => {
    expect(projectionOf(planWithAges(50, 55, { contributionsStopAge: 45 }))).toEqual({
      status: "incomplete",
      missing: [
        {
          field: "contributionsStopAge",
          label: "Contributions stop age must be at or after your current age",
        },
      ],
    });
  });

  it("accepts a stop age equal to the current age", () => {
    expect(projectionOf(planWithAges(50, 55, { contributionsStopAge: 50 })).status).toBe(
      "complete",
    );
  });

  it("names the first owner in a couple's stop-age message", () => {
    const plan = planWithTwoPeople({ currentAge: 32, targetRetirementAge: 52 });
    const projection = projectionOf({
      ...plan,
      portfolios: [
        {
          ...plan.portfolios[0]!,
          ownership: { kind: "sole", personId: "person-2" },
          contributionsStopAge: 30,
        },
      ],
    });

    expect(projection).toEqual({
      status: "incomplete",
      missing: [
        {
          field: "contributionsStopAge",
          label: "Contributions stop age must be at or after Sam's current age",
        },
      ],
    });
  });

  // Retiring this year is allowed.
  it("accepts a target retirement age equal to the current age", () => {
    expect(projectionOf(planWithAges(50, 50)).status).toBe("complete");
  });

  // Defaults: 2.5% inflation, 7% return, $0 contribution, stop age = retirement age.
  it("fills in defaults, with the stop age left unset (contributions follow the owners' work)", () => {
    const projection = projectionOf(planWithAges(34, 50));

    expect(projection.status).toBe("complete");
    if (projection.status !== "complete") return;
    expect(projection.inputs).toEqual({
      people: [
        {
          id: "id-1",
          label: "Person 1",
          currentAge: { value: 34, source: "input" },
          targetRetirementAge: { value: 50, source: "input" },
          salaryAnnual: { value: 0, source: "default" },
          salaryGrowth: { value: { kind: "none" }, source: "default" },
          superAccount: {
            balance: { value: 0, source: "default" },
            returnRate: { value: 0.07, source: "default" },
            employerRate: { value: undefined, source: "rule" },
            salarySacrifice: { annual: { value: 0, source: "default" } },
            nonConcessional: { annual: { value: 0, source: "default" } },
            earningsTaxRate: { value: undefined, source: "rule" },
          },
          superAccessAge: { value: undefined, source: "rule" },
        },
      ],
      portfolioOwnerIds: ["id-1"],
      interimAnnual: { value: 0, source: "default" },
      inflationRate: { value: 0.025, source: "default" },
      expectedReturn: { value: 0.07, source: "default" },
      annualContribution: { value: 0, source: "default" },
      contributionsStopAge: { value: undefined, source: "default" },
      endAge: { value: 95, source: "default" },
      interestRate: { value: 0.04, source: "default" },
      datedExpenses: [],
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

    return resolved.inputs.projection.inputs.people[0];
  }

  it("defaults to no salary, with no growth", () => {
    const inputs = resolveWithSalary(undefined);

    expect(inputs.salaryAnnual).toEqual({ value: 0, source: "default" });
    expect(inputs.salaryGrowth).toEqual({ value: { kind: "none" }, source: "default" });
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

    return resolvedPlan.inputs.projection.inputs.people[0].superAccount;
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

// Tests for the super access age input (IN-5).
describe("resolvePlanInputs: super access age", () => {
  /** Resolves a plan for a person aged 40 retiring at 50, returning the resolved access age. */
  function resolveAccessAge(superAccessAge: number | undefined) {
    const blank = blankPlan();
    const [person] = blank.household.people;
    if (person === undefined) throw new Error("blank plan is empty");

    const resolvedPlan = resolvePlanInputs({
      ...blank,
      household: {
        people: [{ ...person, currentAge: 40, targetRetirementAge: 50, superAccessAge }],
      },
      expenses: { livingAnnual: 50000 },
    });
    if (
      resolvedPlan.status !== "complete" ||
      resolvedPlan.inputs.projection.status !== "complete"
    ) {
      throw new Error("expected a complete plan");
    }

    return resolvedPlan.inputs.projection.inputs.people[0].superAccessAge;
  }

  it("leaves an unset age to the law (the rules' unconditional release age)", () => {
    expect(resolveAccessAge(undefined)).toEqual({ value: undefined, source: "rule" });
  });

  it("keeps an entered age, with source input", () => {
    expect(resolveAccessAge(60)).toEqual({ value: 60, source: "input" });
  });
});

describe("resolvePlanInputs: people with the same name", () => {
  it("labels them with their position, in the resolved people and in messages", () => {
    const blank = createNewPlan(() => "id");
    const plan: Plan = {
      ...blank,
      expenses: { livingAnnual: 1 },
      household: {
        people: [
          { id: "a", label: "Person 1", name: "Alex", currentAge: 40, targetRetirementAge: 50 },
          { id: "b", label: "Person 2", name: "alex" },
        ],
      },
    };
    const resolved = resolvePlanInputs(plan);
    if (resolved.status !== "complete") throw new Error("expected complete");

    expect(resolved.inputs.projection).toEqual({
      status: "incomplete",
      missing: [
        { field: "currentAge", label: "alex (Person 2): Current age" },
        { field: "targetRetirementAge", label: "alex (Person 2): Target retirement age" },
      ],
    });
  });
});
