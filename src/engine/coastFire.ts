// Coast FIRE (COAST-1, COAST-2): how much you need saved today so that, with
// no further contributions, you would still reach your FI number by your
// target retirement age; and the first year your actual savings get there.
//
// What has to be solved. Contributions go only into the portfolio, and each
// year's dated expenses are paid from the portfolio first and from cash only
// once the portfolio is empty (see projection.ts). Looking forward from row k
// to the retirement row n (m = n − k years) with nothing more contributed,
// cash starts at cash(k) and only the portfolio's starting amount P is ours to
// choose. portfolioNeeded(k) is the smallest P that still reaches the FI
// number at row n:
//
//   coast path from row k, starting with portfolio P and cash(k):
//     each row j: portfolio grows at r, cash at the interest rate g;
//                 the portfolio pays row j's dated expenses, cash pays what
//                 the portfolio can't
//     at row n:   portfolioLeft(P) + cashLeft(P)  must be ≥ FI number at row n
//
// In the usual case the portfolio pays every dated expense, cash is never
// touched and grows to cash(k) × (1+g)^m, and P has a closed form:
//
//                  FI number at row n − cash(k) × (1+g)^m + Σ dated(j) × (1+r)^(n−j)
//   portfolioNeeded(k) = ──────────────────────────────────────────────────────────  (at least 0)
//                                             (1+r)^m
//
// (If the result is at least what the cash can't cover by itself, the
// portfolio is never emptied on the way, so the closed form is exact.) When
// cash alone would beat the FI number but the dated expenses would empty a
// smaller portfolio and dip into cash, the closed form doesn't apply, and P is
// found by bisection on the coast path itself (it only ever grows with P).
//
//   coast(k) = cash(k) + portfolioNeeded(k)        (nominal, in year k's dollars)
//
//   row:    0 ──────── k ──────────────── n (retirement)
//           │          │                   │
//           │          └─ coast(k): what you need at row k to coast from here
//           └─ coast(0): "the Coast FIRE number"
//
// Coast FIRE is reached in the first row k where investable net worth on the
// current path is at least coast(k). Both paths share cash(k) at row k, so
// that is the same as "the portfolio is at least portfolioNeeded(k)", which
// means: if you stopped contributing after year k, you would still reach the
// FI number by retirement.
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
  /** Cash left at the retirement row on the coast path, after paying what the portfolio couldn't. */
  readonly cashLeftAtRetirement: number;
  /** Dated expenses the portfolio pays on the coast path, each grown to the retirement row at the portfolio return, summed. */
  readonly portfolioPaymentsGrownToRetirement: number;
  /** (1+r)^(years from that row to retirement). */
  readonly portfolioGrowthFactor: number;
  /** Whether any dated expense falls between that row and retirement. */
  readonly hasDatedExpenses: boolean;
}

/** Where the coast path from one row ends up at the retirement row, for one starting portfolio. */
interface CoastPathEnd {
  readonly portfolioLeft: number;
  readonly cashLeft: number;
  /** Dated expenses the portfolio paid, each grown to the retirement row at the portfolio return, summed. */
  readonly portfolioPaymentsGrownToRetirement: number;
}

/** Bisection steps when the closed form doesn't apply: enough to reach floating-point precision. */
const BISECTION_STEPS = 200;

