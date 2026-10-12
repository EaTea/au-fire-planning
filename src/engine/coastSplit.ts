// Coast FIRE for super and outside super (COAST-3, COAST-6 (c)): two separate,
// stricter tests alongside the combined Coast FIRE in coastFire.ts, which
// stays the overall answer.
//
//   outside super: can the portfolio and cash, with no more contributions, grow
//                  to pay the bridge years by themselves?
//   super:         can super, with employer contributions only, grow to pay the
//                  years after access by itself?
//
//   row:   0 ───────── k ───────── R (retirement) ──── bridge ──── A-1 | A ──── after access ──── end
//          │           │                                                 │
//          │           └─ need(k): what you need at row k to coast       └─ super opens at row A
//          └─ "needs $X today · has $Y"
//
// Outside super reuses the Coast FIRE solver (`portfolioNeededFromRow`) with
// the bridge need in place of the FI number and no super. Super uses its
// linear form: from row k, super at the row before access is
//
//     super(k) × G(k) + E(k)
//
// where G(k) is the growth over the years left and E(k) is what employer
// contributions alone add, after contributions tax and growth. So the super
// needed at row k is (need − E(k)) ÷ G(k), at least 0. G and E are read off
// `projectPortfolio` (a run with no spending and nothing outside super, and
// voluntary contributions stopped after row k), once with 1 dollar in super and
// once with none, so no super rule is copied here.
//
// "Reached" is the first row, from today to retirement, where the balance is
// at least that row's need. Called by `summariseProjection` (fiNumber.ts).
// Pure, like the rest of the engine.

import type { BridgeAssessment } from "./bridge";
import { inputsWithVoluntaryContributionsStoppedAfter, portfolioNeededFromRow } from "./coastFire";
import type { Explained, ExplanationLine } from "./explained";
import { projectPortfolio, type ProjectionInputs, type ProjectionRow } from "./projection";

/** The year one of the two tests is first passed, with the working behind it. */
export interface CoastSplitMilestone {
  readonly yearIndex: number;
  readonly calendarYear: number;
  readonly age: number;
  /** The balance against the need in that year. */
  readonly explanation: Explained;
}

/** One of the two tests: what it needs today, what you have today, and when it is reached. */
export interface CoastSplitPart {
  /** What you need today (row 0 dollars), with its working. */
  readonly needToday: Explained;
  /** What you have today: the portfolio plus cash (outside super) or the super balance. */
  readonly hasToday: number;
  /** `undefined` when it isn't reached by the retirement year. */
  readonly reached?: CoastSplitMilestone;
}

/** The two tests. A part is absent when it doesn't apply (no bridge, no super, or super never opens within the plan). */
export interface CoastSplit {
  /** The portfolio needed to fund the bridge on its own. Absent when there is no bridge. */
  readonly outside?: CoastSplitPart;
  /** The super needed to fund the years after access on its own. Absent when there is no super or no years after access. */
  readonly super?: CoastSplitPart;
}

/**
 * Works out both tests for a projection. `rows` are from `projectPortfolio`,
 * `inputs` produced them and `bridge` is `assessBridge`'s answer for them.
 * Called once per summary by `summariseProjection`. Never throws on user data.
 */
export function calculateCoastSplit(
  rows: readonly ProjectionRow[],
  inputs: ProjectionInputs,
  bridge: BridgeAssessment,
): CoastSplit {
  const outside = coastOutsideSuper(rows, inputs, bridge);
  const superPart = coastSuper(rows, inputs, bridge);

  return {
    ...(outside === undefined ? {} : { outside }),
    ...(superPart === undefined ? {} : { super: superPart }),
  };
}

/**
 * The outside-super test: the portfolio needed at each row so that, with no
 * more contributions, portfolio + cash reach the bridge need at the
 * retirement row (the Coast FIRE solver with that target and no super).
 * Reached is the first row where the portfolio is at least that. Called by
 * `calculateCoastSplit`.
 */
