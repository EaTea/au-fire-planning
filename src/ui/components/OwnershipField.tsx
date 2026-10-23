import { displayName } from "../../plan/displayName";
import type { Person, PortfolioOwnership } from "../../plan/types";
import { formatPercent } from "../format";
import { PercentField } from "./PercentField";
import { SegmentedToggle } from "./SegmentedToggle";

/** What OwnershipField needs: the people, the stored ownership and a callback. */
interface OwnershipFieldProps {
  /** The visible label above the toggle, e.g. "Owned by"; it also names the group for assistive technology. */
  readonly label: string;
  /** Everyone in the household; the field is for two people. */
  readonly people: readonly Person[];
  /** The stored ownership; `undefined` shows the default, joint 50/50. */
  readonly value: PortfolioOwnership | undefined;
  /**
   * Called with a valid ownership, or `undefined` when the share is cleared
   * back to the default. Never called with a split outside 0 to 100%.
   */
  readonly onChange: (ownership: PortfolioOwnership | undefined) => void;
}

/** The toggle's values: a person by position, or "joint". */
type OwnerChoice = "first" | "second" | "joint";

/**
 * Who owns an asset (IN-14, part): a toggle with each person's name and
 * "Joint". Sole ownership names the person; Joint shows the first person's
 * share as a percentage field and the other's as calculated text ("Sam 40%").
 * A share outside 0 to 100% shows the field's inline error and is not
 * reported. Unset ownership shows the default for a couple: joint 50/50.
 * Used by the portfolio card (couples only); the property and other assets
 * reuse it in later milestones.
 */
export function OwnershipField({ label, people, value, onChange }: OwnershipFieldProps) {
  const [first, second] = people;

  // The field only makes sense for two people.
  if (first === undefined || second === undefined) {
    return null;
  }

  const firstId = first.id;
  const secondId = second.id;
  const firstName = displayName(first, 0, people);
  const secondName = displayName(second, 1, people);

  const choice: OwnerChoice =
    value === undefined || value.kind === "joint"
      ? "joint"
      : value.personId === secondId
        ? "second"
        : "first";

  /** The first person's share as a fraction: the stored one, or 50% when unset. */
  const firstShare =
    value?.kind === "joint"
      ? value.shares.find((share) => share.personId === firstId)?.fraction
      : undefined;
  const shownFirstShare = firstShare ?? 0.5;

  /** Reports a joint split with the first person's share and the rest to the second. */
  function reportSplit(firstFraction: number) {
    // Share first, then take the rest, so the two always add to exactly 1 (0.3 and 0.7, not 0.30000000000000004).
    const secondFraction = Number((1 - firstFraction).toFixed(10));

    onChange({
      kind: "joint",
      shares: [
        { personId: firstId, fraction: firstFraction },
        { personId: secondId, fraction: secondFraction },
      ],
    });
  }

  /** Switches between the people and joint ownership. */
  function choose(target: OwnerChoice) {
    if (target === choice) return;

    if (target === "joint") reportSplit(0.5);
    else onChange({ kind: "sole", personId: target === "first" ? firstId : secondId });
  }

  return (
    <div className="ownership-field">
      <div className="ownership-label" aria-hidden="true">
        {label}
      </div>
      <SegmentedToggle<OwnerChoice>
        label={label}
        options={[
          { value: "first", label: firstName },
          { value: "second", label: secondName },
          { value: "joint", label: "Joint" },
        ]}
        value={choice}
        onChange={choose}
      />

      {choice === "joint" && (
        <>
          <PercentField
            label={`${firstName}'s share`}
            value={firstShare}
            defaultValue={0.5}
            min={0}
            max={1}
            onChange={(fraction) => {
              // Cleared: back to the default, which is an unset ownership.
              if (fraction === undefined) onChange(undefined);
              else reportSplit(fraction);
            }}
          />
          <p className="hint ownership-other-share">
            {secondName} {formatPercent(Number((1 - shownFirstShare).toFixed(10)))}
          </p>
        </>
      )}
    </div>
  );
}
