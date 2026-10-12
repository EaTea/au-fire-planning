// The bridge check (FIRE-4): can money outside super fund the years from
// retirement until super opens, and can super plus what is left outside fund
// the rest of the plan?
//
//  working ──────► retirement ─── bridge ───► super accessible ─── after access ───► end
//                     row R      (outside super           row A        (super + what's
//                                 funds it alone)                       left outside)
//
//   projectPortfolio ─► rows ─┐
//                             ├─► assessBridge ─► BridgeAssessment ─► Results (M6 step 7)
//   effectiveSuperAccessAge ──┘
//
// The status of each part comes from the projection's own shortfalls, so it is
// exact: a part is MET when none of its years has a shortfall. The "need" and
// "projected" figures are a guide so a bar can compare them: the need is the
// part's spending discounted back to the row before the part starts, and the
// projected amount is what the plan holds at the end of that row.
//
// Every withdrawal this milestone allows is at or after 60, so it is
// tax-free; the explanations say so, and M8 relies on it.
//
// Pure, like the rest of the engine. Called by `summariseProjection`
// (src/engine/fiNumber.ts).

import type { Explained, ExplanationLine } from "./explained";
import { effectiveSuperAccessAge, type ProjectionInputs, type ProjectionRow } from "./projection";
import { rulesForYear } from "../rules/ruleSet";

/** Whether a part of the plan is funded. The words are shown as text, never by colour alone. */
export type BridgeStatus = "met" | "short";

/** One part of the check: the bridge years, or the years after access. */
export interface BridgePart {
  /** The first and last calendar years of the part. */
  readonly firstYear: number;
  readonly lastYear: number;
  /** The ages in those years. */
  readonly firstAge: number;
  readonly lastAge: number;
  /** The spending in those years, discounted to the row before the part starts (nominal dollars of that row). */
  readonly need: Explained;
  /** What the plan holds at the end of that row (nominal dollars of that row): the bar to compare with the need. */
  readonly projected: Explained;
  /** MET when no year in the part has a shortfall. */
  readonly status: BridgeStatus;
  /** The calendar years in the part that can't be fully funded, in order. */
  readonly shortYears: readonly number[];
}

/** The result of the bridge check. Both parts are absent when there is no super. */
export interface BridgeAssessment {
  /** The first age super can be drawn while retired (see `effectiveSuperAccessAge`). */
  readonly effectiveAccessAge?: number;
  /** The retired years before super opens. Absent when you retire at or after the access age ("no bridge needed"). */
  readonly bridge?: BridgePart;
  /** From the effective access age to the end of the plan. Absent when the plan ends before access. */
  readonly afterAccess?: BridgePart;
}

/**
 * Checks the bridge and the years after access for a projection.
 *
 * `rows` are from `projectPortfolio(inputs, rows[0].calendarYear)`. The bridge
 * is the retired years before the effective access age; its need is the
 * spending in them discounted to the retirement row at the portfolio's return
 * (the portfolio pays first), and its projected amount is portfolio + cash at
 * the end of the retirement row. After access, the need is that spending
 * discounted to the row before access at super's after-tax return, and the
 * projected amount is super + portfolio + cash at the end of that row.
 * Never throws on user data.
 */
export function assessBridge(
  rows: readonly ProjectionRow[],
  inputs: ProjectionInputs,
): BridgeAssessment {
  const account = inputs.superAccount;
  const todayRow = rows[0];
  if (account === undefined || todayRow === undefined) return {};

  const startYear = todayRow.calendarYear;
  const accessAge = effectiveSuperAccessAge(inputs, startYear);
  if (accessAge === undefined) return {};

  const retirementRowIndex = inputs.retirementAge - inputs.currentAge;
  const accessRowIndex = accessAge - inputs.currentAge;
  const lastRowIndex = rows.length - 1;

  const preservationAge = rulesForYear(account.ruleSet, startYear, inputs.inflationRate)
    .superannuation.preservationAgeYears;
  const taxFreeNote: ExplanationLine = {
    label: "Withdrawals are tax-free from age",
    value: preservationAge,
    unit: "years",
    source: "rule",
  };

  // The bridge: retired years before access, up to the end of the plan.
  let bridge: BridgePart | undefined;
  const retirementRow = rows[retirementRowIndex];
  const bridgeLastIndex = Math.min(accessRowIndex - 1, lastRowIndex);

  if (retirementRow !== undefined && bridgeLastIndex > retirementRowIndex) {
    bridge = describePart({
      rows,
      baseRow: retirementRow,
      firstIndex: retirementRowIndex + 1,
      lastIndex: bridgeLastIndex,
      discountRate: inputs.expectedReturn,
      discountRateName: "the portfolio's return",
      projectedAmount: retirementRow.portfolioClosing + retirementRow.cashClosing,
      projectedLines: [
        { label: "Portfolio", value: retirementRow.portfolioClosing },
        { label: "Cash", value: retirementRow.cashClosing },
      ],
      partPhrase: "for the bridge",
    });
  }

  // After access: from the effective access age (never before row 1) to the end.
  let afterAccess: BridgePart | undefined;
  const firstAfterIndex = Math.max(1, accessRowIndex);
  const baseRow = rows[firstAfterIndex - 1];

  if (baseRow !== undefined && firstAfterIndex <= lastRowIndex) {
    const rules = rulesForYear(
      account.ruleSet,
      baseRow.calendarYear,
      inputs.inflationRate,
    ).superannuation;
    const earningsTaxRate = account.earningsTaxRate ?? rules.earningsTaxRate;

    afterAccess = describePart({
      rows,
      baseRow,
      firstIndex: firstAfterIndex,
      lastIndex: lastRowIndex,
      discountRate: account.returnRate * (1 - earningsTaxRate),
      discountRateName: "super's return after earnings tax",
      projectedAmount: baseRow.superClosing + baseRow.portfolioClosing + baseRow.cashClosing,
      projectedLines: [
        { label: "Super", value: baseRow.superClosing },
        { label: "Portfolio", value: baseRow.portfolioClosing },
        { label: "Cash", value: baseRow.cashClosing },
      ],
      partPhrase: "after super is accessible",
      taxFreeNote,
    });
  }

  return {
    effectiveAccessAge: accessAge,
    ...(bridge === undefined ? {} : { bridge }),
    ...(afterAccess === undefined ? {} : { afterAccess }),
  };
}

