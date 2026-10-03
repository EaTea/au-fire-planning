import { describe, expect, it } from "vitest";

import { createNewPlan } from "../plan/createNewPlan";
import type { Plan } from "../plan/types";
import {
  calculateFiNumber,
  calculateFiNumberAtRetirement,
  calculateProgressToFi,
  retirementSpendingAnnual,
  summarisePlan as summarisePlanForYear,
} from "./fiNumber";
import type { Explained } from "./explained";

/** The start year used throughout these tests (M1's figures don't depend on it). */
const START_YEAR = 2026;

/** Summarises a plan with the fixed start year. */
function summarisePlan(plan: Plan) {
  return summarisePlanForYear(plan, START_YEAR);
}

/** A plan with predictable IDs, given living expenses and a portfolio value, plus any overrides. */
function planWith(overrides: {
  livingAnnual?: number;
  retirementSpending?: Plan["expenses"]["retirementSpending"];
  safeWithdrawalRate?: number;
  portfolioValue?: number;
  cashBalance?: number;
}): Plan {
  let counter = 0;
  const blank = createNewPlan(() => `id-${++counter}`);

  return {
    ...blank,
    expenses: {
      livingAnnual: overrides.livingAnnual,
      retirementSpending: overrides.retirementSpending,
    },
    cash: { balance: overrides.cashBalance },
    assumptions: { safeWithdrawalRate: overrides.safeWithdrawalRate },
    portfolios: [{ id: "portfolio", name: "Share portfolio", value: overrides.portfolioValue }],
  };
}

/** Simplest possible `Explained` dollar figure, for feeding the pure functions directly. */
function dollars(value: number): Explained {
  return {
    value,
    unit: "dollars",
    lines: [{ label: "x", value, unit: "dollars", source: "input" }],
  };
}

// Tests for the retirement spending step of the calculation.
describe("retirementSpendingAnnual", () => {
  // A dollar amount is used as entered; living expenses play no part.
  it("uses a dollar amount as it is", () => {
    const result = retirementSpendingAnnual(
      { value: 80000, source: "input" },
      { value: { kind: "amount", annual: 50000 }, source: "input" },
    );

    expect(result.value).toBe(50000);
    expect(result.lines).toHaveLength(1);
  });

  // 90% of $60,000 is $54,000, shown as a multiplication.
  it("multiplies living expenses by the percentage and shows the multiplication", () => {
    const result = retirementSpendingAnnual(
      { value: 60000, source: "input" },
      { value: { kind: "percentOfToday", fraction: 0.9 }, source: "input" },
    );

    expect(result.value).toBeCloseTo(54000, 2);
    expect(result.lines.map((line) => line.operator)).toEqual([undefined, "×", "="]);
    expect(result.lines.map((line) => line.source)).toEqual(["input", "input", "calculated"]);
  });
});

// Tests for the FI number step.
describe("calculateFiNumber", () => {
  // The headline figure: $64,000 / 4% = $1,600,000.
  it("divides retirement spending by the withdrawal rate", () => {
    expect(calculateFiNumber(dollars(64000), 0.04, "input").value).toBeCloseTo(1_600_000, 2);
  });

  // A rate of zero, or below, would divide by zero or flip the sign.
  it.each([0, -0.01])("throws a RangeError for a rate of %s", (rate) => {
    expect(() => calculateFiNumber(dollars(64000), rate, "input")).toThrow(RangeError);
  });

  // NaN isn't a rate either.
  it("throws a RangeError for a rate of NaN", () => {
    expect(() => calculateFiNumber(dollars(64000), Number.NaN, "input")).toThrow(RangeError);
  });

  // The rate line must say whether the rate was entered or defaulted.
  it("records where the rate came from", () => {
    const result = calculateFiNumber(dollars(64000), 0.04, "default");

    expect(result.lines.find((line) => line.label === "Safe withdrawal rate")?.source).toBe(
      "default",
    );
  });
});

// Tests for the progress step.
describe("calculateProgressToFi", () => {
  // $720,000 of $1,600,000 is 45%.
  it("divides the investable amount by the FI number", () => {
    expect(calculateProgressToFi(dollars(720000), dollars(1_600_000)).value).toBeCloseTo(0.45, 10);
  });

  // An empty portfolio is 0%.
  it("gives 0 for a $0 portfolio", () => {
    expect(calculateProgressToFi(dollars(0), dollars(1_600_000)).value).toBe(0);
  });

  // Progress is not capped: $2,000,000 of $1,600,000 is 125%.
  it("does not cap progress at 100%", () => {
    expect(calculateProgressToFi(dollars(2_000_000), dollars(1_600_000)).value).toBeCloseTo(
      1.25,
      10,
    );
  });

  // Progress towards an FI number of 0 is undefined.
  it("throws a RangeError when the FI number is 0", () => {
    expect(() => calculateProgressToFi(dollars(1000), dollars(0))).toThrow(RangeError);
  });
});

