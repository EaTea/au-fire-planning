import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { axisTopWithHeadroom, StackedAreaChart } from "./StackedAreaChart";
import type { TimeSeriesPoint, TimeSeriesSeries } from "./TimeSeriesChart";

const points: TimeSeriesPoint[] = [
  { year: 2026, age: 34, values: { outside: 100, super: 50 } },
  { year: 2027, age: 35, values: { outside: 80, super: 60 } },
  { year: 2028, age: 36, values: { outside: 0, super: 70 } },
];

const series: TimeSeriesSeries[] = [
  { key: "outside", label: "Outside", className: "chart-series-outside-super" },
  { key: "super", label: "Super", className: "chart-series-super" },
];

/** Renders the chart at a fixed size (jsdom has no layout) with one band. */
function renderChart() {
  return render(
    <StackedAreaChart
      label="Two balances"
      points={points}
      series={series}
      bands={[{ fromYear: 2027, toYear: 2028, label: "Bridge" }]}
      width={600}
      height={300}
    />,
  );
}

describe("StackedAreaChart", () => {
  it("is one named image, with a legend entry per series", () => {
    renderChart();

    expect(screen.getByRole("img", { name: "Two balances" })).toBeInTheDocument();

    const legend = screen.getByRole("list", { name: "Legend" });
    expect(within(legend).getByText("Outside")).toBeInTheDocument();
    expect(within(legend).getByText("Super")).toBeInTheDocument();
  });

  it("draws an area per series with the series' class, so CSS can fill it", () => {
    const { container } = renderChart();

    expect(container.querySelectorAll(".recharts-area")).toHaveLength(2);
    expect(container.querySelector(".recharts-area.chart-series-outside-super")).not.toBeNull();
    expect(container.querySelector(".recharts-area.chart-series-super")).not.toBeNull();
  });

  it("draws the shaded band with its label", async () => {
    const { container } = renderChart();

    // The band is on its own layer above the areas, which Recharts mounts after the first render.
    expect(await screen.findByText("Bridge")).toBeInTheDocument();
    expect(container.querySelector(".chart-band")).not.toBeNull();
  });

  it("has a hidden table with every year, age and value", () => {
    renderChart();

    const table = screen.getByRole("table", { name: "Two balances: data" });
    const rows = within(table)
      .getAllByRole("row")
      .map((row) => row.textContent);

    expect(rows).toEqual(["YearAgeOutsideSuper", "202634$100$50", "202735$80$60", "202836$0$70"]);
  });
});

describe("axisTopWithHeadroom", () => {
  it.each([
    [200000, 240000],
    [100000, 120000],
    [3000000, 4000000],
    [1, 1.2],
  ])("tops a stack of %d at %d, a whole number of round steps", (tallestStack, expectedTop) => {
    expect(axisTopWithHeadroom(tallestStack)).toBeCloseTo(expectedTop, 6);
  });

  it("always leaves at least 15% headroom", () => {
    for (const tallestStack of [1234, 98765, 2999659, 7821132]) {
      expect(axisTopWithHeadroom(tallestStack)).toBeGreaterThanOrEqual(tallestStack * 1.15);
    }
  });

  it("has a positive top for an empty chart", () => {
    expect(axisTopWithHeadroom(0)).toBeGreaterThan(0);
  });
});