/**
 * Whether the plan has any super to speak of: super holds money in at least one
 * year. The engine always carries a super account (an empty one when nothing
 * was entered), so this is how Results tells "no super" from "super": the
 * bridge card, the "Super accessible" milestone and the bridge bands appear
 * only when it is true. Called by the Results screens.
 */
export function projectionHasSuper(rows: readonly ProjectionRow[]): boolean {
  return rows.some((row) => row.superClosing > 0);
}

/** What `describePart` needs to describe one part of the check. */
interface PartDescription {
  readonly rows: readonly ProjectionRow[];
  /** The row before the part starts; the need and projected amount are in its dollars. */
  readonly baseRow: ProjectionRow;
  readonly firstIndex: number;
  readonly lastIndex: number;
  readonly discountRate: number;
  readonly discountRateName: string;
  readonly projectedAmount: number;
  readonly projectedLines: readonly { label: string; value: number }[];
  /** "for the bridge" or "after super is accessible": completes "Need …" and "Projected …" labels. */
  readonly partPhrase: string;
  /** Added as the last line of the projected working, for parts that withdraw super. */
  readonly taxFreeNote?: ExplanationLine;
}

/**
 * Builds one `BridgePart` from the rows in its years: the discounted need,
 * the projected amount, and the status and short years from the rows'
 * shortfalls. Called by `assessBridge` for each part.
 */
function describePart(description: PartDescription): BridgePart {
  const { rows, baseRow, firstIndex, lastIndex, discountRate } = description;
  const partRows = rows.slice(firstIndex, lastIndex + 1);
  const firstRow = partRows[0] as ProjectionRow;
  const lastRow = partRows[partRows.length - 1] as ProjectionRow;

  // Each year's spending, as a value at the base row: nominal ÷ (1+rate)^(years after the base row).
  const spendingTotal = partRows.reduce((total, row) => total + row.spending, 0);
  const need = partRows.reduce(
    (total, row) =>
      total + row.spending / Math.pow(1 + discountRate, row.yearIndex - baseRow.yearIndex),
    0,
  );

  const years = `${firstRow.calendarYear} – ${lastRow.calendarYear}`;
  const percent = `${Number((discountRate * 100).toPrecision(12))}%`;
  const shortYears = partRows.filter((row) => row.shortfall > 0).map((row) => row.calendarYear);

  const needExplained: Explained = {
    value: need,
    unit: "dollars",
    lines: [
      {
        label: `Spending in ${years}`,
        value: spendingTotal,
        unit: "dollars",
        source: "calculated",
      },
      {
        label: `Less discounting to ${baseRow.calendarYear} at ${percent} (${description.discountRateName})`,
        value: spendingTotal - need,
        unit: "dollars",
        operator: "−",
        source: "calculated",
      },
      {
        label: `Need ${description.partPhrase} at ${baseRow.calendarYear}`,
        value: need,
        unit: "dollars",
        operator: "=",
        source: "calculated",
      },
    ],
  };

  const projectedExplained: Explained = {
    value: description.projectedAmount,
    unit: "dollars",
    lines: [
      ...description.projectedLines.map((line, index): ExplanationLine => ({
        label: `${line.label} at end of ${baseRow.calendarYear}`,
        value: line.value,
        unit: "dollars",
        ...(index === 0 ? {} : { operator: "+" as const }),
        source: "calculated",
      })),
      {
        label: `Projected ${description.partPhrase}`,
        value: description.projectedAmount,
        unit: "dollars",
        operator: "=",
        source: "calculated",
      },
      ...(description.taxFreeNote === undefined ? [] : [description.taxFreeNote]),
    ],
  };

  return {
    firstYear: firstRow.calendarYear,
    lastYear: lastRow.calendarYear,
    firstAge: firstRow.age,
    lastAge: lastRow.age,
    need: needExplained,
    projected: projectedExplained,
    status: shortYears.length === 0 ? "met" : "short",
    shortYears,
  };
}
