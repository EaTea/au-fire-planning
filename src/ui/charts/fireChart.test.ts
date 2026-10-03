import { describe, expect, it } from "vitest";

import { bundledRuleSet } from "../../rules/bundledRuleSet";
import { summarisePlan, type ProjectionSummary } from "../../engine/fiNumber";
import type { Plan } from "../../plan/types";
import { blankPlan } from "../sections/sectionTestHelpers";
import { buildFireChartSeries, FI_NUMBER_KEY, INVESTABLE_KEY } from "./fireChart";

/** The complete projection of a plan, started in 2026; fails the test if the plan is incomplete. */
function completeProjection(plan: Plan): Extract<ProjectionSummary, { status: "complete" }> {
  const summary = summarisePlan(plan, 2026, bundledRuleSet);
  if (summary.status !== "complete" || summary.projection.status !== "complete") {
    throw new Error("the example plan should be complete");
  }

  return summary.projection;
}

/** Worked example A (tests/worked-examples/m3-drawdown.json): FI in 2038, retire in 2042, money lasts. */
const exampleA: Plan = {
  ...blankPlan,
  household: {
    people: [{ id: "person-1", label: "Person 1", currentAge: 34, targetRetirementAge: 50 }],
    projectionEndAge: 95,
  },
  expenses: { livingAnnual: 64000 },
  assumptions: { inflationRate: 0.025, interestRate: 0.04 },
  cash: { balance: 20000 },
  portfolios: [
    {
      id: "portfolio-1",
      name: "Share portfolio",
      value: 720000,
      expectedReturn: 0.07,
      annualContribution: 30000,
    },
  ],
};

/** Worked example B: retired at 60, runs short in 2031 only, FI never reached. */
const exampleB: Plan = {
  ...blankPlan,
  household: {
    people: [{ id: "person-1", label: "Person 1", currentAge: 60, targetRetirementAge: 60 }],
    projectionEndAge: 65,
  },
  expenses: { livingAnnual: 30000, retirementSpending: { kind: "amount", annual: 30000 } },
  assumptions: { inflationRate: 0, interestRate: 0.05 },
  cash: { balance: 10000 },
  portfolios: [{ id: "portfolio-1", name: "Share portfolio", value: 100000, expectedReturn: 0.1 }],
};

describe("buildFireChartSeries, example A", () => {
  const projection = completeProjection(exampleA);

  it("has a point for every year, to the plan-until age", () => {
    const { points } = buildFireChartSeries(projection, "nominal");

    expect(points).toHaveLength(62);
    expect(points[0]).toMatchObject({ year: 2026, age: 34 });
    expect(points[61]).toMatchObject({ year: 2087, age: 95 });
  });

  it("shows nominal investable net worth and FI number as the engine has them", () => {
    const { points } = buildFireChartSeries(projection, "nominal");

    // Row 1 (2027): cash $20,800 + portfolio $800,400; FI number $64,000 × 1.025 ÷ 4%.
    expect(points[1]?.values[INVESTABLE_KEY]).toBeCloseTo(821200, 2);
    expect(points[1]?.values[FI_NUMBER_KEY]).toBeCloseTo(1640000, 2);
  });

  it("divides by the inflation index in today's dollars", () => {
    const { points } = buildFireChartSeries(projection, "today");

    expect(points[1]?.values[INVESTABLE_KEY]).toBeCloseTo(821200 / 1.025, 2);
    // The FI number in today's dollars is the same every year.
    expect(points[1]?.values[FI_NUMBER_KEY]).toBeCloseTo(1600000, 2);
    expect(points[30]?.values[FI_NUMBER_KEY]).toBeCloseTo(1600000, 2);
  });

  it("marks the FI year and the retirement year, and has no shortfall band", () => {
    const { markers, bands } = buildFireChartSeries(projection, "nominal");

    expect(markers).toEqual([
      { year: 2038, label: "FI reached" },
      { year: 2042, label: "Retirement" },
    ]);
    expect(bands).toEqual([]);
  });

  it("names the series and gives each a colour class and the FI number a dashed line", () => {
    const { series } = buildFireChartSeries(projection, "nominal");

    expect(series).toEqual([
      { key: INVESTABLE_KEY, label: "Investable net worth", className: "chart-series-investable" },
      {
        key: FI_NUMBER_KEY,
        label: "FI number",
        className: "chart-series-fi-number",
        strokeStyle: "dashed",
      },
    ]);
  });
});

describe("buildFireChartSeries, example B", () => {
  const projection = completeProjection(exampleB);

  it("has one band, for the one year that can't be funded", () => {
    const { bands } = buildFireChartSeries(projection, "nominal");

    expect(bands).toEqual([{ fromYear: 2031, toYear: 2031, label: "Shortfall" }]);
  });

  it("marks only retirement, because FI is never reached", () => {
    const { markers } = buildFireChartSeries(projection, "nominal");

    expect(markers).toEqual([{ year: 2026, label: "Retirement" }]);
  });

  it("ends at $0 investable, in both modes", () => {
    for (const mode of ["nominal", "today"] as const) {
      const { points } = buildFireChartSeries(projection, mode);

      expect(points).toHaveLength(6);
      expect(points[5]?.values[INVESTABLE_KEY]).toBe(0);
      // 0% inflation, so the two modes agree: row 1's portfolio $90,500 + cash $0.
      expect(points[1]?.values[INVESTABLE_KEY]).toBeCloseTo(90500, 2);
    }
  });

  it("merges runs of consecutive shortfall years into one band", () => {
    // Retired at 60 with no savings at all: every year from 2027 can't be funded.
    const brokePlan: Plan = {
      ...exampleB,
      cash: { balance: 0 },
      portfolios: [{ id: "portfolio-1", name: "Share portfolio", value: 0, expectedReturn: 0 }],
    };
    const { bands } = buildFireChartSeries(completeProjection(brokePlan), "nominal");

    expect(bands).toEqual([{ fromYear: 2027, toYear: 2031, label: "Shortfall" }]);
  });
});
