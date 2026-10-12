// A stacked area chart of two or more balances by calendar year, with shaded
// bands (e.g. the bridge years), a hover tooltip and click-a-year. It is
// TimeSeriesChart's sibling for chart (b), "Bridge period: outside super, then
// super", and like it talks to Recharts so no other file has to.
//
//   bridgeChart.ts ─► props (points, series, bands) ─► StackedAreaChart
//                                                      ├─ Recharts area chart (a picture)
//                                                      ├─ HTML legend
//                                                      └─ visually hidden table (same data)
//
// It reuses TimeSeriesChart's point, series and band types, tooltip and axis
// formatting, so the two charts behave and read alike. Series are stacked in
// the order given: the first is at the bottom. Colours are not props: each
// series carries a CSS class, and app.css sets its fill from the chart role
// variables in tokens.css (SVG attributes can't read `var(--…)`).

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatDollars } from "../format";
import {
  ChartTooltip,
  DEFAULT_CHART_HEIGHT,
  formatAxisDollars,
  type TimeSeriesBand,
  type TimeSeriesPoint,
  type TimeSeriesSeries,
} from "./TimeSeriesChart";

/** The value axis runs at least this far above the tallest stack, leaving room for the band's label. */
const AXIS_HEADROOM = 1.15;

/** The value axis is split into this many equal steps (one more tick than steps). */
const AXIS_INTERVALS = 4;

/** Step sizes, as multiples of a power of ten, that read as round numbers on an axis. */
const ROUND_STEP_MULTIPLES = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];

/**
 * The top of the value axis: at least `AXIS_HEADROOM` above the tallest
 * stack, and a whole number of round steps so the ticks read cleanly ($0,
 * $60K, $120K ... rather than $62.5K). Recharts' own rounding is bypassed
 * because a function domain turns it off. Exported for its unit test; used
 * by StackedAreaChart.
 */
export function axisTopWithHeadroom(tallestStack: number): number {
  if (tallestStack <= 0) return 1;

  const minimumStep = (tallestStack * AXIS_HEADROOM) / AXIS_INTERVALS;
  const powerOfTen = 10 ** Math.floor(Math.log10(minimumStep));
  const roundStep =
    ROUND_STEP_MULTIPLES.map((multiple) => multiple * powerOfTen).find(
      (step) => step >= minimumStep,
    ) ?? 10 * powerOfTen;

  return roundStep * AXIS_INTERVALS;
}

/** Recharts' layer for the band: just above the areas, so the shading tints them rather than hiding behind them. */
const BAND_Z_INDEX = 110;

/** What StackedAreaChart needs. The series' `strokeStyle` is ignored: areas are filled, not dashed. */
interface StackedAreaChartProps {
  /** Names the chart for assistive technology. */
  readonly label: string;
  readonly points: readonly TimeSeriesPoint[];
  /** Bottom of the stack first. Each value must be at least 0, since the areas are stacked. */
  readonly series: readonly TimeSeriesSeries[];
  readonly bands?: readonly TimeSeriesBand[];
  /** Called with the calendar year when the chart is clicked. Omit for a chart that isn't clickable. */
  readonly onSelectYear?: (year: number) => void;
  /** Formats a value for the tooltip and hidden table. Defaults to whole dollars. */
  readonly formatValue?: (value: number) => string;
  /** Fixed size in pixels, for tests (jsdom has no layout). The real page leaves them out. */
  readonly width?: number;
  readonly height?: number;
}

/**
 * The chart. Draws each series as a filled area stacked on the ones before
 * it, so the top edge is the total, and also renders a legend and a visually
 * hidden table of the same figures for screen readers. Hovering shows the
 * year, age and each series' own value (not the running total); clicking
 * calls `onSelectYear`. Used by BridgeSection on Results.
 */
