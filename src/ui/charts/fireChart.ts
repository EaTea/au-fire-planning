// Builds the data for chart (a) on Results (FIRE-7): investable net worth
// against the FI number, by year.
//
//   PlanSummary.projection ──► buildFireChartSeries(projection, dollarsMode)
//                                   │
//                                   ▼
//        { points, series, markers, bands } ──► TimeSeriesChart props
//
// It is a pure function so unit tests check the figures and the component
// tests only need a smoke test.

import type { ProjectionSummary } from "../../engine/fiNumber";
import type {
  TimeSeriesBand,
  TimeSeriesMarker,
  TimeSeriesPoint,
  TimeSeriesSeries,
} from "../components/TimeSeriesChart";
import type { DollarsMode } from "../dollarsMode";

/** The complete variant of the projection summary: the only one with rows to draw. */
type CompleteProjection = Extract<ProjectionSummary, { status: "complete" }>;

/** Everything TimeSeriesChart needs to draw chart (a), apart from its name and click handler. */
export interface FireChartData {
  readonly points: readonly TimeSeriesPoint[];
  readonly series: readonly TimeSeriesSeries[];
  readonly markers: readonly TimeSeriesMarker[];
  readonly bands: readonly TimeSeriesBand[];
}

/** Keys of the two series in each point's `values`. */
export const INVESTABLE_KEY = "investable";
export const FI_NUMBER_KEY = "fiNumber";

/**
 * Turns the projection into chart data in the chosen dollars. In today's
 * dollars each row's nominal value is divided by its inflation index; in
 * nominal dollars it is shown as is. Markers are the year FI is reached (if
 * it is) and the retirement year; bands are the runs of consecutive years
 * that can't be funded. Called by FireChartSection.
 */
export function buildFireChartSeries(
  projection: CompleteProjection,
  dollarsMode: DollarsMode,
): FireChartData {
  /** Converts a row's nominal value to the chosen dollars. */
  const inChosenDollars = (nominalValue: number, inflationIndex: number): number =>
    dollarsMode === "today" ? nominalValue / inflationIndex : nominalValue;

  const points: TimeSeriesPoint[] = projection.rows.map((row) => ({
    year: row.calendarYear,
    age: row.age,
    values: {
      [INVESTABLE_KEY]: inChosenDollars(row.investableClosing, row.inflationIndex),
      [FI_NUMBER_KEY]: inChosenDollars(row.fiNumber, row.inflationIndex),
    },
  }));

  const series: TimeSeriesSeries[] = [
    { key: INVESTABLE_KEY, label: "Investable net worth", className: "chart-series-investable" },
    { key: FI_NUMBER_KEY, label: "FI number", className: "chart-series-fi-number", dashed: true },
  ];

  return { points, series, markers: buildMarkers(projection), bands: buildBands(projection) };
}

/**
 * The vertical markers: "FI reached" and "Retirement". If both fall in the
 * same year they share one marker so the labels don't overprint.
 */
function buildMarkers(projection: CompleteProjection): TimeSeriesMarker[] {
  const retirementMarker = { year: projection.retirementYear, label: "Retirement" };
  const fiYear = projection.fiReached?.calendarYear;

  if (fiYear === undefined) return [retirementMarker];

  if (fiYear === projection.retirementYear) {
    return [{ year: fiYear, label: "FI reached · retirement" }];
  }

  return [{ year: fiYear, label: "FI reached" }, retirementMarker];
}

/** One band per run of consecutive years in which spending can't be fully funded. */
function buildBands(projection: CompleteProjection): TimeSeriesBand[] {
  const bands: { fromYear: number; toYear: number; label: string }[] = [];

  for (const row of projection.rows) {
    if (row.shortfall <= 0) continue;

    const latestBand = bands[bands.length - 1];
    if (latestBand !== undefined && latestBand.toYear === row.calendarYear - 1) {
      latestBand.toYear = row.calendarYear;
    } else {
      bands.push({ fromYear: row.calendarYear, toYear: row.calendarYear, label: "Shortfall" });
    }
  }

  return bands;
}