// Tests for the entry point the UI calls.
describe("summarisePlan", () => {
  // Without living expenses there is nothing to calculate; the engine names the missing field.
  it("is incomplete, naming livingExpenses, when living expenses are missing", () => {
    const summary = summarisePlan(planWith({ portfolioValue: 100000 }));

    expect(summary).toEqual({
      status: "incomplete",
      missing: [{ field: "livingExpenses", label: "Living expenses" }],
    });
  });

  // The headline example from the milestone: $64,000, default 100% and 4%, $720,000 invested.
  it("gives $1,600,000 and 45% for the headline example", () => {
    const summary = summarisePlan(planWith({ livingAnnual: 64000, portfolioValue: 720000 }));

    expect(summary.status).toBe("complete");
    if (summary.status !== "complete") return;
    expect(summary.fiNumber.value).toBeCloseTo(1_600_000, 2);
    expect(summary.progressToFi.value).toBeCloseTo(0.45, 10);
    expect(summary.investable.value).toBe(720000);
    expect(summary.retirementSpending.value).toBe(64000);
    expect(summary.safeWithdrawalRate).toBe(0.04);
  });

  // 90% of $60,000 = $54,000, so $1,350,000 at 4%.
  it("gives $1,350,000 for 90% of $60,000 at 4%", () => {
    const summary = summarisePlan(
      planWith({
        livingAnnual: 60000,
        retirementSpending: { kind: "percentOfToday", fraction: 0.9 },
        safeWithdrawalRate: 0.04,
      }),
    );

    expect(summary.status === "complete" && summary.fiNumber.value).toBeCloseTo(1_350_000, 2);
  });

  // An unset portfolio value counts as $0, so progress is 0%.
  it("gives 0% progress when the portfolio value is unset", () => {
    const summary = summarisePlan(planWith({ livingAnnual: 64000 }));

    expect(summary.status === "complete" && summary.progressToFi.value).toBe(0);
  });

  // $2,000,000 of $1,600,000 is 125%.
  it("gives 125% progress for $2,000,000 against $1,600,000", () => {
    const summary = summarisePlan(planWith({ livingAnnual: 64000, portfolioValue: 2_000_000 }));

    expect(summary.status === "complete" && summary.progressToFi.value).toBeCloseTo(1.25, 10);
  });

  // Unset values use the defaults, and the explanation lines must say "default".
  it("marks defaulted values as 'default' in the explanation lines", () => {
    const summary = summarisePlan(planWith({ livingAnnual: 64000 }));

    expect(summary.status).toBe("complete");
    if (summary.status !== "complete") return;

    const fiNumberLines = summary.fiNumber.lines;
    expect(fiNumberLines.find((line) => line.label === "Safe withdrawal rate")).toMatchObject({
      value: 0.04,
      source: "default",
    });

    // The "100% of today" default shows up in the retirement spending working, via the FI number's source.
    const spending = retirementSpendingAnnual(
      { value: 64000, source: "input" },
      { value: { kind: "percentOfToday", fraction: 1 }, source: "default" },
    );
    expect(spending.lines[1]?.source).toBe("default");

    expect(summary.investable.lines[0]).toMatchObject({ value: 0, source: "default" });
  });

  // Entered values must be marked as "input", not "default".
  it("marks entered values as 'input' in the explanation lines", () => {
    const summary = summarisePlan(
      planWith({ livingAnnual: 64000, safeWithdrawalRate: 0.035, portfolioValue: 5 }),
    );

    expect(summary.status).toBe("complete");
    if (summary.status !== "complete") return;
    expect(
      summary.fiNumber.lines.find((line) => line.label === "Safe withdrawal rate")?.source,
    ).toBe("input");
    expect(summary.investable.lines[0]?.source).toBe("input");
  });

  // $0 living expenses at a percentage gives $0 spending, which can't produce an FI number.
  it("is incomplete, naming retirementSpending, for $0 living expenses at a percentage", () => {
    const summary = summarisePlan(planWith({ livingAnnual: 0, portfolioValue: 1000 }));

    expect(summary).toEqual({
      status: "incomplete",
      missing: [{ field: "retirementSpending", label: "Retirement spending must be more than $0" }],
    });
  });

  // A $0 spending amount is likewise incomplete rather than a crash.
  it("is incomplete, naming retirementSpending, for a $0 spending amount", () => {
    const summary = summarisePlan(
      planWith({ livingAnnual: 64000, retirementSpending: { kind: "amount", annual: 0 } }),
    );

    expect(summary.status).toBe("incomplete");
    if (summary.status !== "incomplete") return;
    expect(summary.missing.map((missing) => missing.field)).toEqual(["retirementSpending"]);
  });

  // A rate of 0 or below must surface as a RangeError, since the UI is meant to prevent it.
  it("throws a RangeError when the entered rate is 0 or below", () => {
    expect(() => summarisePlan(planWith({ livingAnnual: 64000, safeWithdrawalRate: 0 }))).toThrow(
      RangeError,
    );
    expect(() =>
      summarisePlan(planWith({ livingAnnual: 64000, safeWithdrawalRate: -0.04 })),
    ).toThrow(RangeError);
  });
});

