import { useNavigate } from "react-router";

import { projectionHasSuper, type BridgePart } from "../../engine/bridge";
import type { Explained } from "../../engine/explained";
import type { ProjectionSummary } from "../../engine/fiNumber";
import { buildBridgeChartSeries } from "../charts/bridgeChart";
import { Card } from "../components/Card";
import { StackedAreaChart } from "../components/StackedAreaChart";
import { StatusMeter } from "../components/StatusMeter";
import { useDollarsMode, useMoneyFormatter, type DollarsMode } from "../dollarsMode";
import { formatYearRuns } from "../format";
import { steps } from "../navigation/steps";

const resultsStep = steps.find((candidate) => candidate.id === "results")!;

/** The complete variant of the projection summary: the only one with a bridge check. */
type CompleteProjection = Extract<ProjectionSummary, { status: "complete" }>;

/** The id of the card, the target of Results' "Can you bridge to super?" link (`?view=bridge`). */
export const BRIDGE_SECTION_ID = "bridge";

/**
 * Whether the section has anything to say: the plan has super (see
 * `projectionHasSuper`) and at
 * least one of the two parts exists. ResultsScreen uses this to decide both
 * whether to render the card and whether to offer its "On this page" link.
 */
export function hasBridgeSection(projection: CompleteProjection): boolean {
  const { bridge } = projection;

  return (
    projectionHasSuper(projection.rows) &&
    bridge.effectiveAccessAge !== undefined &&
    (bridge.bridge !== undefined || bridge.afterAccess !== undefined)
  );
}

/**
 * Joins a part's need working and projected working into one breakdown for a
 * meter, with every dollar line shown in the page's dollars. The engine's
 * lines are nominal dollars of the part's base row; in today's dollars they
 * are divided by that row's inflation index, so the last line matches the
 * figures on the meter. Used by BridgeMeter.
 */
function explainPart(part: BridgePart, mode: DollarsMode, baseInflationIndex: number): Explained {
  const divisor = mode === "today" ? baseInflationIndex : 1;

  const lines = [...part.need.lines, ...part.projected.lines].map((line) =>
    line.unit === "dollars" ? { ...line, value: line.value / divisor } : line,
  );

  // The meter's headline is the projected amount, so the working ends there.
  return { value: part.projected.value / divisor, unit: "dollars", lines };
}

/**
 * A part's own years for its heading: "2028 – 2035", or just "2036" when the
 * part is a single year. Matches the years in the breakdowns. Used by BridgeSection.
 */
function formatPartYears(part: BridgePart): string {
  return part.firstYear === part.lastYear
    ? String(part.firstYear)
    : `${part.firstYear} – ${part.lastYear}`;
}

/** What BridgeMeter needs. */
interface BridgeMeterProps {
  readonly label: string;
  readonly part: BridgePart;
  /** The inflation index of the row the part's figures are stated at (the row before the part starts). */
  readonly baseInflationIndex: number;
  readonly baseYear: number;
}

/**
 * One status meter of the check: the part's need against its projected
 * amount, MET or SHORT in words, the years that can't be funded when SHORT,
 * and the working behind both figures. Money follows the dollars toggle, using
 * the inflation index of the year the figures are stated at. Used twice by
 * BridgeSection.
 */
function BridgeMeter({ label, part, baseInflationIndex, baseYear }: BridgeMeterProps) {
  const { mode } = useDollarsMode();
  const formatMoney = useMoneyFormatter();

  const needAmount = mode === "today" ? part.need.value / baseInflationIndex : part.need.value;
  const projectedAmount =
    mode === "today" ? part.projected.value / baseInflationIndex : part.projected.value;

  return (
    <StatusMeter
      label={label}
      kind={part.status}
      statusWord={part.status === "met" ? "MET" : "SHORT"}
      need={{ amount: needAmount, text: formatMoney(part.need.value, baseInflationIndex) }}
      needNote={`in ${baseYear}`}
      projected={{
        amount: projectedAmount,
        text: formatMoney(part.projected.value, baseInflationIndex),
      }}
      detail={
        part.shortYears.length > 0 ? `short in ${formatYearRuns(part.shortYears)}` : undefined
      }
      explanation={explainPart(part, mode, baseInflationIndex)}
    />
  );
}

/** What BridgeSection needs. */
interface BridgeSectionProps {
  readonly projection: CompleteProjection;
  /** Fixed chart size in pixels, for tests (jsdom has no layout). Omit on the real page. */
  readonly chartSize?: { readonly width: number; readonly height: number };
}

/**
 * The "Can you bridge to super?" card on Results (FIRE-4, FIRE-7 chart (b)): two status meters,
 * the bridge (outside super, from retirement until super opens) and the years
 * after super is accessible (super plus what is left outside). The statuses
 * are the engine's `assessBridge` answers. Without a bridge (retiring at or
 * after the access age) it says so and shows only the second meter; if the
 * plan ends before super opens it shows only the bridge. Below the meters is
 * chart (b), outside super and super stacked by year with the bridge years
 * shaded; it follows the page's dollars toggle, and clicking a year scrolls to
 * that row of Year by year (`?year=`). Rendered by ResultsScreen after chart
 * (a), and only when `hasBridgeSection` is true.
 */
export function BridgeSection({ projection, chartSize }: BridgeSectionProps) {
  const { mode } = useDollarsMode();
  const navigate = useNavigate();

  if (!hasBridgeSection(projection)) return null;

  const chartData = buildBridgeChartSeries(projection, mode);

  const { bridge, afterAccess } = projection.bridge;
  const accessAge = projection.bridge.effectiveAccessAge as number;

  // The row a part's figures are stated at is the one before its first year.
  const inflationIndexBefore = (part: BridgePart): number =>
    projection.rows.find((row) => row.calendarYear === part.firstYear - 1)?.inflationIndex ?? 1;

  const lastRow = projection.rows[projection.rows.length - 1];

  return (
    <Card title="Can you bridge to super?" id={BRIDGE_SECTION_ID}>
      {bridge === undefined && (
        <p className="section-intro">No bridge needed: super is accessible when you retire.</p>
      )}

      {bridge !== undefined && (
        <BridgeMeter
          label={`Bridge: outside super, ${formatPartYears(bridge)}`}
          part={bridge}
          baseInflationIndex={inflationIndexBefore(bridge)}
          baseYear={bridge.firstYear - 1}
        />
      )}

      {afterAccess !== undefined && (
        <BridgeMeter
          label={`After super is accessible, ${formatPartYears(afterAccess)}`}
          part={afterAccess}
          baseInflationIndex={inflationIndexBefore(afterAccess)}
          baseYear={afterAccess.firstYear - 1}
        />
      )}

      {afterAccess === undefined && (
        <p className="section-intro">
          Super isn&apos;t accessible until age {accessAge}, after your plan ends
          {lastRow === undefined ? "" : ` in ${lastRow.calendarYear}`}.
        </p>
      )}

      <h4 className="chart-title">Bridge period: outside super, then super</h4>
      <StackedAreaChart
        label="Outside super and super balances, stacked by year, with the bridge years shaded"
        points={chartData.points}
        series={chartData.series}
        bands={chartData.bands}
        onSelectYear={(year) => navigate(`${resultsStep.path}?year=${year}`)}
        width={chartSize?.width}
        height={chartSize?.height}
      />
      <p className="chart-hint">Click a year to see it in the Year by year table below.</p>
    </Card>
  );
}
