// Builds the data for the Coast FIRE chart on Results (COAST-6 (a) and (b)):
// "When could you stop contributing?", from today to the target retirement
// year, with four lines.
//
//   ProjectionSummary.coast ──► buildCoastChartSeries(coast, dollarsMode)
//                                   │
//                                   ▼
//        { points, series, markers } ──► TimeSeriesChart props
//
// A pure function, like fireChart.ts, so unit tests check the figures.

import type { CoastFire } from "../../engine/coastFire";
import type {
  TimeSeriesMarker,
  TimeSeriesPoint,
  TimeSeriesSeries,
} from "../components/TimeSeriesChart";
import type { DollarsMode } from "../dollarsMode";

/** Everything TimeSeriesChart needs to draw the Coast FIRE chart, apart from its name and click handler. */
export interface CoastChartData {
  readonly points: readonly TimeSeriesPoint[];
  readonly series: readonly TimeSeriesSeries[];
  readonly markers: readonly TimeSeriesMarker[];
}

/** Keys of the four series in each point's `values`. */
export const YOUR_SAVINGS_KEY = "yourSavings";
export const NO_CONTRIBUTIONS_KEY = "noContributions";
export const COAST_NUMBER_KEY = "coastNumber";
export const FI_NUMBER_KEY = "fiNumber";

/**
 * Turns the Coast FIRE path into chart data in the chosen dollars. In
 * today's dollars each nominal value is divided by its year's inflation
 * index. Markers are "Coast FIRE" (when reached after today and before
 * retirement) and "Retirement"; if both fall in the retirement year they
 * share one marker. Coast FIRE reached today gets no marker: it would sit on
 * the axis, and the tile and Milestones card already say so. Called by
 * CoastChartSection.
 */
export function buildCoastChartSeries(coast: CoastFire, dollarsMode: DollarsMode): CoastChartData {
  /** Converts a nominal value to the chosen dollars. */
  const inChosenDollars = (nominalValue: number, inflationIndex: number): number =>
    dollarsMode === "today" ? nominalValue / inflationIndex : nominalValue;

  const points: TimeSeriesPoint[] = coast.path.map((point) => ({
    year: point.calendarYear,
    age: point.age,
    values: {
      [YOUR_SAVINGS_KEY]: inChosenDollars(point.investable, point.inflationIndex),
      [NO_CONTRIBUTIONS_KEY]: inChosenDollars(point.withoutContributions, point.inflationIndex),
      [COAST_NUMBER_KEY]: inChosenDollars(point.coastNumber, point.inflationIndex),
      [FI_NUMBER_KEY]: inChosenDollars(point.fiNumber, point.inflationIndex),
    },
  }));

  const series: TimeSeriesSeries[] = [
    {
      key: YOUR_SAVINGS_KEY,
      label: "Your savings, current contributions",
      className: "chart-series-savings",
    },
    {
      key: NO_CONTRIBUTIONS_KEY,
      label: "Today's savings, no more contributions",
      className: "chart-series-no-contributions",
    },
    {
      key: COAST_NUMBER_KEY,
      label: "Coast FIRE number",
      className: "chart-series-coast-number",
      strokeStyle: "dashed",
    },
    {
      key: FI_NUMBER_KEY,
      label: "FI number",
      className: "chart-series-fi-number",
      strokeStyle: "dotted",
    },
  ];

  return { points, series, markers: buildMarkers(coast) };
}

/** The vertical markers: "Coast FIRE" (if reached after today) and "Retirement". */
function buildMarkers(coast: CoastFire): TimeSeriesMarker[] {
  const retirementPoint = coast.path[coast.path.length - 1];
  if (retirementPoint === undefined) return [];

  const retirementMarker = { year: retirementPoint.calendarYear, label: "Retirement" };
  const reached = coast.reached;

  if (reached === undefined || reached.yearIndex === 0) return [retirementMarker];

  if (reached.calendarYear === retirementPoint.calendarYear) {
    return [{ year: reached.calendarYear, label: "Coast FIRE · retirement" }];
  }

  return [{ year: reached.calendarYear, label: "Coast FIRE" }, retirementMarker];
}

/**
 * The caption's two figures, always in nominal dollars: where today's
 * savings end up by the retirement year with no more contributions, and the
 * FI number then. `undefined` for an empty path. Called by CoastChartSection.
 */
export function describeCoastChartEnd(
  coast: CoastFire,
): { readonly year: number; readonly savings: number; readonly fiNumber: number } | undefined {
  const retirementPoint = coast.path[coast.path.length - 1];
  if (retirementPoint === undefined) return undefined;

  return {
    year: retirementPoint.calendarYear,
    savings: retirementPoint.withoutContributions,
    fiNumber: retirementPoint.fiNumber,
  };
}