function coastOutsideSuper(
  rows: readonly ProjectionRow[],
  inputs: ProjectionInputs,
  bridge: BridgeAssessment,
): CoastSplitPart | undefined {
  const retirementRowIndex = inputs.retirementAge - inputs.currentAge;
  const workingRows = rows.slice(0, retirementRowIndex + 1);
  const todayRow = workingRows[0];
  const retirementRow = workingRows[retirementRowIndex];

  if (bridge.bridge === undefined || todayRow === undefined || retirementRow === undefined) {
    return undefined;
  }

  const target = bridge.bridge.need.value;
  const neededAt = (rowIndex: number) =>
    portfolioNeededFromRow(workingRows, rowIndex, inputs, 0, target);

  const today = neededAt(0);
  const yearsToRetirement = retirementRowIndex;

  // Shown as portfolio + cash against portfolio + cash, so the figures compare like with like.
  const outsideNeededToday = today.portfolioNeeded + todayRow.cashClosing;

  const lines: ExplanationLine[] = [
    {
      label: `Bridge need at ${retirementRow.calendarYear}`,
      value: target,
      unit: "dollars",
      source: "calculated",
    },
    {
      label: `Your cash, growing at ${formatPercent(inputs.interestRate)} to ${retirementRow.calendarYear}`,
      value: today.cashLeftAtRetirement,
      unit: "dollars",
      operator: "−",
      source: "calculated",
    },
  ];
  if (today.hasDatedExpenses) {
    lines.push({
      label: `Dated expenses the portfolio would pay, grown to ${retirementRow.calendarYear}`,
      value: today.portfolioPaymentsGrownToRetirement,
      unit: "dollars",
      operator: "+",
      source: "calculated",
    });
  }
  lines.push(
    {
      label: `Portfolio growth at ${formatPercent(inputs.expectedReturn)} over ${yearsToRetirement} years`,
      value: today.portfolioGrowthFactor,
      unit: "factor",
      operator: "÷",
      source: "calculated",
    },
    {
      label: "Portfolio needed today to fund the bridge",
      value: today.portfolioNeeded,
      unit: "dollars",
      operator: "=",
      source: "calculated",
    },
    {
      label: "Your cash today",
      value: todayRow.cashClosing,
      unit: "dollars",
      operator: "+",
      source: "calculated",
    },
    {
      label: "Outside super needed today",
      value: outsideNeededToday,
      unit: "dollars",
      operator: "=",
      source: "calculated",
    },
  );

  let reached: CoastSplitMilestone | undefined;
  for (const row of workingRows) {
    // Cash is on both sides, so the test is the portfolio against the portfolio needed.
    const needed = neededAt(row.yearIndex).portfolioNeeded + row.cashClosing;
    const held = row.portfolioClosing + row.cashClosing;
    if (row.portfolioClosing >= needed - row.cashClosing) {
      reached = milestone(row, "Outside super", held, "Outside super needed", needed);
      break;
    }
  }

  return {
    needToday: { value: outsideNeededToday, unit: "dollars", lines },
    hasToday: todayRow.portfolioClosing + todayRow.cashClosing,
    ...(reached === undefined ? {} : { reached }),
  };
}

/**
 * The super test: the super needed at each row so that, with employer
 * contributions only, super reaches the after-access need at the row before
 * access. Reached is the first row, up to retirement, where super is at least
 * that. Called by `calculateCoastSplit`.
 */
function coastSuper(
  rows: readonly ProjectionRow[],
  inputs: ProjectionInputs,
  bridge: BridgeAssessment,
): CoastSplitPart | undefined {
  const afterAccess = bridge.afterAccess;
  const todayRow = rows[0];
  if (afterAccess === undefined || inputs.superAccount === undefined || todayRow === undefined) {
    return undefined;
  }

  // The need is in the dollars of the row before access.
  const baseRowIndex = rows.findIndex((row) => row.calendarYear === afterAccess.firstYear) - 1;
  const baseRow = rows[baseRowIndex];
  if (baseRow === undefined) return undefined;

  const startYear = todayRow.calendarYear;
  const lastCoastRowIndex = Math.min(inputs.retirementAge - inputs.currentAge, baseRowIndex);

  /** super needed at row k, with the G and E behind it. */
  const neededAt = (rowIndex: number) => {
    const { growthFactor, employerOnlyAdded } = superPathFromRow(
      inputs,
      rowIndex,
      baseRowIndex,
      startYear,
    );
    const needed = Math.max(0, (afterAccess.need.value - employerOnlyAdded) / growthFactor);

    return { needed, growthFactor, employerOnlyAdded };
  };

  const today = neededAt(0);
  const baseYearsFromToday = baseRowIndex;

  const lines: ExplanationLine[] = [
    {
      label: `After-access need at ${baseRow.calendarYear}`,
      value: afterAccess.need.value,
      unit: "dollars",
      source: "calculated",
    },
    {
      label: `Employer contributions only, grown to ${baseRow.calendarYear}`,
      value: today.employerOnlyAdded,
      unit: "dollars",
      operator: "−",
      source: "calculated",
    },
    {
      label: `Super growth after earnings tax over ${baseYearsFromToday} years`,
      value: today.growthFactor,
      unit: "factor",
      operator: "÷",
      source: "calculated",
    },
    {
      label: "Super needed today to fund the years after access on its own",
      value: today.needed,
      unit: "dollars",
      operator: "=",
      source: "calculated",
    },
  ];

  let reached: CoastSplitMilestone | undefined;
  for (let rowIndex = 0; rowIndex <= lastCoastRowIndex; rowIndex++) {
    const row = rows[rowIndex];
    if (row === undefined) break;

    const needed = neededAt(rowIndex).needed;
    if (row.superClosing >= needed) {
      reached = milestone(row, "Super", row.superClosing, "Super needed", needed);
      break;
    }
  }

  return {
    needToday: { value: today.needed, unit: "dollars", lines },
    hasToday: todayRow.superClosing,
    ...(reached === undefined ? {} : { reached }),
  };
}