/**
 * Applies the formula in the header: portfolioNeeded(k) for the row at
 * `fromIndex`, looking forward to the last row of `workingRows` (the
 * retirement row). Called by `calculateCoastFire` for every row of the path.
 *
 * Before retirement a row's `spending` is only dated expenses (retirement
 * spending starts the year after), so they are read straight off the
 * projection rows instead of being recomputed.
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
      portfolioPaymentsGrownToRetirement: 0,
      portfolioGrowthFactor: 1,
      hasDatedExpenses: false,
    };
  }

  const datedSpendingByRow = workingRows
    .slice(fromIndex + 1)
    .map((row) => ({ rowIndex: row.yearIndex, datedSpending: row.spending }));
  const hasDatedExpenses = datedSpendingByRow.some((row) => row.datedSpending > 0);

  const fiNumber = retirementRow.fiNumber;
  const portfolioGrowthFactor = Math.pow(1 + inputs.expectedReturn, retirementRowIndex - fromIndex);
  const cashGrownUntouched =
    fromRow.cashClosing * Math.pow(1 + inputs.interestRate, retirementRowIndex - fromIndex);
  const allDatedSpendingGrown = datedSpendingByRow.reduce(
    (total, row) =>
      total +
      row.datedSpending * Math.pow(1 + inputs.expectedReturn, retirementRowIndex - row.rowIndex),
    0,
  );

  const endsWith = (startingPortfolio: number): CoastPathEnd =>
    followCoastPath(
      startingPortfolio,
      fromRow.cashClosing,
      datedSpendingByRow,
      retirementRowIndex,
      inputs,
    );
  const reachesFi = (end: CoastPathEnd) => end.portfolioLeft + end.cashLeft >= fiNumber;

  let portfolioNeeded: number;

  if (reachesFi(endsWith(0))) {
    // Cash alone (paying any dated expenses) gets there.
    portfolioNeeded = 0;
  } else if (fiNumber >= cashGrownUntouched) {
    // The usual case: the closed form in the header. The portfolio left at
    // retirement is FI − untouched cash ≥ 0, so it never ran dry on the way
    // and the cash was never touched.
    portfolioNeeded =
      (fiNumber - cashGrownUntouched + allDatedSpendingGrown) / portfolioGrowthFactor;
  } else {
    // Untouched cash would beat the FI number, but the dated expenses would
    // drain it. The answer lies between 0 (not enough) and the amount that
    // pays every expense and reaches the FI number on its own.
    let tooLittle = 0;
    let enough = (fiNumber + allDatedSpendingGrown) / portfolioGrowthFactor;

    for (let step = 0; step < BISECTION_STEPS; step++) {
      const middle = (tooLittle + enough) / 2;
      if (reachesFi(endsWith(middle))) {
        enough = middle;
      } else {
        tooLittle = middle;
      }
    }

    portfolioNeeded = enough;
  }

  const end = endsWith(portfolioNeeded);

  return {
    portfolioNeeded,
    fiNumberAtRetirement: fiNumber,
    cashLeftAtRetirement: end.cashLeft,
    portfolioPaymentsGrownToRetirement: end.portfolioPaymentsGrownToRetirement,
    portfolioGrowthFactor,
    hasDatedExpenses,
  };
}

/**
 * Runs the coast path forward from one row with a given starting portfolio
 * and no contributions: each row grows the portfolio and cash, then pays the
 * dated expenses from the portfolio first and cash last, as `projectPortfolio`
 * does. Called by `portfolioNeededFromRow`, for the answer and while
 * bisecting.
 */
function followCoastPath(
  startingPortfolio: number,
  startingCash: number,
  datedSpendingByRow: readonly { rowIndex: number; datedSpending: number }[],
  retirementRowIndex: number,
  inputs: ProjectionInputs,
): CoastPathEnd {
  let portfolio = startingPortfolio;
  let cash = startingCash;
  let portfolioPaymentsGrownToRetirement = 0;

  for (const { rowIndex, datedSpending } of datedSpendingByRow) {
    portfolio *= 1 + inputs.expectedReturn;
    cash *= 1 + inputs.interestRate;

    const fromPortfolio = Math.min(datedSpending, portfolio);
    const fromCash = Math.min(datedSpending - fromPortfolio, cash);

    portfolio -= fromPortfolio;
    cash -= fromCash;

    // A payment in row j would otherwise have kept growing at the portfolio's
    // return to the retirement row, so that is what it costs the portfolio.
    portfolioPaymentsGrownToRetirement +=
      fromPortfolio * Math.pow(1 + inputs.expectedReturn, retirementRowIndex - rowIndex);
  }

  return { portfolioLeft: portfolio, cashLeft: cash, portfolioPaymentsGrownToRetirement };
}

/**
 * Builds the Coast FIRE number's breakdown (row 0, today's dollars), line by
 * line as the formula runs. The dated-expense line is shown only when a dated
 * expense falls before retirement, and the cash line says so. The cash and
 * dated-expense lines come from the coast path at the answer, so the lines
 * add up whichever way the answer was found.
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
        ? `${cashLabel}, after paying what the portfolio can't`
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
      value: need.portfolioPaymentsGrownToRetirement,
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
