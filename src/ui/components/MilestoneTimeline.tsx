/** Whether a milestone has happened, is expected, or isn't expected within the plan. */
export type MilestoneStatus = "reached" | "projected" | "notReached";

/** One milestone on the timeline. `year` is left out when it has no date ("not before ..."). */
export interface MilestoneItem {
  readonly year?: number;
  readonly label: string;
  /** A short extra line, e.g. "Age 37". */
  readonly detail?: string;
  readonly status: MilestoneStatus;
}

/** What MilestoneTimeline needs: the items, in any order. */
interface MilestoneTimelineProps {
  readonly items: readonly MilestoneItem[];
}

/** The words shown for each status, so the status never relies on colour or marker shape alone. */
const statusText: Record<MilestoneStatus, string> = {
  reached: "Reached",
  projected: "Projected",
  notReached: "Not reached",
};

/**
 * Puts dated items in year order (items in the same year keep the order they
 * were given), with undated items after them, also in the order given. Used
 * by MilestoneTimeline.
 */
function sortMilestones(items: readonly MilestoneItem[]): MilestoneItem[] {
  const dated = items.filter((item) => item.year !== undefined);
  const undated = items.filter((item) => item.year === undefined);

  // Array.prototype.sort is stable, so equal years keep their given order.
  dated.sort((first, second) => (first.year ?? 0) - (second.year ?? 0));

  return [...dated, ...undated];
}

/**
 * The Milestones card's content (OUT-4): key years laid out along one
 * horizontal line, as an ordered list so a screen reader reads it as a list.
 * Reached items have a solid marker and projected items an outlined one; each
 * also says its status in words. Undated items come last, in words only.
 * Later milestones add their own items. Rendered by MilestonesSection.
 */
export function MilestoneTimeline({ items }: MilestoneTimelineProps) {
  return (
    <ol className="milestone-timeline">
      {sortMilestones(items).map((item) => (
        <li key={item.label} className={`milestone milestone-${item.status}`}>
          <span className="milestone-marker" aria-hidden="true" />
          {item.year !== undefined && <span className="milestone-year">{item.year}</span>}
          <span className="milestone-label">{item.label}</span>
          {item.detail !== undefined && <span className="milestone-detail">{item.detail}</span>}
          <span className="milestone-status">{statusText[item.status]}</span>
        </li>
      ))}
    </ol>
  );
}
