import { fc, test } from "@fast-check/vitest";
import { describe, expect, it } from "vitest";

import { createNewPlan } from "../plan/createNewPlan";
import type { DatedExpense, Plan, RetirementSpending } from "../plan/types";
import { fractionToPercent, percentToFraction, planFromWire, planToWire } from "./planMapping";

// Tests for the Plan <-> PlanDocumentV1 mappers.

/** A blank plan with predictable IDs. */
function blankPlan(): Plan {
  let counter = 0;
  return createNewPlan(() => `id-${++counter}`);
}

/** Dollar amounts to the cent. */
const dollars = fc.integer({ min: 0, max: 1_000_000_000 }).map((cents) => cents / 100);

/** Retirement spending, as a dollar amount or a fraction made from a whole-hundredth percent. */
const retirementSpendings: fc.Arbitrary<RetirementSpending> = fc.oneof(
  dollars.map((annual) => ({ kind: "amount" as const, annual })),
  fc.integer({ min: 0, max: 30_000 }).map((hundredthsOfPercent) => ({
    kind: "percentOfToday" as const,
    fraction: percentToFraction(hundredthsOfPercent / 100),
  })),
);

/** Whole ages from 0 to 120. */
const ages = fc.integer({ min: 0, max: 120 });

/** A fraction made from a whole-hundredth percent (0% to 150%), as the UI would produce. */
const wholeHundredthsFraction = fc
  .integer({ min: 0, max: 15_000 })
  .map((hundredthsOfPercent) => percentToFraction(hundredthsOfPercent / 100));

/** Calendar years inside the stored range. */
const years = fc.integer({ min: 1900, max: 2200 });

/** Dated expenses whose "To" year is never before the "From" year, with the amount sometimes unset. */
const datedExpenses: fc.Arbitrary<DatedExpense> = fc
  .record({
    id: fc.uuid(),
    name: fc.string(),
    annual: fc.option(dollars, { nil: undefined }),
    fromYear: years,
    extraYears: fc.integer({ min: 0, max: 50 }),
  })
  .map(({ id, name, annual, fromYear, extraYears }) => ({
    id,
    name,
    ...(annual !== undefined ? { annual } : {}),
    fromYear,
    toYear: Math.min(fromYear + extraYears, 2200),
  }));

/** Arbitrary plans where every optional value may or may not be set. */
const plans: fc.Arbitrary<Plan> = fc
  .record({
    livingAnnual: fc.option(dollars, { nil: undefined }),
    retirementSpending: fc.option(retirementSpendings, { nil: undefined }),
    safeWithdrawalRate: fc.option(
      fc
        .integer({ min: 1, max: 20_000 })
        .map((hundredthsOfPercent) => percentToFraction(hundredthsOfPercent / 100)),
      { nil: undefined },
    ),
    portfolioValue: fc.option(dollars, { nil: undefined }),
    inflationRate: fc.option(wholeHundredthsFraction, { nil: undefined }),
    currentAge: fc.option(ages, { nil: undefined }),
    targetRetirementAge: fc.option(ages, { nil: undefined }),
    expectedReturn: fc.option(wholeHundredthsFraction, { nil: undefined }),
    annualContribution: fc.option(dollars, { nil: undefined }),
    contributionsStopAge: fc.option(ages, { nil: undefined }),
    personLabel: fc.string(),
    portfolioName: fc.string(),
    projectionEndAge: fc.option(ages, { nil: undefined }),
    cashBalance: fc.option(dollars, { nil: undefined }),
    interestRate: fc.option(wholeHundredthsFraction, { nil: undefined }),
    // Absent, empty, or several expenses.
    datedExpenseList: fc.option(fc.array(datedExpenses, { maxLength: 4 }), { nil: undefined }),
  })
  .map((generated) => ({
    household: {
      ...(generated.projectionEndAge !== undefined
        ? { projectionEndAge: generated.projectionEndAge }
        : {}),
      people: [
        {
          id: "person-id",
          label: generated.personLabel,
          ...(generated.currentAge !== undefined ? { currentAge: generated.currentAge } : {}),
          ...(generated.targetRetirementAge !== undefined
            ? { targetRetirementAge: generated.targetRetirementAge }
            : {}),
        },
      ],
    },
    ...(generated.cashBalance !== undefined ? { cash: { balance: generated.cashBalance } } : {}),
    expenses: {
      ...(generated.datedExpenseList !== undefined
        ? { datedExpenses: generated.datedExpenseList }
        : {}),
      ...(generated.livingAnnual !== undefined ? { livingAnnual: generated.livingAnnual } : {}),
      ...(generated.retirementSpending !== undefined
        ? { retirementSpending: generated.retirementSpending }
        : {}),
    },
    assumptions: {
      ...(generated.safeWithdrawalRate !== undefined
        ? { safeWithdrawalRate: generated.safeWithdrawalRate }
        : {}),
      ...(generated.inflationRate !== undefined ? { inflationRate: generated.inflationRate } : {}),
      ...(generated.interestRate !== undefined ? { interestRate: generated.interestRate } : {}),
    },
    portfolios: [
      {
        id: "portfolio-id",
        name: generated.portfolioName,
        ...(generated.portfolioValue !== undefined ? { value: generated.portfolioValue } : {}),
        ...(generated.expectedReturn !== undefined
          ? { expectedReturn: generated.expectedReturn }
          : {}),
        ...(generated.annualContribution !== undefined
          ? { annualContribution: generated.annualContribution }
          : {}),
        ...(generated.contributionsStopAge !== undefined
          ? { contributionsStopAge: generated.contributionsStopAge }
          : {}),
      },
    ],
  }));

