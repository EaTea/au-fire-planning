import { useNavigate } from "react-router";

import type { ProjectionSummary } from "../../engine/fiNumber";
import { buildFireChartSeries } from "../charts/fireChart";
import { Card } from "../components/Card";
import { TimeSeriesChart } from "../components/TimeSeriesChart";
import { useDollarsMode } from "../dollarsMode";
import { steps } from "../navigation/steps";

/** The complete variant of the projection summary: the only one with a chart to draw. */
type CompleteProjection = Extract<ProjectionSummary, { status: "complete" }>;

const resultsStep = steps.find((candidate) => candidate.id === "results")!;

/** The id of the chart's card, the target of Results' "FIRE chart" link (`?view=fire-chart`). */
export const FIRE_CHART_SECTION_ID = "fire-chart";

/** What FireChartSection needs. */
interface FireChartSectionProps {
  readonly projection: CompleteProjection;
  /** Fixed chart size in pixels, for tests (jsdom has no layout). Omit on the real page. */
  readonly chartSize?: { readonly width: number; readonly height: number };
}

/**
 * Chart (a) on Results (FIRE-7): investable net worth against the FI number,
 * year by year, with markers for the FI year and retirement and a band on
 * years that can't be funded. The chart's values follow the dollars toggle in
 * Results' page header. Clicking a year scrolls down to that row in the Year
 * by year section on the same page (`?year=`). Rendered by ResultsScreen only
 * when the projection is complete.
 */
export function FireChartSection({ projection, chartSize }: FireChartSectionProps) {
  const { mode } = useDollarsMode();
  const navigate = useNavigate();

  const chartData = buildFireChartSeries(projection, mode);

  return (
    <Card title="Investable net worth vs FI number" id={FIRE_CHART_SECTION_ID}>
      <TimeSeriesChart
        label="Investable net worth against the FI number, by year"
        points={chartData.points}
        series={chartData.series}
        markers={chartData.markers}
        bands={chartData.bands}
        onSelectYear={(year) => navigate(`${resultsStep.path}?year=${year}`)}
        width={chartSize?.width}
        height={chartSize?.height}
      />
      <p className="chart-hint">Click a year to see it in the Year by year table below.</p>
    </Card>
  );
}
