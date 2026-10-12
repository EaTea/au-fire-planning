import type { CoastSplitPart } from "../../engine/coastSplit";
import { projectionHasSuper } from "../../engine/bridge";
import type { ProjectionSummary } from "../../engine/fiNumber";
import { Card } from "../components/Card";
import { StatusMeter } from "../components/StatusMeter";
import { formatDollars } from "../format";

/** The complete variant of the projection summary: the only one with a Coast FIRE split. */
type CompleteProjection = Extract<ProjectionSummary, { status: "complete" }>;

/** The id of the card, the target of Results' "Super and outside super" link (`?view=coast-split`). */
export const COAST_SPLIT_SECTION_ID = "coast-split";

/**
 * Whether the card has anything to show: the plan has super (the engine
 * always carries an empty account, so see `projectionHasSuper`) and produced
 * at least one of the two tests (outside super needs a bridge, super needs
 * years after access). ResultsScreen uses this to decide both whether to render the card
 * and whether to offer its "On this page" link.
 */
export function hasCoastSplitSection(projection: CompleteProjection): boolean {
  const { split } = projection.coast;

  return (
    projectionHasSuper(projection.rows) &&
    (split.outside !== undefined || split.super !== undefined)
  );
}

/**
 * The status in words: "Coasting since 2026" when the test was already passed
 * today, "Coasting from 2039" when it is passed in a later year, and "Not
 * before retirement" otherwise. Used by CoastSplitMeter.
 */
function describeSplitStatus(part: CoastSplitPart): string {
  if (part.reached === undefined) return "Not before retirement";
  if (part.reached.yearIndex === 0) return `Coasting since ${part.reached.calendarYear}`;

  return `Coasting from ${part.reached.calendarYear}`;
}

/** What CoastSplitMeter needs. */
interface CoastSplitMeterProps {
  readonly label: string;
  readonly part: CoastSplitPart;
}

/**
 * One of the two stricter Coast FIRE tests as a status meter: what you need
 * today against what you have today, COASTING or NOT YET in words, the age it
 * is reached when that is later than today, and the working behind the need.
 * Figures are always today's (row 0) dollars, like the Coast FIRE tile, so
 * they don't follow the dollars toggle. Used twice by CoastSplitSection.
 */
function CoastSplitMeter({ label, part }: CoastSplitMeterProps) {
  const reachedLater = part.reached !== undefined && part.reached.yearIndex > 0;

  return (
    <StatusMeter
      label={label}
      kind={part.reached === undefined ? "notYet" : "coasting"}
      statusWord={describeSplitStatus(part)}
      need={{ amount: part.needToday.value, text: formatDollars(part.needToday.value) }}
      needNote="today"
      projected={{ amount: part.hasToday, text: formatDollars(part.hasToday) }}
      figureWords={{ need: "Needs", projected: "has" }}
      detail={reachedLater ? `reached at age ${part.reached?.age}` : undefined}
      explanation={part.needToday}
    />
  );
}

/**
 * The "Super and outside super" card on Results (COAST-3, COAST-6 (c)): two
 * separate, stricter Coast FIRE tests under the Coast FIRE chart. Outside
 * super asks whether the portfolio and cash alone can fund the bridge; super
 * asks whether super alone can fund the years after access. The combined Coast
 * FIRE tile stays the overall answer, and the note says so. Either meter is
 * left out when the engine has no such part (no bridge, or no super years after
 * access). Rendered by ResultsScreen after CoastChartSection, only when
 * `hasCoastSplitSection` is true.
 */
export function CoastSplitSection({ projection }: { readonly projection: CompleteProjection }) {
  if (!hasCoastSplitSection(projection)) return null;

  const { outside, super: superPart } = projection.coast.split;

  return (
    <Card title="Super and outside super" id={COAST_SPLIT_SECTION_ID}>
      <p className="section-intro">
        Two stricter tests than Coast FIRE above: can each pot fund its own years on its own, with
        no more contributions (employer super contributions continue)? &quot;Coast FIRE&quot; above
        still answers whether you can stop contributing overall.
      </p>

      {outside !== undefined && (
        <CoastSplitMeter label="Outside super funds the bridge on its own" part={outside} />
      )}

      {superPart !== undefined && (
        <CoastSplitMeter label="Super funds the years after access on its own" part={superPart} />
      )}
    </Card>
  );
}