/** What one dollar in super at row k becomes by the base row, and what employer contributions alone add. */
interface SuperPath {
  /** G(k): super at the base row per dollar in super at row k. */
  readonly growthFactor: number;
  /** E(k): what the employer contributions after row k add by the base row. */
  readonly employerOnlyAdded: number;
}

/**
 * Reads G(k) and E(k) off `projectPortfolio`: runs that have no spending, no
 * money outside super and voluntary contributions stopped after row k, to the
 * base row, with $1 in super and with none. By linearity, the $1 run's extra
 * at each row is the growth from the start; dividing the extra at the base row
 * by the extra at row k gives G(k), and E(k) is what is left of the empty run.
 * Called by `coastSuper`.
 */
function superPathFromRow(
  inputs: ProjectionInputs,
  fromIndex: number,
  baseRowIndex: number,
  startYear: number,
): SuperPath {
  const account = inputs.superAccount;
  const stopped = inputsWithVoluntaryContributionsStoppedAfter(inputs, fromIndex, startYear);

  const run = (opening: number) =>
    projectPortfolio(
      {
        ...stopped,
        endAge: inputs.currentAge + baseRowIndex,
        portfolioOpening: 0,
        cashOpening: 0,
        livingAnnual: 0,
        retirementSpendingAnnual: 0,
        datedExpenses: [],
        ...(account === undefined ? {} : { superAccount: { ...stopped.superAccount!, opening } }),
      },
      startYear,
    );

  const empty = run(0);
  const unit = run(1);

  const emptyAtRow = empty[fromIndex]?.superClosing ?? 0;
  const emptyAtBase = empty[baseRowIndex]?.superClosing ?? 0;
  const unitExtraAtRow = (unit[fromIndex]?.superClosing ?? 1) - emptyAtRow;
  const unitExtraAtBase = (unit[baseRowIndex]?.superClosing ?? 1) - emptyAtBase;

  const growthFactor = unitExtraAtBase / unitExtraAtRow;

  return { growthFactor, employerOnlyAdded: emptyAtBase - growthFactor * emptyAtRow };
}

/** Builds the "reached" milestone for a row: the balance against the need, and the margin. */
function milestone(
  row: ProjectionRow,
  balanceLabel: string,
  balance: number,
  needLabel: string,
  need: number,
): CoastSplitMilestone {
  return {
    yearIndex: row.yearIndex,
    calendarYear: row.calendarYear,
    age: row.age,
    explanation: {
      value: balance,
      unit: "dollars",
      lines: [
        {
          label: `${balanceLabel} at end of ${row.calendarYear} (age ${row.age})`,
          value: balance,
          unit: "dollars",
          source: "calculated",
        },
        {
          label: `${needLabel} in ${row.calendarYear}`,
          value: need,
          unit: "dollars",
          operator: "−",
          source: "calculated",
        },
        {
          label: "Reached",
          value: balance - need,
          unit: "dollars",
          operator: "=",
          source: "calculated",
        },
      ],
    },
  };
}

/** Shows a fraction as a percentage without floating-point noise: 0.07 becomes "7%". */
function formatPercent(fraction: number): string {
  return `${Number((fraction * 100).toPrecision(12))}%`;
}
