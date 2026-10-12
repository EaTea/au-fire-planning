// A line chart of one or more series by calendar year, with vertical markers
// (e.g. "FI reached"), shaded bands (e.g. years that can't be funded), a hover
// tooltip and click-a-year. It is the only file that talks to Recharts, so a
// later chart (M4, M13, M16) reuses it and a library change stays in one place.
//
//   fireChart.ts ─► props (points, series, markers, bands) ─► TimeSeriesChart
//                                                             ├─ Recharts line chart (a picture)
//                                                             ├─ HTML legend
//                                                             └─ visually hidden table (same data)
//
// Colours are not props. SVG presentation attributes can't read `var(--…)`,
// so each series carries a CSS class, and app.css sets its colour from the
// chart role variables in tokens.css.

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipContentProps } from "recharts";

import { formatDollars } from "../format";

/** One year of the chart: its calendar year, the person's age, and a value for each series. */
export interface TimeSeriesPoint {
  readonly year: number;
  readonly age: number;
  /** Value of each series in this year, keyed by `TimeSeriesSeries.key`. */
  readonly values: Readonly<Record<string, number>>;
}

/** How a series' line is drawn. */
export type StrokeStyle = "solid" | "dashed" | "dotted";

/** The SVG `stroke-dasharray` for each stroke style; `undefined` draws a solid line. */
const strokeDashArrays: Record<StrokeStyle, string | undefined> = {
  solid: undefined,
  dashed: "8 5",
  // Near-zero dashes with round caps (see `strokeLinecap` below) render as dots.
  dotted: "0.1 6",
};

/** One line on the chart. */
export interface TimeSeriesSeries {
  /** Which entry of each point's `values` this line draws. */
  readonly key: string;
  /** Shown in the legend, tooltip and hidden table. */
  readonly label: string;
  /** CSS class that sets the line's colour (see app.css); never an inline colour. */
  readonly className: string;
  /**
   * How the line is drawn, so lines differ by more than colour. Defaults to
   * solid. Dotted is round dots, so it can't be mistaken for the vertical
   * markers, which are short dashes and labelled.
   */
  readonly strokeStyle?: StrokeStyle;
}

/** A vertical line at one year, with a label (e.g. "FI reached"). */
export interface TimeSeriesMarker {
  readonly year: number;
  readonly label: string;
}

/** A shaded stretch of years, with a label (e.g. "Shortfall"). Both ends are included. */
export interface TimeSeriesBand {
  readonly fromYear: number;
  readonly toYear: number;
  readonly label: string;
}

/** What TimeSeriesChart needs. */
interface TimeSeriesChartProps {
  /** Names the chart for assistive technology. */
  readonly label: string;
  readonly points: readonly TimeSeriesPoint[];
  readonly series: readonly TimeSeriesSeries[];
  readonly markers?: readonly TimeSeriesMarker[];
  readonly bands?: readonly TimeSeriesBand[];
  /** Called with the calendar year when the chart is clicked. Omit for a chart that isn't clickable. */
  readonly onSelectYear?: (year: number) => void;
  /** Formats a value for the tooltip and hidden table. Defaults to whole dollars. */
  readonly formatValue?: (value: number) => string;
  /**
   * Fixed size in pixels. Tests pass these because jsdom has no layout; the
   * real page leaves them out and the chart fills its container.
   */
  readonly width?: number;
  readonly height?: number;
}

/** Height of the chart when it fills its container, in pixels. */
export const DEFAULT_CHART_HEIGHT = 340;

const compactDollarFormatter = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Short money for the value axis, e.g. 2150000 becomes "$2.2M". Also used by StackedAreaChart. */
export function formatAxisDollars(value: number): string {
  return compactDollarFormatter.format(value);
}

/**
 * The chart. Draws the series as lines against the calendar year, and also
 * renders a legend and a visually hidden table of the same figures, so the
 * numbers are available to screen readers and not only in the picture.
 * Hovering shows the year, age and each series' value; clicking calls
 * `onSelectYear`. Used by FireChartSection and CoastChartSection on Results.
 */
