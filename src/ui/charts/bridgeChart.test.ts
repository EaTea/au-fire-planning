import { describe, expect, it } from "vitest";

import { summarisePlan, type ProjectionSummary } from "../../engine/fiNumber";
import { bundledRuleSet } from "../../rules/bundledRuleSet";
import type { Plan } from "../../plan/types";
import { blankPlan } from "../sections/sectionTestHelpers";
import { buildBridgeChartSeries, OUTSIDE_SUPER_KEY, SUPER_KEY } from "./bridgeChart";

/** The complete projection of a plan, started in 2026; fails the test if the plan is incomplete. */
function completeProjection(plan: Plan): Extract<ProjectionSummary, { status: "complete" }> {
  const summary = summarisePlan(plan, 2026, bundledRuleSet);
  if (summary.status !== "complete" || summary.projection.status !== "complete") {
    throw new Error("the example plan should be complete");
  }

  return summary.projection;
}

/**
 * Worked example B1 (tests/worked-examples/m6-bridge.json): age 55, retire at
 * 56, plan until 66, $100,000 in the portfolio and in super at 0%, $20,000 a
 * year, super accessible at 60. With `superAccessAge` unset it is B2.
 */
function exampleB(superAccessAge: number | undefined, retirementAge = 56, endAge = 66): Plan {
  return {
    ...blankPlan,
    household: {
      people: [
        {
          id: "person-1",
          label: "Person 1",
          currentAge: 55,
          targetRetirementAge: retirementAge,
          superAccessAge,
          superAccount: { balance: 100000, returnRate: 0 },
        },
      ],
      projectionEndAge: endAge,
    },
    expenses: { livingAnnual: 20000, retirementSpending: { kind: "amount", annual: 20000 } },
    assumptions: { inflationRate: 0 },
    portfolios: [{ id: "portfolio-1", name: "Share portfolio", value: 100000, expectedReturn: 0 }],
  };
}

describe("buildBridgeChartSeries, example B1", () => {
  const projection = completeProjection(exampleB(60));

  it("has a point for every year, to the plan-until age", () => {
    const { points } = buildBridgeChartSeries(projection, "nominal");

    expect(points).toHaveLength(12);
    expect(points[0]).toMatchObject({ year: 2026, age: 55 });
    expect(points[11]).toMatchObject({ year: 2037, age: 66 });
  });

  it("stacks outside super (portfolio plus cash) under super, from the plan's own figures", () => {
    const { points, series } = buildBridgeChartSeries(projection, "nominal");

    expect(series.map((oneSeries) => oneSeries.key)).toEqual([OUTSIDE_SUPER_KEY, SUPER_KEY]);

    // The portfolio pays 2028 to 2032 ($80,000, $60,000, $40,000, $20,000, $0), then super pays 2033 to 2037.
    const outside = points.map((point) => point.values[OUTSIDE_SUPER_KEY]);
    const superBalance = points.map((point) => point.values[SUPER_KEY]);
    expect(outside).toEqual([100000, 100000, 80000, 60000, 40000, 20000, 0, 0, 0, 0, 0, 0]);
    expect(superBalance).toEqual([
      100000, 100000, 100000, 100000, 100000, 100000, 100000, 80000, 60000, 40000, 20000, 0,
    ]);
  });

  it("includes cash in outside super", () => {
    const withCash = completeProjection({ ...exampleB(60), cash: { balance: 5000 } });
    const { points } = buildBridgeChartSeries(withCash, "nominal");

    expect(points[0]?.values[OUTSIDE_SUPER_KEY]).toBe(105000);
  });

  it("shades the bridge years, 2028 to 2030, and labels the band 'Bridge'", () => {
    const { bands } = buildBridgeChartSeries(projection, "nominal");

    expect(bands).toEqual([{ fromYear: 2028, toYear: 2030, label: "Bridge" }]);
  });
});

describe("buildBridgeChartSeries, example B2 and B3", () => {
  it("B2: the bridge band runs 2028 to 2035 when super opens at the default 65", () => {
    const { bands } = buildBridgeChartSeries(completeProjection(exampleB(undefined)), "nominal");

    expect(bands).toEqual([{ fromYear: 2028, toYear: 2035, label: "Bridge" }]);
  });

  it("B3: no band when you retire at or after the access age", () => {
    const { bands } = buildBridgeChartSeries(completeProjection(exampleB(60, 61, 64)), "nominal");

    expect(bands).toEqual([]);
  });
});

describe("buildBridgeChartSeries, dollars mode", () => {
  const inflating: Plan = {
    ...exampleB(60),
    assumptions: { inflationRate: 0.025 },
  };

  it("divides each year's values by its own inflation index in today's dollars", () => {
    const projection = completeProjection(inflating);
    const nominal = buildBridgeChartSeries(projection, "nominal").points;
    const today = buildBridgeChartSeries(projection, "today").points;

    projection.rows.forEach((row, index) => {
      expect(today[index]?.values[SUPER_KEY]).toBeCloseTo(
        (nominal[index]?.values[SUPER_KEY] ?? 0) / row.inflationIndex,
        6,
      );
      expect(today[index]?.values[OUTSIDE_SUPER_KEY]).toBeCloseTo(
        (nominal[index]?.values[OUTSIDE_SUPER_KEY] ?? 0) / row.inflationIndex,
        6,
      );
    });

    // Today's dollars equal nominal in the first year, where the index is 1.
    expect(today[0]).toEqual(nominal[0]);
  });
});
