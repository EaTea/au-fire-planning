import { projectionHasSuper } from "../../engine/bridge";
import type { ProjectionSummary } from "../../engine/fiNumber";
import { agesOf, formatAges, type ProjectionRow } from "../../engine/projection";
import { capitaliseFirst } from "../format";
import { Card } from "../components/Card";
import { planEndWords } from "../planEndWords";
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
 * The "Super accessible" milestone (OUT-4): the year of the effective access
 * age, the first age super can be drawn while retired. If it is already open
 * today it says "now"; if the plan ends before that age it is an undated
 * "not reached" item. Used by
 * buildMilestoneItems, only when the plan has super.
 */
function buildSuperAccessibleItem(
  projection: CompleteProjection,
  startYear: number,
): MilestoneItem {
  const accessAge = projection.people[0].superAccessAge as number;
  const accessRow = projection.rows.find((row) => row.people[0].age === accessAge);

  // Already open (for example past 65 today): nothing to wait for.
  if ((projection.rows[0]?.people[0].age ?? 0) >= accessAge) {
    return { year: startYear, label: "Super accessible: now", status: "reached" };
  }

  if (accessRow === undefined) {
    return { label: `Super accessible: not by age ${projection.endAge}`, status: "notReached" };
  }

  return {
    year: accessRow.calendarYear,
    label: "Super accessible",
    detail: `Age ${accessAge}`,
    status: statusForYear(accessRow.calendarYear, startYear),
  };
}

/** The wording of everyone's ages in a row, started with a capital: "Age 46" or "Alex 46 · Sam 44". */
function agesDetail(row: ProjectionRow): string {
  return capitaliseFirst(formatAges(agesOf(row)));
}

/**
 * A couple's milestones for each person's own retirement and super access:
 * "Alex retires (target)", "Sam's super accessible", each with both people's
 * ages in that year. A person with no super gets no access item. Used by
 * buildMilestoneItems when the household has two people.
 */
function buildPerPersonItems(projection: CompleteProjection, startYear: number): MilestoneItem[] {
  const todayRow = projection.rows[0];

  return projection.people.flatMap((person, personIndex): MilestoneItem[] => {
    const retirementRow = projection.rows.find((row) => row.calendarYear === person.retirementYear);
    const items: MilestoneItem[] = [
      {
        year: person.retirementYear,
        label: `${person.label} retires (target)`,
        detail:
          retirementRow === undefined ? `Age ${person.retirementAge}` : agesDetail(retirementRow),
        status: statusForYear(person.retirementYear, startYear),
      },
    ];

    const holdsSuper = projection.rows.some(
      (row) => (row.people[personIndex]?.superClosing ?? 0) > 0,
    );
    const todayAge = todayRow?.people[personIndex]?.age;

    if (holdsSuper && person.superAccessAge !== undefined && todayAge !== undefined) {
      const accessYear = startYear + (person.superAccessAge - todayAge);
      const accessRow = projection.rows.find((row) => row.calendarYear === accessYear);

      // This person's own last age in the plan (the plan-until age is the younger person's).
      const lastAge = projection.rows[projection.rows.length - 1]?.people[personIndex]?.age;

      if (accessYear <= startYear) {
        // Already open (for example an older partner past 65): nothing to wait for.
        items.push({
          year: startYear,
          label: `${person.label}'s super accessible: now`,
          status: "reached",
        });
      } else if (accessRow === undefined) {
        items.push({
          label: `${person.label}'s super accessible: not by age ${lastAge ?? projection.endAge}`,
          status: "notReached",
        });
      } else {
        items.push({
          year: accessYear,
          label: `${person.label}'s super accessible`,
          detail: agesDetail(accessRow),
          status: statusForYear(accessYear, startYear),
        });
      }
    }

    return items;
  });
}

/**
 * Turns the projection summary into the timeline's items: Coast FIRE, FI
 * reached, retirement (the target), whether the money lasts and, with super,
 * when super becomes accessible. A couple's wording matches the tiles ("Sam
 * 95", "you've both retired") and has an item for each person. A milestone
 * that never happens becomes an undated "not reached" item. The first
 * projection row's year is "today". Called by MilestonesSection.
 */
export function buildMilestoneItems(projection: CompleteProjection): MilestoneItem[] {
  const startYear = projection.rows[0]?.calendarYear ?? projection.householdRetirementYear;
  const { coast, fiReached, solvency } = projection;

  const coastItem: MilestoneItem =
    coast.reached === undefined
      ? {
          label:
            projection.people.length > 1
              ? "Coast FIRE: not before you've both retired"
              : "Coast FIRE: not before retirement",
          status: "notReached",
        }
      : {
          year: coast.reached.calendarYear,
          label: "Coast FIRE",
          detail: capitaliseFirst(formatAges(coast.reached.ages)),
          status: statusForYear(coast.reached.calendarYear, startYear),
        };

  const fiItem: MilestoneItem =
    fiReached === undefined
      ? { label: `FI reached: not by ${planEndWords(projection)}`, status: "notReached" }
      : {
          year: fiReached.calendarYear,
          label: "FI reached",
          detail: capitaliseFirst(formatAges(fiReached.ages)),
          status: statusForYear(fiReached.calendarYear, startYear),
        };

  const retirementItem: MilestoneItem = {
    year: projection.people[0].retirementYear,
    label: "Retirement (your target)",
    detail: `Age ${projection.people[0].retirementAge}`,
    status: statusForYear(projection.people[0].retirementYear, startYear),
  };

  const lastRow = projection.rows[projection.rows.length - 1];
  const moneyItem: MilestoneItem =
    solvency.status === "lasts"
      ? {
          year: lastRow?.calendarYear,
          label: `Money lasts to ${projection.people.length > 1 ? planEndWords(projection) : projection.endAge}`,
          status: statusForYear(lastRow?.calendarYear ?? startYear + 1, startYear),
        }
      : {
          year: solvency.year,
          // One person keeps "at 94"; a couple names both ages ("at Alex 94 · Sam 92").
          label: `Money runs out at ${projection.people.length > 1 ? formatAges(solvency.ages) : solvency.firstPersonAge}`,
          status: statusForYear(solvency.year, startYear),
        };

  // A couple has a retirement (and super access) milestone for each person.
  if (projection.people.length > 1) {
    return [coastItem, fiItem, ...buildPerPersonItems(projection, startYear), moneyItem];
  }

  const items = [coastItem, fiItem, retirementItem, moneyItem];

  // "Super accessible" only when the plan has super.
  if (projection.people[0].superAccessAge !== undefined && projectionHasSuper(projection.rows)) {
    items.push(buildSuperAccessibleItem(projection, startYear));
  }

  return items;
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
