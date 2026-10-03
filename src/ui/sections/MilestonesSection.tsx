import type { ProjectionSummary } from "../../engine/fiNumber";
import { Card } from "../components/Card";
import { MilestoneTimeline, type MilestoneItem } from "../components/MilestoneTimeline";

/** The complete variant of the projection summary: the only one with milestones. */
type CompleteProjection = Extract<ProjectionSummary, { status: "complete" }>;

/** The id of the card, the target of Results' "Milestones" link (`?view=milestones`). */
export const MILESTONES_SECTION_ID = "milestones";

/**
 * Reached if the year is today or earlier, otherwise projected. Used by
 * buildMilestoneItems for the items that always have a year.
 */
function statusForYear(year: number, startYear: number): MilestoneItem["status"] {
  return year <= startYear ? "reached" : "projected";
}

/**
 * Turns the projection summary into the timeline's items: Coast FIRE, FI
 * reached, retirement (the target) and whether the money lasts. A milestone
 * that never happens becomes an undated "not reached" item. The first
 * projection row's year is "today". Called by MilestonesSection.
 */
export function buildMilestoneItems(projection: CompleteProjection): MilestoneItem[] {
  const startYear = projection.rows[0]?.calendarYear ?? projection.retirementYear;
  const { coast, fiReached, solvency } = projection;

  const coastItem: MilestoneItem =
    coast.reached === undefined
      ? { label: "Coast FIRE: not before retirement", status: "notReached" }
      : {
          year: coast.reached.calendarYear,
          label: "Coast FIRE",
          detail: `Age ${coast.reached.age}`,
          status: statusForYear(coast.reached.calendarYear, startYear),
        };

  const fiItem: MilestoneItem =
    fiReached === undefined
      ? { label: `FI reached: not by age ${projection.endAge}`, status: "notReached" }
      : {
          year: fiReached.calendarYear,
          label: "FI reached",
          detail: `Age ${fiReached.age}`,
          status: statusForYear(fiReached.calendarYear, startYear),
        };

  const retirementItem: MilestoneItem = {
    year: projection.retirementYear,
    label: "Retirement (your target)",
    detail: `Age ${projection.retirementAge}`,
    status: statusForYear(projection.retirementYear, startYear),
  };

  const lastRow = projection.rows[projection.rows.length - 1];
  const moneyItem: MilestoneItem =
    solvency.status === "lasts"
      ? {
          year: lastRow?.calendarYear,
          label: `Money lasts to ${projection.endAge}`,
          status: statusForYear(lastRow?.calendarYear ?? startYear + 1, startYear),
        }
      : {
          year: solvency.year,
          label: `Money runs out at ${solvency.age}`,
          status: statusForYear(solvency.year, startYear),
        };

  return [coastItem, fiItem, retirementItem, moneyItem];
}

/**
 * The Milestones card on Results (OUT-4): the key years of the plan on a
 * timeline. Sits between the tiles and the charts and is rendered by
 * ResultsScreen only when the projection is complete.
 */
export function MilestonesSection({ projection }: { readonly projection: CompleteProjection }) {
  return (
    <Card title="Milestones" id={MILESTONES_SECTION_ID}>
      <MilestoneTimeline items={buildMilestoneItems(projection)} />
    </Card>
  );
}
