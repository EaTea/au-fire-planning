import { useId } from "react";

import type { GrowthRate } from "../../plan/types";
import { PercentField } from "./PercentField";

/** The choices a "Grows at" dropdown can offer. A screen lists the ones that make sense for its amount. */
export type GrowthRateOption = "inflation" | "inflationPlus" | "inflationMinus" | "fixed" | "none";

/** Wording for each option in the dropdown. */
const OPTION_LABELS: Record<GrowthRateOption, string> = {
  inflation: "Inflation",
  inflationPlus: "Inflation + …%",
  inflationMinus: "Inflation − …%",
  fixed: "Fixed …%",
  none: "No growth",
};

/** What the number box is called for each custom option, so it says what the number means. */
const NUMBER_LABELS: Record<"inflationPlus" | "inflationMinus" | "fixed", string> = {
  inflationPlus: "Above inflation by",
  inflationMinus: "Below inflation by",
  fixed: "Fixed rate",
};

/** The number each custom option starts with when first picked (a fraction), so the pick is visible. */
const STARTING_NUMBER: Record<"inflationPlus" | "inflationMinus" | "fixed", number> = {
  inflationPlus: 0.01,
  inflationMinus: 0.01,
  fixed: 0.03,
};

/** The smallest and largest number the custom options accept, as fractions (−10% to +15%). */
const LOWEST_RATE = -0.1;
const HIGHEST_RATE = 0.15;

/** What GrowthRateField needs. */
interface GrowthRateFieldProps {
  /** Names the dropdown, e.g. "Grows at". The number box is named for the chosen option ("Above inflation by", "Below inflation by" or "Fixed rate"). */
  readonly label: string;
  /** Which choices to offer, in display order. */
  readonly options: readonly GrowthRateOption[];
  /** The plan's value; undefined means "not set" (the default is shown). */
  readonly value?: GrowthRate;
  /** What an unset value means; shown as the choice. Defaults to plain inflation. */
  readonly defaultValue?: GrowthRate;
  /** Called with the new growth, or undefined when the user returns to the default. */
  readonly onChange: (value?: GrowthRate) => void;
  readonly hint?: string;
  /**
   * Turns the number box's plain name into the label to show. A screen with
   * several people passes its `PerPersonFields` label function so each
   * person's box stays unique ("Alex: Fixed rate"). Defaults to unchanged.
   */
  readonly numberLabel?: (name: string) => string;
}

const INFLATION: GrowthRate = { kind: "inflationPlus", margin: 0 };

/** Which dropdown choice a growth value corresponds to. Margins above, below and at 0 are three choices. */
function optionOf(growth: GrowthRate): GrowthRateOption {
  if (growth.kind === "none" || growth.kind === "fixed") {
    return growth.kind;
  }

  if (growth.margin > 0) return "inflationPlus";
  if (growth.margin < 0) return "inflationMinus";
  return "inflation";
}

/** True when two growth values mean the same thing. */
function isSameGrowth(first: GrowthRate, second: GrowthRate): boolean {
  return JSON.stringify(first) === JSON.stringify(second);
}

/** The number shown beside a custom option, as a fraction (the margin's size for the inflation options). */
function numberOf(growth: GrowthRate): number | undefined {
  if (growth.kind === "fixed") return growth.rate;
  if (growth.kind === "inflationPlus") return Math.abs(growth.margin);
  return undefined;
}

/** Builds the growth value for a custom option and a number typed beside it. */
function growthFor(
  option: "inflationPlus" | "inflationMinus" | "fixed",
  number: number,
): GrowthRate {
  if (option === "fixed") return { kind: "fixed", rate: number };

  // "Inflation − 1%" is stored as a margin of −0.01. `0 -` avoids a negative zero.
  return { kind: "inflationPlus", margin: option === "inflationPlus" ? number : 0 - number };
}

/**
 * A "Grows at" dropdown that gains a percentage box for the custom choices
 * ("Inflation + …%", "Inflation − …%", "Fixed …%"). Not specific to salary:
 * the caller supplies the label and the options, so property, expenses and
 * other growing amounts reuse it. Used with `PerPersonFields` for salary.
 *
 *   [ Inflation + …% ▾ ]  [ 1% ]      number: 0% to +15% (Fixed: −10% to +15%)
 *
 * - Picking the default's own choice calls `onChange(undefined)` (back to
 *   "not set"). Picking "Inflation" when the default is something else sets a
 *   margin of 0.
 * - Clearing the number box also returns to the default.
 * - A custom choice starts with a number (+1%, −1%, 3%) so the pick holds.
 *   Typing 0 beside an inflation option means plain "Inflation", which the
 *   dropdown then shows.
 */
export function GrowthRateField({
  label,
  options,
  value,
  defaultValue = INFLATION,
  onChange,
  hint,
  numberLabel = (name) => name,
}: GrowthRateFieldProps) {
  const selectId = useId();

  const shownGrowth = value ?? defaultValue;
  const shownOption = optionOf(shownGrowth);
  const isShowingDefault = value === undefined;

  /** Applies a new dropdown choice. */
  function handleChoice(choice: GrowthRateOption) {
    const newGrowth: GrowthRate =
      choice === "inflation"
        ? INFLATION
        : choice === "none"
          ? { kind: "none" }
          : growthFor(choice, STARTING_NUMBER[choice]);

    // The default's own choice (without a custom number) means "not set".
    const isDefaultChoice =
      (choice === "inflation" || choice === "none") && isSameGrowth(newGrowth, defaultValue);

    onChange(isDefaultChoice ? undefined : newGrowth);
  }

  const customOption =
    shownOption === "inflationPlus" || shownOption === "inflationMinus" || shownOption === "fixed"
      ? shownOption
      : undefined;

  return (
    <div className="field">
      <label htmlFor={selectId}>{label}</label>

      <div className={isShowingDefault ? "input default" : "input"}>
        <select
          id={selectId}
          value={shownOption}
          onChange={(event) => handleChoice(event.target.value as GrowthRateOption)}
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {OPTION_LABELS[option]}
            </option>
          ))}
        </select>
      </div>

      {customOption !== undefined && (
        <PercentField
          label={numberLabel(NUMBER_LABELS[customOption])}
          value={numberOf(shownGrowth)}
          allowNegative={customOption === "fixed"}
          min={customOption === "fixed" ? LOWEST_RATE : 0}
          max={customOption === "inflationMinus" ? -LOWEST_RATE : HIGHEST_RATE}
          onChange={(typedNumber) =>
            onChange(typedNumber === undefined ? undefined : growthFor(customOption, typedNumber))
          }
        />
      )}

      {hint !== undefined && <div className="hint">{hint}</div>}
    </div>
  );
}