export function StackedAreaChart({
  label,
  points,
  series,
  bands = [],
  onSelectYear,
  formatValue = formatDollars,
  width,
  height,
}: StackedAreaChartProps) {
  const firstYear = points[0]?.year ?? 0;
  const lastYear = points[points.length - 1]?.year ?? 0;

  // The tallest stack is the largest total of the series in any one year.
  const tallestStack = Math.max(
    0,
    ...points.map((point) =>
      series.reduce((total, oneSeries) => total + (point.values[oneSeries.key] ?? 0), 0),
    ),
  );

  /** Maps a click on the chart to the year under it, via the index of the hovered point. */
  const handleChartClick = (state: { activeIndex?: string | number | null }) => {
    if (onSelectYear === undefined || state.activeIndex == null) return;

    const clickedPoint = points[Number(state.activeIndex)];
    if (clickedPoint !== undefined) onSelectYear(clickedPoint.year);
  };

  const chartContents = (
    <>
      <CartesianGrid className="chart-grid" vertical={false} />

      <XAxis
        dataKey="year"
        type="number"
        domain={[firstYear, lastYear]}
        allowDecimals={false}
        tickMargin={6}
      />
      {/* Headroom above the tallest stack keeps the band's label on the bare page, where it stays readable. */}
      <YAxis
        tickFormatter={formatAxisDollars}
        width={64}
        domain={[0, axisTopWithHeadroom(tallestStack)]}
        tickCount={AXIS_INTERVALS + 1}
      />

      {bands.map((band) => (
        <ReferenceArea
          key={`band-${band.fromYear}-${band.toYear}`}
          x1={Math.max(firstYear, band.fromYear - 0.5)}
          x2={Math.min(lastYear, band.toYear + 0.5)}
          className="chart-band"
          // Drawn over the areas (which are at 100), or the opaque fills would hide the shading.
          zIndex={BAND_Z_INDEX}
          label={{ value: band.label, position: "insideTop", className: "chart-band-label" }}
        />
      ))}

      <Tooltip
        content={(tooltipProps) => (
          <ChartTooltip tooltipProps={tooltipProps} series={series} formatValue={formatValue} />
        )}
        cursor={{ className: "chart-cursor" }}
        isAnimationActive={false}
      />

      {series.map((oneSeries) => (
        <Area
          key={oneSeries.key}
          type="linear"
          stackId="balances"
          dataKey={(point: TimeSeriesPoint) => point.values[oneSeries.key]}
          name={oneSeries.label}
          className={oneSeries.className}
          dot={false}
          activeDot={false}
          isAnimationActive={false}
        />
      ))}
    </>
  );

  const chartMargin = { top: 28, right: 24, bottom: 4, left: 0 };

  return (
    <figure className="time-series-chart stacked-area-chart">
      <ul className="chart-legend" aria-label="Legend">
        {series.map((oneSeries) => (
          <li key={oneSeries.key} className={oneSeries.className}>
            <span className="chart-swatch chart-swatch-fill" aria-hidden="true" />
            {oneSeries.label}
          </li>
        ))}
      </ul>

      {/* role="img" makes the picture one named object; the table below carries the figures. */}
      <div
        role="img"
        aria-label={label}
        className="chart-picture"
        style={{ cursor: onSelectYear === undefined ? undefined : "pointer" }}
      >
        {width !== undefined && height !== undefined ? (
          <AreaChart
            width={width}
            height={height}
            data={points as TimeSeriesPoint[]}
            margin={chartMargin}
            accessibilityLayer={false}
            onClick={handleChartClick}
          >
            {chartContents}
          </AreaChart>
        ) : (
          <ResponsiveContainer width="100%" height={DEFAULT_CHART_HEIGHT}>
            <AreaChart
              data={points as TimeSeriesPoint[]}
              margin={chartMargin}
              accessibilityLayer={false}
              onClick={handleChartClick}
            >
              {chartContents}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <table className="visually-hidden" aria-label={`${label}: data`}>
        <thead>
          <tr>
            <th scope="col">Year</th>
            <th scope="col">Age</th>
            {series.map((oneSeries) => (
              <th key={oneSeries.key} scope="col">
                {oneSeries.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.year}>
              <th scope="row">{point.year}</th>
              <td>{point.age}</td>
              {series.map((oneSeries) => (
                <td key={oneSeries.key}>{formatValue(point.values[oneSeries.key] ?? 0)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