export function TimeSeriesChart({
  label,
  points,
  series,
  markers = [],
  bands = [],
  onSelectYear,
  formatValue = formatDollars,
  width,
  height,
}: TimeSeriesChartProps) {
  const firstYear = points[0]?.year ?? 0;
  const lastYear = points[points.length - 1]?.year ?? 0;

  // Markers are labelled alternately to the left and right of their line, so
  // neighbours such as "FI reached" and "Retirement" don't print on top of each other.
  const sortedMarkers = [...markers].sort((first, second) => first.year - second.year);

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
      <YAxis tickFormatter={formatAxisDollars} width={64} domain={[0, "auto"]} />

      {bands.map((band) => (
        <ReferenceArea
          key={`band-${band.fromYear}-${band.toYear}`}
          x1={Math.max(firstYear, band.fromYear - 0.5)}
          x2={Math.min(lastYear, band.toYear + 0.5)}
          className="chart-band"
          label={{ value: band.label, position: "insideTop", className: "chart-band-label" }}
        />
      ))}

      {sortedMarkers.map((marker, index) => (
        <ReferenceLine
          key={`marker-${marker.year}-${marker.label}`}
          x={marker.year}
          className="chart-marker"
          label={{
            value: marker.label,
            position: "top",
            // Anchored to the end or the start of the text, so the label sits left or right of its line.
            textAnchor: index % 2 === 0 ? "end" : "start",
            dx: index % 2 === 0 ? -4 : 4,
            className: "chart-marker-label",
          }}
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
        <Line
          key={oneSeries.key}
          type="monotone"
          dataKey={(point: TimeSeriesPoint) => point.values[oneSeries.key]}
          name={oneSeries.label}
          className={oneSeries.className}
          strokeDasharray={strokeDashArrays[oneSeries.strokeStyle ?? "solid"]}
          strokeLinecap={oneSeries.strokeStyle === "dotted" ? "round" : undefined}
          dot={false}
          activeDot={false}
          isAnimationActive={false}
        />
      ))}
    </>
  );

  // The right margin leaves room for a label right of a marker on the last year ("Retirement").
  const chartMargin = { top: 28, right: 64, bottom: 4, left: 0 };

  return (
    <figure className="time-series-chart">
      <ul className="chart-legend" aria-label="Legend">
        {series.map((oneSeries) => (
          <li key={oneSeries.key} className={oneSeries.className}>
            <span
              className={`chart-swatch chart-swatch-${oneSeries.strokeStyle ?? "solid"}`}
              aria-hidden="true"
            />
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
          <LineChart
            width={width}
            height={height}
            data={points as TimeSeriesPoint[]}
            margin={chartMargin}
            accessibilityLayer={false}
            onClick={handleChartClick}
          >
            {chartContents}
          </LineChart>
        ) : (
          <ResponsiveContainer width="100%" height={DEFAULT_CHART_HEIGHT}>
            <LineChart
              data={points as TimeSeriesPoint[]}
              margin={chartMargin}
              accessibilityLayer={false}
              onClick={handleChartClick}
            >
              {chartContents}
            </LineChart>
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

/** What ChartTooltip needs: Recharts' hover state, plus how to name and format the series. */
interface ChartTooltipProps {
  readonly tooltipProps: TooltipContentProps;
  readonly series: readonly TimeSeriesSeries[];
  readonly formatValue: (value: number) => string;
}

/**
 * The box shown while hovering a year: the year and age, then each series'
 * value. Passed to Recharts' Tooltip as its content, so it styles with the
 * app's CSS rather than Recharts' defaults. Renders nothing when no year is hovered.
 * Also used by StackedAreaChart, whose series have the same shape.
 */
export function ChartTooltip({ tooltipProps, series, formatValue }: ChartTooltipProps) {
  const hoveredPoint = tooltipProps.payload?.[0]?.payload as TimeSeriesPoint | undefined;
  if (tooltipProps.active !== true || hoveredPoint === undefined) return null;

  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-title">
        {hoveredPoint.year} · age {hoveredPoint.age}
      </div>
      {series.map((oneSeries) => (
        <div key={oneSeries.key} className="chart-tooltip-row">
          <span>{oneSeries.label}</span>
          <span>{formatValue(hoveredPoint.values[oneSeries.key] ?? 0)}</span>
        </div>
      ))}
    </div>
  );
}
