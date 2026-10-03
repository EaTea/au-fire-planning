import { useNavigate } from "react-router";

import type { ProjectionSummary } from "../../engine/fiNumber";
import { buildCoastChartSeries, describeCoastChartEnd } from "../charts/coastChart";
import { Card } from "../components/Card";
import { TimeSeriesChart } from "../components/TimeSeriesChart";
import { useDollarsMode } from "../dollarsMode";
import { formatDollars } from "../format";
import { steps } from "../navigation/steps";

/** The complete variant of the projection summary: the only one with a Coast FIRE path. */
type CompleteProjection = Extract<ProjectionSummary, { status: "complete" }>;

const resultsStep = steps.find((candidate) => candidate.id === "results")!;

/** The id of the card, the target of Results' "Coast FIRE chart" link (`?view=coast-chart`). */
export const COAST_CHART_SECTION_ID = "coast-chart";

/** What CoastChartSection needs. */
interface CoastChartSectionProps {
  readonly projection: CompleteProjection;
  /** Fixed chart size in pixels, for tests (jsdom has no layout). Omit on the real page. */
  readonly chartSize?: { readonly width: number; readonly height: number };
}

/**
 * The "When could you stop contributing?" chart on Results (COAST-6): your
 * savings, today's savings with no more contributions, the Coast FIRE number
 * and the FI number, from today to the target retirement year. Its lines
 * follow the dollars toggle in the page header (it has none of its own). The
 * caption is always nominal and says so. Clicking a year scrolls to that
 * row of the Year by year section (`?year=`). Rendered by ResultsScreen,
 * after chart (a), only when the projection is complete.
 */
export function CoastChartSection({ projection, chartSize }: CoastChartSectionProps) {
  const { mode } = useDollarsMode();
  const navigate = useNavigate();

  const chartData = buildCoastChartSeries(projection.coast, mode);
  const end = describeCoastChartEnd(projection.coast);

  return (
    <Card title="When could you stop contributing?" id={COAST_CHART_SECTION_ID}>
      <TimeSeriesChart
        label="Savings with and without further contributions against the Coast FIRE number and the FI number, by year"
        points={chartData.points}
        series={chartData.series}
        markers={chartData.markers}
        onSelectYear={(year) => navigate(`${resultsStep.path}?year=${year}`)}
        width={chartSize?.width}
        height={chartSize?.height}
      />

      {end !== undefined && (
        <p className="chart-hint">
          With no more contributions from today, your savings reach {formatDollars(end.savings)} by{" "}
          {end.year}, against an FI number of {formatDollars(end.fiNumber)} (nominal dollars).
        </p>
      )}
    </Card>
  );
}
