import { describe, expect, it } from "vitest";

import { summarisePlan } from "../../engine/fiNumber";
import type { CoastFire } from "../../engine/coastFire";
import type { Plan } from "../../plan/types";
import { blankPlan } from "../sections/sectionTestHelpers";
import {
  buildCoastChartSeries,
  COAST_NUMBER_KEY,
  describeCoastChartEnd,
  FI_NUMBER_KEY,
  NO_CONTRIBUTIONS_KEY,
  YOUR_SAVINGS_KEY,
} from "./coastChart";

/** The Coast FIRE results of a plan, started in 2026; fails the test if the plan is incomplete. */
function coastOf(plan: Plan): CoastFire {
  const summary = summarisePlan(plan, 2026);
  if (summary.status !== "complete" || summary.projection.status !== "complete") {
    throw new Error("the example plan should be complete");
  }

  return summary.projection.coast;
}

/** Worked example A (tests/worked-examples/m4-coast.json): Coast FIRE reached in 2029, retire in 2042. */
const exampleA: Plan = {
  ...blankPlan,
  household: {
    people: [{ id: "person-1", label: "Person 1", currentAge: 34, targetRetirementAge: 50 }],
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

/** Worked example E: never coasts before retirement at 40. */
const exampleE: Plan = {
  ...blankPlan,
  household: {
    people: [{ id: "person-1", label: "Person 1", currentAge: 30, targetRetirementAge: 40 }],
  },
  expenses: { livingAnnual: 80000 },
  assumptions: { inflationRate: 0.03 },
  portfolios: [
    {
      id: "portfolio-1",
      name: "Share portfolio",
      value: 10_000,
      expectedReturn: 0.05,
      annualContribution: 1000,
    },
  ],
};

describe("buildCoastChartSeries, example A", () => {
  const coast = coastOf(exampleA);

  it("runs from today to the retirement year", () => {
    const { points } = buildCoastChartSeries(coast, "nominal");

    expect(points).toHaveLength(17);
    expect(points[0]?.year).toBe(2026);
    expect(points[16]?.year).toBe(2042);
  });

  it("starts at the Coast FIRE number in today's dollars, in both modes", () => {
    for (const mode of ["nominal", "today"] as const) {
      const { points } = buildCoastChartSeries(coast, mode);

      expect(points[0]?.values[COAST_NUMBER_KEY]).toBeCloseTo(811876.59, 2);
    }
  });

  it("shows the Coast FIRE and FI numbers in 2042 dollars (nominal) or today's dollars", () => {
    const nominal = buildCoastChartSeries(coast, "nominal").points[16]!;
    const today = buildCoastChartSeries(coast, "today").points[16]!;

    // The Coast FIRE number meets the FI number at retirement: $1,600,000 × 1.025^16.
    expect(nominal.values[COAST_NUMBER_KEY]).toBeCloseTo(2375208.99, 2);
    expect(nominal.values[FI_NUMBER_KEY]).toBeCloseTo(2375208.99, 2);
    expect(today.values[COAST_NUMBER_KEY]).toBeCloseTo(1600000, 2);
    expect(today.values[FI_NUMBER_KEY]).toBeCloseTo(1600000, 2);
  });

  it("draws your savings above the no-contributions line once contributions have added up", () => {
    const { points } = buildCoastChartSeries(coast, "nominal");

    expect(points[0]?.values[YOUR_SAVINGS_KEY]).toBe(points[0]?.values[NO_CONTRIBUTIONS_KEY]);
    expect(points[16]?.values[YOUR_SAVINGS_KEY]).toBeGreaterThan(
      points[16]?.values[NO_CONTRIBUTIONS_KEY] ?? 0,
    );
  });

  it("marks Coast FIRE in 2029 and retirement in 2042", () => {
    expect(buildCoastChartSeries(coast, "nominal").markers).toEqual([
      { year: 2029, label: "Coast FIRE" },
      { year: 2042, label: "Retirement" },
    ]);
  });

  it("gives each line a distinct style and the four plan labels", () => {
    const { series } = buildCoastChartSeries(coast, "nominal");

    expect(series.map((oneSeries) => [oneSeries.label, oneSeries.strokeStyle ?? "solid"])).toEqual([
      ["Your savings, current contributions", "solid"],
      ["Today's savings, no more contributions", "solid"],
      ["Coast FIRE number", "dashed"],
      ["FI number", "dotted"],
    ]);
  });

  it("ends the caption figures in nominal dollars at retirement", () => {
    const end = describeCoastChartEnd(coast);

    expect(end?.year).toBe(2042);
    expect(end?.fiNumber).toBeCloseTo(2375208.99, 2);
  });
});

describe("buildCoastChartSeries, example E", () => {
  const coast = coastOf(exampleE);

  it("marks only retirement, because Coast FIRE is never reached", () => {
    for (const mode of ["nominal", "today"] as const) {
      expect(buildCoastChartSeries(coast, mode).markers).toEqual([
        { year: 2036, label: "Retirement" },
      ]);
    }
  });

  it("starts at $1,650,096 in both modes and ends at the FI number", () => {
    const nominal = buildCoastChartSeries(coast, "nominal").points;
    const today = buildCoastChartSeries(coast, "today").points;

    expect(nominal[0]?.values[COAST_NUMBER_KEY]).toBeCloseTo(1650096.15, 2);
    expect(today[0]?.values[COAST_NUMBER_KEY]).toBeCloseTo(1650096.15, 2);
    // $80,000 ÷ 4% × 1.03^10, against the same in today's dollars.
    expect(nominal[10]?.values[FI_NUMBER_KEY]).toBeCloseTo(2000000 * 1.03 ** 10, 2);
    expect(today[10]?.values[FI_NUMBER_KEY]).toBeCloseTo(2000000, 2);
  });
});

describe("buildCoastChartSeries, edge cases", () => {
  it("has no marker for Coast FIRE reached today (example D), only retirement", () => {
    const coast = coastOf({
      ...blankPlan,
      household: {
        people: [{ id: "person-1", label: "Person 1", currentAge: 45, targetRetirementAge: 60 }],
      },
      expenses: { livingAnnual: 50000 },
      portfolios: [
        { id: "portfolio-1", name: "Share portfolio", value: 1_000_000, expectedReturn: 0.07 },
      ],
    });

    expect(buildCoastChartSeries(coast, "nominal").markers).toEqual([
      { year: 2041, label: "Retirement" },
    ]);
  });
});
