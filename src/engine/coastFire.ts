// Coast FIRE (COAST-1, COAST-2): how much you need saved today so that, with
// no further contributions, you would still reach your FI number by your
// target retirement age; and the first year your actual savings get there.
//
// Why only the portfolio needs solving. Contributions go only into the
// portfolio and dated expenses are paid from cash first (see projection.ts),
// so cash follows the same path whether or not you keep contributing. Only the
// portfolio's part changes, and it has a closed form. Looking forward from row
// k to the retirement row n (m = n − k years), with nothing more contributed:
//
//   cash:       cash(k) grows at the interest rate and pays dated expenses
//               first. At row n it has cashLeft(k) left. A dated expense the
//               cash can't pay in full "spills" to the portfolio: spill(j).
//
//                  FI number at row n − cashLeft(k) + Σ spill(j) × (1+r)^(n−j)
//   portfolioNeeded(k) = ───────────────────────────────────────────────────  (at least 0)
//                                        (1+r)^m
//
//   coast(k) = cash(k) + portfolioNeeded(k)        (nominal, in year k's dollars)
//
//   row:    0 ──────── k ──────────────── n (retirement)
//           │          │                   │
//           │          └─ coast(k): what you need at row k to coast from here
//           └─ coast(0): "the Coast FIRE number"
//
// Coast FIRE is reached in the first row k where investable net worth on the
// current path is at least coast(k). The cash parts are identical, so that is
// the same as "the portfolio is at least portfolioNeeded(k)", which means: if
// you stopped contributing after year k, you would still reach the FI number
// by retirement.
//
// Everything is derived from the projection rows, so none of the projection's
// rules are copied here. The one exception is the "today's savings with no
// further contributions" path, which calls `projectPortfolio` with a $0
// contribution rather than re-implementing it.
//
// Called by `summariseProjection` (src/engine/fiNumber.ts). Pure, like the
// rest of the engine.

import type { Explained, ExplanationLine } from "./explained";
import { projectPortfolio, type ProjectionInputs, type ProjectionRow } from "./projection";

/** One year of the Coast FIRE path, from today (row 0) to the retirement row. All dollars are nominal. */
export interface CoastPathPoint {
  /** 0 for today, up to the years until the target retirement age. */
  readonly yearIndex: number;
  readonly calendarYear: number;
  readonly age: number;
  /** (1+i)^yearIndex; a value in today's dollars is the nominal value ÷ this. */
  readonly inflationIndex: number;
  /** coast(k) = cash(k) + portfolioNeeded(k): the savings you need in this year to coast. */
  readonly coastNumber: number;
  /** The portfolio part of the Coast FIRE number in this year, at least 0. */
  readonly portfolioNeeded: number;
  /** Cash plus portfolio on the current path (with contributions). */
  readonly investable: number;
  /** Cash plus portfolio if today's savings were left alone from now on (no contributions). */
  readonly withoutContributions: number;
  /** The FI number in this year's dollars. */
  readonly fiNumber: number;
}

/** The year Coast FIRE is reached, with the working behind it. */
export interface CoastMilestone {
  readonly yearIndex: number;
  readonly calendarYear: number;
  readonly age: number;
  /** Investable net worth against the Coast FIRE number in that year. */
  readonly explanation: Explained;
}

/** Everything the Coast FIRE results show. */
export interface CoastFire {
  /** coast(0) in today's dollars, with its breakdown. */
  readonly number: Explained;
  /** coast(0) × (1+i)^n: the same amount in the retirement year's dollars. */
  readonly numberInRetirementYearDollars: number;
  /** Rows 0 to the retirement row, for the Coast FIRE chart. */
  readonly path: readonly CoastPathPoint[];
  /** `undefined` when it isn't reached by the retirement year. */
  readonly reached?: CoastMilestone;
}

/**
 * Works out the Coast FIRE number, its path over time and when it is reached.
 *
 * `rows` are the plan's projection (from `projectPortfolio`) and `inputs` are
 * the settings that produced them; row 0's calendar year is the start year.
 * The retirement row is `retirementAge − currentAge`. Called once per summary
 * by `summariseProjection`. Never throws on user data.
 */