describe("percent and fraction conversion", () => {
  // The headline example from the plan: a stored 4 is an in-memory 0.04.
  it("converts 4% to 0.04 and back", () => {
    expect(percentToFraction(4)).toBe(0.04);
    expect(fractionToPercent(0.04)).toBe(4);
  });

  // 4.1 / 100 is 0.040999999999999995 in raw floating point; the user must see 0.041.
  it("removes floating-point noise (4.1 becomes exactly 0.041)", () => {
    expect(4.1 / 100).not.toBe(0.041);
    expect(percentToFraction(4.1)).toBe(0.041);
    expect(fractionToPercent(0.041)).toBe(4.1);
  });
});

describe("planToWire", () => {
  // A new plan has nothing set, so the stored document must hold no values at all.
  it("omits every unset value", () => {
    const document = planToWire(blankPlan());

    expect(document).toStrictEqual({
      schemaVersion: 1,
      household: { people: [{ id: "id-1", label: "Person 1" }] },
      expenses: {},
      assumptions: {},
      portfolios: [{ id: "id-2", name: "Share portfolio" }],
    });
  });

  // Fractions become percents and the units appear in the field names.
  it("writes set values with units in the field names", () => {
    const plan: Plan = {
      ...blankPlan(),
      expenses: {
        livingAnnual: 64000,
        retirementSpending: { kind: "percentOfToday", fraction: 0.9 },
      },
      assumptions: { safeWithdrawalRate: 0.04 },
    };

    const document = planToWire(plan);

    expect(document.expenses).toStrictEqual({
      livingAnnualDollars: 64000,
      retirement: { kind: "percentOfToday", percent: 90 },
    });
    expect(document.assumptions).toStrictEqual({ safeWithdrawalRatePercent: 4 });
  });
});

describe("planToWire: growth fields", () => {
  // Fractions become percents, ages and dollars keep their values, units in the names.
  it("writes the growth fields with units in the field names", () => {
    const blank = blankPlan();
    const [person] = blank.household.people;
    const [portfolio] = blank.portfolios;
    if (person === undefined || portfolio === undefined) throw new Error("blank plan is empty");

    const document = planToWire({
      household: { people: [{ ...person, currentAge: 34, targetRetirementAge: 50 }] },
      expenses: {},
      assumptions: { inflationRate: 0.025 },
      portfolios: [
        { ...portfolio, expectedReturn: 0.07, annualContribution: 30000, contributionsStopAge: 50 },
      ],
    });

    expect(document.household.people[0]).toStrictEqual({
      id: "id-1",
      label: "Person 1",
      currentAgeYears: 34,
      targetRetirementAgeYears: 50,
    });
    expect(document.assumptions).toStrictEqual({ inflationPercent: 2.5 });
    expect(document.portfolios[0]).toStrictEqual({
      id: "id-2",
      name: "Share portfolio",
      expectedReturnPercent: 7,
      annualContributionDollars: 30000,
      contributionsStopAgeYears: 50,
    });
  });
});

