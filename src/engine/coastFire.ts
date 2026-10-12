// Coast FIRE (COAST-1, COAST-2): how much you need saved today so that, with
// no further contributions, you would still reach your FI number by your
// target retirement age; and the first year your actual savings get there.
//
// What has to be solved. Coasting means you stop the contributions you
// choose to make: the portfolio's, salary sacrifice and non-concessional.
// Your employer keeps paying while you work, so super grows to superLeft(k)
// at the retirement row with employer contributions only; that path comes
// from `projectPortfolio` with voluntary contributions switched off after
// row k. Each year's dated expenses are paid from the portfolio first, then
// super (from 65) and cash last (see projection.ts). Looking forward from
// row k to the retirement row n (m = n − k years), only the portfolio's
// starting amount P is ours to choose. portfolioNeeded(k) is the smallest P
// that still reaches the FI number at row n:
//
//   coast path from row k, starting with portfolio P and cash(k):
//     each row j: portfolio grows at r, cash at the interest rate g;
//                 the portfolio pays row j's dated expenses, cash pays what
//                 the portfolio can't (super is left untouched here)
//     at row n:   portfolioLeft(P) + cashLeft(P) + superLeft(k)
//                 must be ≥ the FI number at row n, and every dated expense
//                 on the way must have been paid
//
// In the usual case the portfolio pays every dated expense, cash is never
// touched and grows to cash(k) × (1+g)^m, and P has a closed form:
//
//                  FI number − cash(k) × (1+g)^m − superLeft(k) + Σ dated(j) × (1+r)^(n−j)
//   portfolioNeeded(k) = ─────────────────────────────────────────────────────────────────  (at least 0)
//                                               (1+r)^m
//
// When cash and super alone would beat the FI number but the dated expenses
// would empty a smaller portfolio and dip into cash, the closed form doesn't
// apply, and P is found by bisection on the coast path (it only grows with P).
//
//   coast(k) = cash(k) + super(k) + portfolioNeeded(k)   (nominal, in year k's dollars)
//
//   row:    0 ──────── k ──────────────── n (retirement)
//           │          │                   │
//           │          └─ coast(k): what you need at row k to coast from here
//           └─ coast(0): "the Coast FIRE number"
//
// Coast FIRE is reached in the first row k from which stopping your voluntary
// contributions still reaches the FI number by retirement. That is decided
// exactly, by re-running the projection with the contributions stopped after
// row k (see `testStoppingAfterRow`). The closed form above gives the number
// and the chart line, and agrees with the exact test except when a dated
// expense from age 65 is paid from super, which the formula doesn't model.
//
// Everything is derived from the projection rows, so none of the projection's
// rules are copied here. The paths "with voluntary contributions stopped after
// row k" call `projectPortfolio` with the contributions switched off rather
// than re-implementing it.
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
  /** coast(k) = cash(k) + super(k) + portfolioNeeded(k): the savings you need in this year to coast. */
  readonly coastNumber: number;
  /** The portfolio part of the Coast FIRE number in this year, at least 0. */
  readonly portfolioNeeded: number;
  /** Cash plus portfolio plus super on the current path (with contributions). */
  readonly investable: number;
  /** Investable if you stopped your voluntary contributions now (employer contributions continue). */
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

  // "Voluntary contributions stopped from now": the real projection, with
  // them switched off after row 0.
  const withoutContributionsRows = projectPortfolio(
    inputsWithVoluntaryContributionsStoppedAfter(inputs, 0, startYear),
    startYear,
  );

  const path = workingRows.map((row): CoastPathPoint => {
    const superLeft = superAtRetirementWhenCoastingFrom(inputs, row.yearIndex, startYear);
    const need = portfolioNeededFromRow(workingRows, row.yearIndex, inputs, superLeft);

    return {
      yearIndex: row.yearIndex,
      calendarYear: row.calendarYear,
      age: row.age,
      inflationIndex: row.inflationIndex,
      coastNumber: row.cashClosing + row.superClosing + need.portfolioNeeded,
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

  const todayNeed = portfolioNeededFromRow(
    workingRows,
    0,
    inputs,
    superAtRetirementWhenCoastingFrom(inputs, 0, startYear),
  );
  const number = explainCoastNumber(todayRow, retirementRow, todayNeed, today, inputs);
  const reached = findCoastReached(path, workingRows, inputs, startYear);

  return {
    number,
    numberInRetirementYearDollars: number.value * retirementRow.inflationIndex,
    path,
    ...(reached === undefined ? {} : { reached }),
  };
}

/**
 * The inputs for a projection in which every contribution you choose to make
 * (portfolio, salary sacrifice, non-concessional) stops after row `yearIndex`.
 * Employer contributions are untouched. The portfolio stop age and the
 * voluntary super end years are only ever pulled earlier, never later.
 * Called by `calculateCoastFire`; the rules themselves stay in `projectPortfolio`.
 */
export function inputsWithVoluntaryContributionsStoppedAfter(
  inputs: ProjectionInputs,
  yearIndex: number,
  startYear: number,
): ProjectionInputs {
  const stopAge = inputs.currentAge + yearIndex;
  const lastYear = startYear + yearIndex;
  const account = inputs.superAccount;

  return {
    ...inputs,
    contributionsStopAge: Math.min(inputs.contributionsStopAge, stopAge),
    ...(account === undefined
      ? {}
      : {
          superAccount: {
            ...account,
            salarySacrifice: {
              ...account.salarySacrifice,
              toYear: Math.min(account.salarySacrifice.toYear ?? lastYear, lastYear),
            },
            nonConcessional: {
              ...account.nonConcessional,
              toYear: Math.min(account.nonConcessional.toYear ?? lastYear, lastYear),
            },
          },
        }),
  };
}

/**
 * superLeft(k): super at the retirement row if voluntary contributions stop
 * after row `fromIndex` and employer contributions carry on. Taken from
 * `projectPortfolio` with no dated expenses, since the Coast FIRE formula has
 * the portfolio (then cash) pay them, leaving super untouched before retirement.
 * 0 when there is no super account. Called by `calculateCoastFire` per row.
 */
function superAtRetirementWhenCoastingFrom(
  inputs: ProjectionInputs,
  fromIndex: number,
  startYear: number,
): number {
  if (inputs.superAccount === undefined) return 0;

  const retirementRowIndex = inputs.retirementAge - inputs.currentAge;
  const coastingRows = projectPortfolio(
    {
      ...inputsWithVoluntaryContributionsStoppedAfter(inputs, fromIndex, startYear),
      datedExpenses: [],
      endAge: inputs.retirementAge,
    },
    startYear,
  );

  return coastingRows[retirementRowIndex]?.superClosing ?? 0;
}

/** What coasting from one row needs, with the pieces that go into its explanation. */
export interface PortfolioNeed {
  /** The portfolio needed at that row, at least 0 (nominal, that row's dollars). */
  readonly portfolioNeeded: number;
  /** The FI number at the retirement row. */
  readonly fiNumberAtRetirement: number;
  /** Cash left at the retirement row on the coast path, after paying what the portfolio couldn't. */
  readonly cashLeftAtRetirement: number;
  /** Super at the retirement row with employer contributions only, untouched by dated expenses. */
  readonly superLeftAtRetirement: number;
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
  /**
   * Dated expenses neither the portfolio nor cash could pay. Super is left
   * untouched on the coast path, so with little cash this can be above 0 even
   * when cash and super cover the FI number; such a path doesn't count.
   */
  readonly unpaid: number;
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
 * projection rows instead of being recomputed. `superLeftAtRetirement` is
 * superLeft(k), from `superAtRetirementWhenCoastingFrom`.
 *
 * `targetAtRetirement` is the amount the coast path must reach at the
 * retirement row: the FI number for Coast FIRE itself, or the bridge need for
 * the outside-super test in coastSplit.ts (which also passes 0 for super).
 */
export function portfolioNeededFromRow(
  workingRows: readonly ProjectionRow[],
  fromIndex: number,
  inputs: ProjectionInputs,
  superLeftAtRetirement: number,
  targetAtRetirement: number = workingRows[workingRows.length - 1]?.fiNumber ?? 0,
): PortfolioNeed {
  const retirementRowIndex = workingRows.length - 1;
  const fromRow = workingRows[fromIndex];
  const retirementRow = workingRows[retirementRowIndex];

  if (fromRow === undefined || retirementRow === undefined) {
    return {
      portfolioNeeded: 0,
      fiNumberAtRetirement: 0,
      cashLeftAtRetirement: 0,
      superLeftAtRetirement: 0,
      portfolioPaymentsGrownToRetirement: 0,
      portfolioGrowthFactor: 1,
      hasDatedExpenses: false,
    };
  }

  const datedSpendingByRow = workingRows
    .slice(fromIndex + 1)
    .map((row) => ({ rowIndex: row.yearIndex, datedSpending: row.spending }));
  const hasDatedExpenses = datedSpendingByRow.some((row) => row.datedSpending > 0);

  const fiNumber = targetAtRetirement;
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
  // A path only counts if it also pays every dated expense on the way. A
  // fully paid expense nets to exactly 0 unpaid, so no tolerance is needed.
  const reachesFi = (end: CoastPathEnd) =>
    end.unpaid <= 0 && end.portfolioLeft + end.cashLeft + superLeftAtRetirement >= fiNumber;

  let portfolioNeeded: number;

  if (reachesFi(endsWith(0))) {
    // Cash and super alone (cash paying any dated expenses) get there.
    portfolioNeeded = 0;
  } else if (fiNumber - superLeftAtRetirement >= cashGrownUntouched) {
    // The usual case: the closed form in the header. The portfolio left at
    // retirement is FI − untouched cash − super ≥ 0, so it never ran dry on
    // the way and the cash was never touched.
    portfolioNeeded =
      (fiNumber - cashGrownUntouched - superLeftAtRetirement + allDatedSpendingGrown) /
      portfolioGrowthFactor;
  } else {
    // Untouched cash and super would beat the FI number, but the dated
    // expenses would drain the cash. The answer lies between 0 (not enough) and the amount that
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
    superLeftAtRetirement,
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
  let unpaid = 0;

  for (const { rowIndex, datedSpending } of datedSpendingByRow) {
    portfolio *= 1 + inputs.expectedReturn;
    cash *= 1 + inputs.interestRate;

    const fromPortfolio = Math.min(datedSpending, portfolio);
    const fromCash = Math.min(datedSpending - fromPortfolio, cash);

    portfolio -= fromPortfolio;
    cash -= fromCash;
    unpaid += datedSpending - fromPortfolio - fromCash;

    // A payment in row j would otherwise have kept growing at the portfolio's
    // return to the retirement row, so that is what it costs the portfolio.
    portfolioPaymentsGrownToRetirement +=
      fromPortfolio * Math.pow(1 + inputs.expectedReturn, retirementRowIndex - rowIndex);
  }

  return { portfolioLeft: portfolio, cashLeft: cash, portfolioPaymentsGrownToRetirement, unpaid };
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
        ? `${cashLabel}, after paying what the portfolio can't`
        : cashLabel,
      value: need.cashLeftAtRetirement,
      unit: "dollars",
      operator: "−",
      source: "calculated",
    },
  ];

  // Shown only when there is super, so plans without any read as in M4.
  const hasSuper = need.superLeftAtRetirement !== 0 || todayRow.superClosing !== 0;

  if (hasSuper) {
    lines.push({
      label: `Your super, growing at ${formatPercent(inputs.superAccount?.returnRate ?? 0)} net of fees and tax, with employer contributions, to ${retirementRow.calendarYear}`,
      value: need.superLeftAtRetirement,
      unit: "dollars",
      operator: "−",
      source: "calculated",
    });
  }

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
  );

  if (hasSuper) {
    lines.push({
      label: "Your super today",
      value: todayRow.superClosing,
      unit: "dollars",
      operator: "+",
      source: "calculated",
    });
  }

  lines.push({
    label: "Coast FIRE number",
    value: today.coastNumber,
    unit: "dollars",
    operator: "=",
    source: "calculated",
  });

  return { value: today.coastNumber, unit: "dollars", lines };
}

/**
 * What the exact "could I stop now?" test found for one row: whether stopping
 * the voluntary contributions after it still works, and the figures behind that.
 */
interface StopTest {
  readonly succeeds: boolean;
  /** Investable at the retirement row if you stop after this row. */
  readonly investableAtRetirement: number;
}

/**
 * The exact test for one row k: run the real projection with every voluntary
 * contribution stopped after row k (employer contributions carry on), up to
 * the retirement row. It succeeds when investable at the retirement row is at
 * least that row's FI number, and no year after k has a shortfall that the
 * plan with its contributions doesn't already have. Called by `findCoastReached`.
 *
 * This test, not the closed-form number, decides "reached", because the
 * formula assumes the portfolio pays every dated expense while the projection
 * draws super for one from age 65, before cash. They agree except in that
 * edge case.
 */
function testStoppingAfterRow(
  workingRows: readonly ProjectionRow[],
  inputs: ProjectionInputs,
  rowIndex: number,
  startYear: number,
): StopTest {
  const retirementRowIndex = workingRows.length - 1;
  const retirementRow = workingRows[retirementRowIndex];

  const stoppedRows = projectPortfolio(
    {
      ...inputsWithVoluntaryContributionsStoppedAfter(inputs, rowIndex, startYear),
      endAge: inputs.retirementAge,
    },
    startYear,
  );
  const stoppedRetirementRow = stoppedRows[retirementRowIndex];

  if (retirementRow === undefined || stoppedRetirementRow === undefined) {
    return { succeeds: false, investableAtRetirement: 0 };
  }

  // A small allowance for floating-point noise, relative to the size of the numbers.
  const noise = 1e-9 * Math.max(1, Math.abs(retirementRow.fiNumber));
  const reachesFiNumber = stoppedRetirementRow.investableClosing >= retirementRow.fiNumber - noise;

  let hasNewShortfall = false;
  for (let index = rowIndex + 1; index <= retirementRowIndex; index++) {
    const stoppedShortfall = stoppedRows[index]?.shortfall ?? 0;
    const plannedShortfall = workingRows[index]?.shortfall ?? 0;

    if (stoppedShortfall > noise && plannedShortfall <= noise) hasNewShortfall = true;
  }

  return {
    succeeds: reachesFiNumber && !hasNewShortfall,
    investableAtRetirement: stoppedRetirementRow.investableClosing,
  };
}

/**
 * Finds the first row (today included) from which stopping your voluntary
 * contributions still gets you to the FI number by retirement, decided exactly
 * by `testStoppingAfterRow` (n + 1 short projections). `undefined` when no row
 * up to retirement works.
 *
 * The explanation keeps the closed-form margin lines, then adds the two lines
 * that state the exact test. In the edge case the formula and the test differ
 * (see `testStoppingAfterRow`), the margin can be slightly negative while the
 * appended lines show why it still counts as reached.
 */
function findCoastReached(
  path: readonly CoastPathPoint[],
  workingRows: readonly ProjectionRow[],
  inputs: ProjectionInputs,
  startYear: number,
): CoastMilestone | undefined {
  const retirementRow = workingRows[workingRows.length - 1];

  for (const point of path) {
    const stopTest = testStoppingAfterRow(workingRows, inputs, point.yearIndex, startYear);

    if (!stopTest.succeeds || retirementRow === undefined) continue;

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
      {
        label: `If you stop voluntary contributions after ${point.calendarYear}: investable at ${retirementRow.calendarYear}`,
        value: stopTest.investableAtRetirement,
        unit: "dollars",
        source: "calculated",
      },
      {
        label: `FI number at ${retirementRow.calendarYear}`,
        value: retirementRow.fiNumber,
        unit: "dollars",
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

  return undefined;
}

/** Shows a fraction as a percentage without floating-point noise: 0.07 becomes "7%". */
function formatPercent(fraction: number): string {
  return `${Number((fraction * 100).toPrecision(12))}%`;
}