export function calculateCoastFire(
  rows: readonly ProjectionRow[],
  inputs: ProjectionInputs,
): CoastFire {
  const startYear = rows[0]?.calendarYear ?? 0;

  // Rows past the retirement row (the drawdown years) play no part in coasting.
  const retirementRowIndex = Math.min(
    Math.max(0, inputs.retirementAge - inputs.currentAge),
    Math.max(0, rows.length - 1),
  );
  const workingRows = rows.slice(0, retirementRowIndex + 1);

  // "Today's savings with no further contributions": the real projection,
  // with the contribution switched off.
  const withoutContributionsRows = projectPortfolio(
    { ...inputs, annualContribution: 0 },
    startYear,
  );

  const path = workingRows.map((row): CoastPathPoint => {
    const need = portfolioNeededFromRow(workingRows, row.yearIndex, inputs);

    return {
      yearIndex: row.yearIndex,
      calendarYear: row.calendarYear,
      age: row.age,
      inflationIndex: row.inflationIndex,
      coastNumber: row.cashClosing + need.portfolioNeeded,
      portfolioNeeded: need.portfolioNeeded,
      investable: row.investableClosing,
      withoutContributions:
        withoutContributionsRows[row.yearIndex]?.investableClosing ?? row.investableClosing,
      fiNumber: row.fiNumber,
    };
  });

  const today = path[0];
  const retirementRow = workingRows[retirementRowIndex];
  const todayRow = workingRows[0];

  // No rows at all can't happen for a complete projection; stay total anyway.
  if (today === undefined || retirementRow === undefined || todayRow === undefined) {
    return {
      number: { value: 0, unit: "dollars", lines: [] },
      numberInRetirementYearDollars: 0,
      path: [],
    };
  }

  const todayNeed = portfolioNeededFromRow(workingRows, 0, inputs);
  const number = explainCoastNumber(todayRow, retirementRow, todayNeed, today, inputs);
  const reached = findCoastReached(path);

  return {
    number,
    numberInRetirementYearDollars: number.value * retirementRow.inflationIndex,
    path,
    ...(reached === undefined ? {} : { reached }),
  };
}

/** What coasting from one row needs, with the pieces that go into its explanation. */
interface PortfolioNeed {
  /** The portfolio needed at that row, at least 0 (nominal, that row's dollars). */
  readonly portfolioNeeded: number;
  /** The FI number at the retirement row. */
  readonly fiNumberAtRetirement: number;
  /** Cash left at the retirement row after paying the dated expenses it can. */
  readonly cashLeftAtRetirement: number;
  /** Dated expenses the cash couldn't pay, each grown to the retirement row at the portfolio return, summed. */
  readonly spillsGrownToRetirement: number;
  /** (1+r)^(years from that row to retirement). */
  readonly portfolioGrowthFactor: number;
  /** Whether any dated expense falls between that row and retirement. */
  readonly hasDatedExpenses: boolean;
}

/**
 * Applies the formula in the header: portfolioNeeded(k) for the row at
 * `fromIndex`, looking forward to the last row of `workingRows` (the
 * retirement row).
 *
 * Cash grows at the interest rate and pays each later row's dated expenses
 * first. Before retirement a row's `spending` is only dated expenses
 * (retirement spending starts the year after), so it is read straight off the
 * projection rows instead of being recomputed. Whatever the cash can't pay
 * spills to the portfolio and is grown to the retirement row.
 */
function portfolioNeededFromRow(
  workingRows: readonly ProjectionRow[],
  fromIndex: number,
  inputs: ProjectionInputs,
): PortfolioNeed {
  const retirementRowIndex = workingRows.length - 1;
  const fromRow = workingRows[fromIndex];
  const retirementRow = workingRows[retirementRowIndex];

  if (fromRow === undefined || retirementRow === undefined) {
    return {
      portfolioNeeded: 0,
      fiNumberAtRetirement: 0,
      cashLeftAtRetirement: 0,
      spillsGrownToRetirement: 0,
      portfolioGrowthFactor: 1,
      hasDatedExpenses: false,
    };
  }

  let cash = fromRow.cashClosing;
  let spillsGrownToRetirement = 0;
  let hasDatedExpenses = false;

  for (let rowIndex = fromIndex + 1; rowIndex <= retirementRowIndex; rowIndex++) {
    const datedSpending = workingRows[rowIndex]?.spending ?? 0;
    const cashAvailable = cash * (1 + inputs.interestRate);
    const paidFromCash = Math.min(datedSpending, cashAvailable);
    const spill = datedSpending - paidFromCash;

    if (datedSpending > 0) hasDatedExpenses = true;

    // A spill in row j is paid by the portfolio, so it must be covered by
    // that much more at row k, grown at the portfolio's own return.
    spillsGrownToRetirement +=
      spill * Math.pow(1 + inputs.expectedReturn, retirementRowIndex - rowIndex);
    cash = cashAvailable - paidFromCash;
  }

  const portfolioGrowthFactor = Math.pow(1 + inputs.expectedReturn, retirementRowIndex - fromIndex);
  const needed = (retirementRow.fiNumber - cash + spillsGrownToRetirement) / portfolioGrowthFactor;

  return {
    portfolioNeeded: Math.max(0, needed),
    fiNumberAtRetirement: retirementRow.fiNumber,
    cashLeftAtRetirement: cash,
    spillsGrownToRetirement,
    portfolioGrowthFactor,
    hasDatedExpenses,
  };
}

