import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TimeSeriesChart, type TimeSeriesPoint, type TimeSeriesSeries } from "./TimeSeriesChart";

const points: TimeSeriesPoint[] = [
  { year: 2026, age: 34, values: { mine: 100, goal: 500 } },
  { year: 2027, age: 35, values: { mine: 250, goal: 520 } },
  { year: 2028, age: 36, values: { mine: 600, goal: 540 } },
];

const series: TimeSeriesSeries[] = [
  { key: "mine", label: "My money", className: "chart-series-investable" },
  { key: "goal", label: "The goal", className: "chart-series-fi-number", strokeStyle: "dashed" },
];

/** Renders the chart at a fixed size (jsdom has no layout) with a marker and a band. */
function renderChart() {
  return render(
    <TimeSeriesChart
      label="Money against goal"
      points={points}
      series={series}
      markers={[{ year: 2027, label: "Halfway" }]}
      bands={[{ fromYear: 2026, toYear: 2026, label: "Short" }]}
      width={600}
      height={300}
    />,
  );
}

describe("TimeSeriesChart", () => {
  it("is one named image, with a legend entry per series", () => {
    renderChart();

    expect(screen.getByRole("img", { name: "Money against goal" })).toBeInTheDocument();

    const legend = screen.getByRole("list", { name: "Legend" });
    expect(within(legend).getByText("My money")).toBeInTheDocument();
    expect(within(legend).getByText("The goal")).toBeInTheDocument();
  });

  it("draws a line per series, with the series' class so CSS can colour it", () => {
    const { container } = renderChart();

    expect(container.querySelectorAll(".recharts-line")).toHaveLength(2);
    expect(container.querySelector(".recharts-line.chart-series-investable")).not.toBeNull();
    expect(container.querySelector(".recharts-line.chart-series-fi-number")).not.toBeNull();
  });

  it("draws solid, dashed and dotted lines differently, and mirrors that in the legend", () => {
    const styled: TimeSeriesSeries[] = [
      { key: "mine", label: "Solid", className: "chart-series-investable" },
      { key: "goal", label: "Dashed", className: "chart-series-fi-number", strokeStyle: "dashed" },
      { key: "mine", label: "Dotted", className: "chart-series-savings", strokeStyle: "dotted" },
    ];
    const { container } = render(
      <TimeSeriesChart label="Styles" points={points} series={styled} width={600} height={300} />,
    );

    const dashArrays = Array.from(container.querySelectorAll(".recharts-line-curve")).map((line) =>
      line.getAttribute("stroke-dasharray"),
    );
    expect(dashArrays).toEqual([null, "8 5", "0.1 6"]);
    expect(container.querySelector(".chart-swatch-solid")).not.toBeNull();
    expect(container.querySelector(".chart-swatch-dashed")).not.toBeNull();
    expect(container.querySelector(".chart-swatch-dotted")).not.toBeNull();
  });

  it("draws the marker and the band with their labels", () => {
    const { container } = renderChart();

    expect(container.querySelector(".chart-marker")).not.toBeNull();
    expect(container.querySelector(".chart-band")).not.toBeNull();
    expect(screen.getByText("Halfway")).toBeInTheDocument();
    expect(screen.getByText("Short")).toBeInTheDocument();
  });

  it("has a hidden table with every year, age and value", () => {
    renderChart();

    const table = screen.getByRole("table", { name: "Money against goal: data" });
    const rows = within(table)
      .getAllByRole("row")
      .map((row) => row.textContent);

    expect(rows).toEqual([
      "YearAgeMy moneyThe goal",
      "202634$100$500",
      "202735$250$520",
      "202836$600$540",
    ]);
  });
});