describe("salary mapping", () => {
  /** A plan whose only person has the given salary. */
  function planWithSalary(salary: Plan["household"]["people"][number]["salary"]): Plan {
    const blank = blankPlan();
    const [person] = blank.household.people;
    if (person === undefined) throw new Error("blank plan is empty");

    return { ...blank, household: { people: [{ ...person, salary }] } };
  }

  it("writes salary with units in the names and growth as percents", () => {
    const document = planToWire(
      planWithSalary({ annual: 145000, growth: { kind: "inflationPlus", margin: 0.01 } }),
    );

    expect(document.household.people[0]?.salary).toStrictEqual({
      annualDollars: 145000,
      growth: { kind: "inflationPlus", marginPercent: 1 },
    });
  });

  it("omits salary when nothing is set, and omits unset parts", () => {
    expect(planToWire(planWithSalary(undefined)).household.people[0]).not.toHaveProperty("salary");
    expect(planToWire(planWithSalary({ annual: 50000 })).household.people[0]?.salary).toStrictEqual(
      { annualDollars: 50000 },
    );
  });

  it.each([
    [{ kind: "inflationPlus", margin: -0.01 }],
    [{ kind: "fixed", rate: 0.035 }],
    [{ kind: "none" }],
  ] as const)("round-trips growth %j", (growth) => {
    const plan = planWithSalary({ annual: 1000, growth });

    expect(planFromWire(planToWire(plan))).toStrictEqual(plan);
  });
});

describe("planToWire: drawdown fields", () => {
  // Percent for the interest rate, dollars and years keep their values, units in the names.
  it("writes the drawdown fields with units in the field names", () => {
    const blank = blankPlan();

    const document = planToWire({
      ...blank,
      household: { ...blank.household, projectionEndAge: 90 },
      cash: { balance: 20000 },
      expenses: {
        datedExpenses: [
          { id: "a", name: "Car", annual: 30000, fromYear: 2028, toYear: 2028 },
          { id: "b", name: "", fromYear: 2029, toYear: 2030 },
        ],
      },
      assumptions: { interestRate: 0.035 },
    });

    expect(document.household.projectionEndAgeYears).toBe(90);
    expect(document.cash).toStrictEqual({ balanceDollars: 20000 });
    expect(document.assumptions).toStrictEqual({ interestPercent: 3.5 });
    expect(document.expenses.datedExpenses).toStrictEqual([
      { id: "a", name: "Car", annualDollars: 30000, fromYear: 2028, toYear: 2028 },
      { id: "b", name: "", fromYear: 2029, toYear: 2030 },
    ]);
  });

  // An unset amount is omitted, and no cash section is written until a balance is set.
  it("omits an unset amount and an unset cash balance", () => {
    const blank = blankPlan();

    const document = planToWire({ ...blank, cash: {} });

    expect(document).not.toHaveProperty("cash");
  });
});

describe("planFromWire", () => {
  // Stored documents without a person label (it's optional on the wire) still give a usable plan.
  it("labels a person stored without a label", () => {
    const plan = planFromWire({
      schemaVersion: 1,
      household: { people: [{ id: "a" }, { id: "b" }] },
      expenses: {},
      assumptions: {},
      portfolios: [],
    });

    expect(plan.household.people.map((person) => person.label)).toEqual(["Person 1", "Person 2"]);
  });
});

describe("round trip", () => {
  // The blank plan must survive unchanged, with unset values still unset (not 0 or defaults).
  it("keeps a blank plan blank", () => {
    const plan = blankPlan();

    expect(planFromWire(planToWire(plan))).toStrictEqual(plan);
  });

  // For any plan, Plan -> wire -> Plan gives back an identical plan, including unset values.
  test.prop([plans])("Plan -> wire -> Plan is the identity", (plan) => {
    expect(planFromWire(planToWire(plan))).toStrictEqual(plan);
  });
});
