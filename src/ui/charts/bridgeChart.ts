// Builds the data for chart (b) on Results (FIRE-7): "Bridge period: outside
// super, then super", the two balances stacked by year with the bridge years
// shaded.
//
//   PlanSummary.projection ──► buildBridgeChartSeries(projection, dollarsMode)
//                                   │
//                                   ▼
//             { points, series, bands } ──► StackedAreaChart props
//
//   stack:  super                 (top)
//           outside super         (bottom: portfolio + cash)
//
// A pure function, like fireChart.ts, so unit tests check the figures.

import type { ProjectionSummary } from "../../engine/fiNumber";
import type {
  TimeSeriesBand,
  TimeSeriesPoint,
  TimeSeriesSeries,
} from "../components/TimeSeriesChart";
import type { DollarsMode } from "../dollarsMode";

/** The complete variant of the projection summary: the only one with rows and a bridge check. */
type CompleteProjection = Extract<ProjectionSummary, { status: "complete" }>;

/** Everything StackedAreaChart needs to draw chart (b), apart from its name and click handler. */
export interface BridgeChartData {
  readonly points: readonly TimeSeriesPoint[];
  readonly series: readonly TimeSeriesSeries[];
  readonly bands: readonly TimeSeriesBand[];
}

/** Keys of the two series in each point's `values`. */
export const OUTSIDE_SUPER_KEY = "outsideSuper";
export const SUPER_KEY = "super";

/**
 * Turns the projection into chart data in the chosen dollars: for every year,
 * the end-of-year balance outside super (portfolio plus cash) and in super.
 * In today's dollars each row's nominal value is divided by its inflation
 * index. There is one band, "Bridge", over the bridge years, and none when
 * there is no bridge. Called by BridgeSection.
 */
export function buildBridgeChartSeries(
  projection: CompleteProjection,
  dollarsMode: DollarsMode,
): BridgeChartData {
  /** Converts a row's nominal value to the chosen dollars. */
  const inChosenDollars = (nominalValue: number, inflationIndex: number): number =>
    dollarsMode === "today" ? nominalValue / inflationIndex : nominalValue;

  const points: TimeSeriesPoint[] = projection.rows.map((row) => ({
    year: row.calendarYear,
    age: row.age,
    values: {
      [OUTSIDE_SUPER_KEY]: inChosenDollars(
        row.portfolioClosing + row.cashClosing,
        row.inflationIndex,
      ),
      [SUPER_KEY]: inChosenDollars(row.superClosing, row.inflationIndex),
    },
  }));

  // Outside super is first, so it is the bottom of the stack.
  const series: TimeSeriesSeries[] = [
    {
      key: OUTSIDE_SUPER_KEY,
      label: "Outside super (portfolio and cash)",
      className: "chart-series-outside-super",
    },
    { key: SUPER_KEY, label: "Super", className: "chart-series-super" },
  ];

  const { bridge } = projection.bridge;
  const bands: TimeSeriesBand[] =
    bridge === undefined
      ? []
      : [{ fromYear: bridge.firstYear, toYear: bridge.lastYear, label: "Bridge" }];

  return { points, series, bands };
}