/**
 * Builds the Coast FIRE number's breakdown (row 0, today's dollars), line by
 * line as the formula runs. The dated-expense line is shown only when a dated
 * expense falls before retirement, and the cash line says so.
 */
function explainCoastNumber(
  todayRow: ProjectionRow,
  retirementRow: ProjectionRow,
  need: PortfolioNeed,
  today: CoastPathPoint,
  inputs: ProjectionInputs,
): Explained {
  const yearsToRetirement = retirementRow.yearIndex - todayRow.yearIndex;
  const interestPercent = formatPercent(inputs.interestRate);
  const returnPercent = formatPercent(inputs.expectedReturn);

  const cashLabel = `Your cash, growing at ${interestPercent} to ${retirementRow.calendarYear}`;
  const lines: ExplanationLine[] = [
    {
      label: `FI number at age ${retirementRow.age} (${retirementRow.calendarYear})`,
      value: need.fiNumberAtRetirement,
      unit: "dollars",
      source: "calculated",
    },
    {
      label: need.hasDatedExpenses
        ? `${cashLabel}, after paying the dated expenses it can`
        : cashLabel,
      value: need.cashLeftAtRetirement,
      unit: "dollars",
      operator: "−",
      source: "calculated",
    },
  ];

  if (need.hasDatedExpenses) {
    lines.push({
      label: `Dated expenses the portfolio would pay, grown to ${retirementRow.calendarYear}`,
      value: need.spillsGrownToRetirement,
      unit: "dollars",
      operator: "+",
      source: "calculated",
    });
  }

  lines.push(
    {
      label: `Portfolio growth at ${returnPercent} over ${yearsToRetirement} years`,
      value: need.portfolioGrowthFactor,
      unit: "factor",
      operator: "÷",
      source: "calculated",
    },
    {
      label: "Portfolio needed today",
      value: need.portfolioNeeded,
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
      label: "Coast FIRE number",
      value: today.coastNumber,
      unit: "dollars",
      operator: "=",
      source: "calculated",
    },
  );

  return { value: today.coastNumber, unit: "dollars", lines };
}

/**
 * Finds the first row (today included) where investable net worth is at least
 * the Coast FIRE number, with the margin as its explanation. `undefined` when
 * no row up to retirement gets there.
 */
function findCoastReached(path: readonly CoastPathPoint[]): CoastMilestone | undefined {
  const point = path.find((candidate) => candidate.investable >= candidate.coastNumber);

  if (point === undefined) {
    return undefined;
  }

  const lines: ExplanationLine[] = [
    {
      label: `Investable at end of ${point.calendarYear} (age ${point.age})`,
      value: point.investable,
      unit: "dollars",
      source: "calculated",
    },
    {
      label: `Coast FIRE number in ${point.calendarYear}`,
      value: point.coastNumber,
      unit: "dollars",
      operator: "−",
      source: "calculated",
    },
    {
      // The margin by which savings are at or above the Coast FIRE number.
      label: "Coast FIRE reached",
      value: point.investable - point.coastNumber,
      unit: "dollars",
      operator: "=",
      source: "calculated",
    },
  ];

  return {
    yearIndex: point.yearIndex,
    calendarYear: point.calendarYear,
    age: point.age,
    explanation: { value: point.investable, unit: "dollars", lines },
  };
}

/** Shows a fraction as a percentage without floating-point noise: 0.07 becomes "7%". */
function formatPercent(fraction: number): string {
  return `${Number((fraction * 100).toPrecision(12))}%`;
}
