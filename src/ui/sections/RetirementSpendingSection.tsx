import { useState } from "react";

import { DEFAULT_RETIREMENT_SPENDING } from "../../plan/defaults";
import { usePlan, usePlanDispatch } from "../../plan/PlanProvider";
import type { RetirementSpending } from "../../plan/types";
import { Card } from "../components/Card";
import { MoneyField } from "../components/MoneyField";
import { PercentField } from "../components/PercentField";
import { SegmentedToggle } from "../components/SegmentedToggle";

/** Which of the two ways of expressing retirement spending is selected. */
type SpendingKind = RetirementSpending["kind"];

// Limits of the two fields, also used to decide whether a converted value fits.
const MINIMUM_FRACTION = 0.01; // 1%
const MAXIMUM_FRACTION = 3; // 300%
const MINIMUM_DOLLARS = 1;

/**
 * Converts retirement spending to the other kind, keeping the same dollar
 * meaning where possible (90% of $60,000 becomes $54,000 and back).
 *
 * Returns undefined, meaning "clear it", when living expenses aren't set (there
 * is nothing to convert against) or when the converted value would fall
 * outside the target field's limits. Used by RetirementSpendingSection when
 * the toggle is switched.
 */
function convertSpending(
  current: RetirementSpending,
  targetKind: SpendingKind,
  livingAnnual: number | undefined,
): RetirementSpending | undefined {
  if (livingAnnual === undefined) {
    return undefined;
  }

  if (targetKind === "amount" && current.kind === "percentOfToday") {
    const annual = Math.round(livingAnnual * current.fraction);

    return annual >= MINIMUM_DOLLARS ? { kind: "amount", annual } : undefined;
  }

  if (targetKind === "percentOfToday" && current.kind === "amount") {
    // Rounded to four decimals (0.9 not 0.9000000000000001) to remove floating-point noise.
    const fraction = Number((current.annual / livingAnnual).toFixed(4));
    const fitsField = fraction >= MINIMUM_FRACTION && fraction <= MAXIMUM_FRACTION;

    return fitsField ? { kind: "percentOfToday", fraction } : undefined;
  }

  // Already the target kind: nothing to convert.
  return current;
}

/**
 * Form section for EXP-2: how much the household spends in retirement, either
 * as a % of today's living expenses (default 100%) or as a dollar amount.
 * Used by the Income & expenses screen.
 *
 *   toggle "% of today" ──► PercentField ──► { kind: "percentOfToday", fraction }
 *   toggle "$ amount"   ──► MoneyField   ──► { kind: "amount", annual }
 *
 * The plan only holds a kind once a value is set, but the toggle must remember
 * the user's choice while the value is cleared, so the selected kind is also
 * kept in local state and follows the plan whenever the plan has a value.
 */
export function RetirementSpendingSection() {
  const plan = usePlan();
  const dispatch = usePlanDispatch();

  const spending = plan.expenses.retirementSpending;
  const [chosenKind, setChosenKind] = useState<SpendingKind>(
    spending?.kind ?? DEFAULT_RETIREMENT_SPENDING.kind,
  );

  // Follow the plan when it holds a value of the other kind (e.g. a saved plan
  // finished loading). Setting state during render is React's documented way
  // to adjust state to a changed input without an extra effect pass.
  if (spending !== undefined && spending.kind !== chosenKind) {
    setChosenKind(spending.kind);
  }

  /**
   * Switches between "% of today" and "$ amount", converting the value so the
   * dollar meaning is kept. An unset percentage converts as the 100% default,
   * since that is what the user was looking at.
   */
  function handleToggle(targetKind: SpendingKind) {
    if (targetKind === chosenKind) {
      return;
    }

    const shownSpending = spending ?? DEFAULT_RETIREMENT_SPENDING;
    // An unset amount has nothing to convert (there is no default amount).
    const isShowingEmptyAmount = spending === undefined && chosenKind === "amount";

    setChosenKind(targetKind);
    dispatch({
      type: "setRetirementSpending",
      spending: isShowingEmptyAmount
        ? undefined
        : convertSpending(shownSpending, targetKind, plan.expenses.livingAnnual),
    });
  }

  return (
    <Card title="Spending in retirement">
      <SegmentedToggle
        label="Retirement spending as"
        options={[
          { value: "percentOfToday", label: "% of today" },
          { value: "amount", label: "$ amount" },
        ]}
        value={chosenKind}
        onChange={handleToggle}
      />

      {chosenKind === "percentOfToday" ? (
        <PercentField
          label="Share of today's living expenses"
          value={spending?.kind === "percentOfToday" ? spending.fraction : undefined}
          defaultValue={
            DEFAULT_RETIREMENT_SPENDING.kind === "percentOfToday"
              ? DEFAULT_RETIREMENT_SPENDING.fraction
              : undefined
          }
          min={MINIMUM_FRACTION}
          max={MAXIMUM_FRACTION}
          onChange={(fraction) =>
            dispatch({
              type: "setRetirementSpending",
              spending: fraction === undefined ? undefined : { kind: "percentOfToday", fraction },
            })
          }
        />
      ) : (
        <MoneyField
          label="Retirement spending per year"
          value={spending?.kind === "amount" ? spending.annual : undefined}
          min={MINIMUM_DOLLARS}
          onChange={(annual) =>
            dispatch({
              type: "setRetirementSpending",
              spending: annual === undefined ? undefined : { kind: "amount", annual },
            })
          }
        />
      )}
    </Card>
  );
}