// Tests for the projection part of the summary, using the plan's example A.
describe("summarisePlan: projection", () => {
  /** Example A: 34 now, retiring at 50, $720,000 at 7%, $30,000 a year, 2.5% inflation. */
  function exampleAPlan(ages: { currentAge?: number; targetRetirementAge?: number }): Plan {
    const blank = planWith({ livingAnnual: 64000, portfolioValue: 720000 });
    const [person] = blank.household.people;
    const [portfolio] = blank.portfolios;
    if (person === undefined || portfolio === undefined) throw new Error("blank plan is empty");

    return {
      ...blank,
      household: { people: [{ ...person, ...ages }] },
      portfolios: [{ ...portfolio, annualContribution: 30000 }],
    };
  }

  // Missing ages must not hide the FI number.
  it("is incomplete on the projection only when ages are missing", () => {
    const summary = summarisePlan(exampleAPlan({}));

    expect(summary.status).toBe("complete");
    if (summary.status !== "complete") return;
    expect(summary.fiNumber.value).toBe(1600000);
    expect(summary.projection.status).toBe("incomplete");
  });

  // The headline: FI in 2038 at age 46, and $2,375,209 nominal at 50.
  it("reaches FI in 2038 at age 46 and gives the nominal FI number at 50", () => {
    const summary = summarisePlan(exampleAPlan({ currentAge: 34, targetRetirementAge: 50 }));

    expect(summary.status).toBe("complete");
    if (summary.status !== "complete" || summary.projection.status !== "complete") return;
    expect(summary.projection.fiReached).toMatchObject({ calendarYear: 2038, age: 46 });
    expect(summary.projection.fiNumberAtRetirement.value).toBeCloseTo(2375208.99, 2);
    expect(summary.projection.retirementAge).toBe(50);
    expect(summary.projection.retirementYear).toBe(2042);
    expect(summary.projection.fiNumberAtRetirement.lines.map((line) => line.operator)).toEqual([
      undefined,
      "×",
      "=",
    ]);
  });
});

// Tests for the nominal FI number at the target retirement age.
describe("calculateFiNumberAtRetirement", () => {
  // No years to wait means no inflation growth.
  it("equals today's FI number when retiring now", () => {
    expect(calculateFiNumberAtRetirement(dollars(1600000), 0.025, 0).value).toBe(1600000);
  });

  // The growth multiplier is a factor, so the UI shows "× 1.4845", not "148.5%".
  it("labels the inflation growth line with the factor unit", () => {
    const result = calculateFiNumberAtRetirement(dollars(1600000), 0.025, 16);

    expect(result.lines[1]).toMatchObject({ unit: "factor", operator: "×" });
    expect(result.lines[1]?.value).toBeCloseTo(1.025 ** 16, 12);
  });

  // $1,600,000 × 1.025^16.
  it("grows today's FI number by inflation over the years", () => {
    expect(calculateFiNumberAtRetirement(dollars(1600000), 0.025, 16).value).toBeCloseTo(
      2375208.99,
      2,
    );
  });
});

// M3: cash counts towards the investable amount, and the projection reports its end age and solvency.
describe("summarisePlan: cash and solvency", () => {
  /** A complete summary for a plan with ages 34 and 50, failing the test otherwise. */
  function summaryWithAges(overrides: Parameters<typeof planWith>[0]) {
    const plan = planWith(overrides);
    const [person] = plan.household.people;
    if (person === undefined) throw new Error("blank plan is empty");

    const summary = summarisePlan({
      ...plan,
      household: { people: [{ ...person, currentAge: 34, targetRetirementAge: 50 }] },
    });
    if (summary.status !== "complete") throw new Error("expected complete");
    return summary;
  }

  it("adds cash to the investable amount, with a Cash savings line", () => {
    const summary = summaryWithAges({
      livingAnnual: 64000,
      portfolioValue: 720000,
      cashBalance: 20000,
    });

    expect(summary.investable.value).toBe(740000);
    expect(summary.investable.lines.map((line) => line.label)).toEqual([
      "Share portfolio",
      "Cash savings",
      "Investable amount",
    ]);
    expect(summary.investable.lines[1]).toMatchObject({
      value: 20000,
      operator: "+",
      source: "input",
    });
  });

  it("gives the same investable amount as before when there is no cash", () => {
    const summary = summaryWithAges({ livingAnnual: 64000, portfolioValue: 720000 });

    expect(summary.investable.value).toBe(720000);
    expect(summary.investable.lines[1]).toMatchObject({
      label: "Cash savings",
      value: 0,
      source: "default",
    });
  });

  it("reports the end age and whether the money lasts", () => {
    const summary = summaryWithAges({
      livingAnnual: 64000,
      portfolioValue: 720000,
      cashBalance: 20000,
    });

    if (summary.projection.status !== "complete") throw new Error("expected complete projection");
    expect(summary.projection.endAge).toBe(95);
    expect(summary.projection.solvency.status).toBe("lasts");
  });

  it("reports the money running out for a plan that can't fund its spending", () => {
    const summary = summaryWithAges({ livingAnnual: 64000, portfolioValue: 1000 });

    if (summary.projection.status !== "complete") throw new Error("expected complete projection");
    expect(summary.projection.solvency).toMatchObject({ status: "runsOut", age: 51, year: 2043 });
  });
});
