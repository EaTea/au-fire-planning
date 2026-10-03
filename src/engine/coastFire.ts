// Coast FIRE (COAST-1, COAST-2): how much you need saved today so that, with
// no further contributions, you would still reach your FI number by your
// target retirement age; and the first year your actual savings get there.
//
// Why only the portfolio needs solving. Coasting means you stop the
// contributions you choose to make: the portfolio's, salary sacrifice and
// non-concessional. Dated expenses are paid from cash first (see
// projection.ts), so cash follows the same path whether or not you keep
// contributing. Super also follows its own path: your employer keeps paying
// while you work, so it grows with employer contributions only. Only the
// portfolio's part is left to solve, and it has a closed form. Looking forward
// from row k to the retirement row n (m = n − k years):
//
//   cash:       cash(k) grows at the interest rate and pays dated expenses
//               first. At row n it has cashLeft(k) left. A dated expense the
//               cash can't pay in full "spills" to the portfolio: spill(j).
//
//   super:      super(k) grows to superLeft(k) at row n with employer
//               contributions only. That path comes from `projectPortfolio`
//               with voluntary contributions switched off after row k (and
//               without dated expenses, because the portfolio is assumed to
//               pay any spill, so super is never drawn on before retirement).
//
//                  FI number at row n − cashLeft(k) − superLeft(k) + Σ spill(j) × (1+r)^(n−j)
//   portfolioNeeded(k) = ─────────────────────────────────────────────────────────────────  (at least 0)
//                                        (1+r)^m
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
function inputsWithVoluntaryContributionsStoppedAfter(
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
 * the portfolio pay any spill, leaving super untouched before retirement.
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
interface PortfolioNeed {
  /** The portfolio needed at that row, at least 0 (nominal, that row's dollars). */
  readonly portfolioNeeded: number;
  /** The FI number at the retirement row. */
  readonly fiNumberAtRetirement: number;
  /** Cash left at the retirement row after paying the dated expenses it can. */
  readonly cashLeftAtRetirement: number;
  /** Super at the retirement row with employer contributions only. */
  readonly superLeftAtRetirement: number;
  /** Dated expenses the cash couldn't pay, each grown to the retirement row at the portfolio return, summed. */
  readonly spillsGrownToRetirement: number;
  /** (1+r)^(years from that row to retirement). */
  readonly portfolioGrowthFactor: number;
  /** Whether any dated expense falls between that row and retirement. */
  readonly hasDatedExpenses: boolean;
  /**
   * True when the portfolio needed is set by paying the dated expenses cash
   * can't, rather than by the FI number (only possible when cash and super
   * already cover the FI number on their own).
   */
  readonly limitedBySpills: boolean;
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
  superLeftAtRetirement: number,
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
      spillsGrownToRetirement: 0,
      portfolioGrowthFactor: 1,
      hasDatedExpenses: false,
      limitedBySpills: false,
    };
  }

  let cash = fromRow.cashClosing;
  let spillsGrownToRetirement = 0;
  let hasDatedExpenses = false;
  let spillsDiscountedToFromRow = 0;

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
    spillsDiscountedToFromRow += spill / Math.pow(1 + inputs.expectedReturn, rowIndex - fromIndex);
    cash = cashAvailable - paidFromCash;
  }

  const portfolioGrowthFactor = Math.pow(1 + inputs.expectedReturn, retirementRowIndex - fromIndex);
  const neededForFiNumber =
    (retirementRow.fiNumber - cash - superLeftAtRetirement + spillsGrownToRetirement) /
    portfolioGrowthFactor;

  // The portfolio can't go below $0 on the way. When cash and super alone
  // already cover the FI number, the end-of-path sum can be small or negative
  // while the portfolio still has to be there to pay each spill when it falls
  // due. Super can't pay it (the formula keeps super untouched), so the
  // portfolio needed is never less than the spills discounted back to row k.
  const needed = Math.max(neededForFiNumber, spillsDiscountedToFromRow);

  return {
    portfolioNeeded: Math.max(0, needed),
    fiNumberAtRetirement: retirementRow.fiNumber,
    cashLeftAtRetirement: cash,
    superLeftAtRetirement,
    spillsGrownToRetirement,
    portfolioGrowthFactor,
    hasDatedExpenses,
    limitedBySpills: spillsDiscountedToFromRow > neededForFiNumber && needed > 0,
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
      label: need.limitedBySpills
        ? "Portfolio needed today, to pay the dated expenses your cash can't"
        : "Portfolio needed today",
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
 * draws super for one from age 65. They agree except in that edge case.
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
