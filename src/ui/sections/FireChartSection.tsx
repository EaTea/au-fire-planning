import { useNavigate } from "react-router";

import type { ProjectionSummary } from "../../engine/fiNumber";
import { buildFireChartSeries } from "../charts/fireChart";
import { Card } from "../components/Card";
import { TimeSeriesChart } from "../components/TimeSeriesChart";
import { DollarsModeToggle, useDollarsMode } from "../dollarsMode";
import { steps } from "../navigation/steps";

/** The complete variant of the projection summary: the only one with a chart to draw. */
type CompleteProjection = Extract<ProjectionSummary, { status: "complete" }>;

const yearByYearStep = steps.find((candidate) => candidate.id === "year-by-year")!;

/** What FireChartSection needs. */
interface FireChartSectionProps {
  readonly projection: CompleteProjection;
  /** Fixed chart size in pixels, for tests (jsdom has no layout). Omit on the real page. */
  readonly chartSize?: { readonly width: number; readonly height: number };
}

/**
 * Chart (a) on Results (FIRE-7): investable net worth against the FI number,
 * year by year, with markers for the FI year and retirement and a band on
 * years that can't be funded. The chart's values depend on the dollars mode,
 * so the card's header holds the today's/nominal toggle. Clicking a year
 * opens Year by year scrolled to that row. Rendered by ResultsScreen only
 * when the projection is complete.
 */
export function FireChartSection({ projection, chartSize }: FireChartSectionProps) {
  const { mode } = useDollarsMode();
  const navigate = useNavigate();

  const chartData = buildFireChartSeries(projection, mode);

  return (
    <Card title="Investable net worth vs FI number" headerAction={<DollarsModeToggle />}>
      <TimeSeriesChart
        label="Investable net worth against the FI number, by year"
        points={chartData.points}
        series={chartData.series}
        markers={chartData.markers}
        bands={chartData.bands}
        onSelectYear={(year) => navigate(`${yearByYearStep.path}?year=${year}`)}
        width={chartSize?.width}
        height={chartSize?.height}
      />
      <p className="chart-hint">Click a year to see it in Year by year.</p>
    </Card>
  );
}
