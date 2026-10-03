// M2's year-by-year projection of the portfolio, in nominal dollars. Pure, like
// the rest of the engine: no clock (the start year is passed in), no randomness.
//
// Row 0 is today. Row k is the end of the k-th year from now:
//
//   row 0 (today)      row 1                         row 2
//   age a, B0 ───────► age a+1                       age a+2 ...
//                      growth  = B0 × r
//                      contrib = C   (only if a+1 ≤ stop age)
//                      B1 = B0 + growth + contrib
//                      FI number = FI_today × (1+i)^1
//
// Every value in row k shares one inflation index, (1+i)^k, so converting any
// of them to today's dollars divides by that single number.

import type { Explained, ExplanationLine } from "./explained";

/** The projection runs until this age. IN-4 (the projection end age) replaces it in M3. */
export const MAX_PROJECTION_AGE = 100;

/** Plain numbers the projection needs, all resolved (see ResolvedProjectionInputs). */
export interface ProjectionInputs {
  readonly currentAge: number;
  /** Nominal return as a fraction, e.g. 0.07. */
  readonly expectedReturn: number;
  /** Inflation as a fraction, e.g. 0.025. */
  readonly inflationRate: number;
  /** Dollars added each year, the same amount every year. */
  readonly annualContribution: number;
  /** The last age in which a contribution is made. */
  readonly contributionsStopAge: number;
  /** Total of the portfolios today. */
  readonly openingBalance: number;
  /** Living expenses per year in today's dollars. */
  readonly livingAnnual: number;
  /** M1's FI number in today's dollars. */
  readonly fiNumberToday: number;
}

/** One year of the projection. All dollar values are nominal. */
export interface ProjectionRow {
  /** 0 for today, then 1, 2, ... */
  readonly yearIndex: number;
  readonly calendarYear: number;
  readonly age: number;
  /** (1+i)^yearIndex; a value in today's dollars is the nominal value ÷ this. */
  readonly inflationIndex: number;
  readonly portfolioOpening: number;
  readonly portfolioGrowth: number;
  readonly contribution: number;
  readonly portfolioClosing: number;
  readonly livingExpenses: number;
  readonly fiNumber: number;
}

/** The year the balance first reaches the FI number, with the working behind it. */
export interface FiMilestone {
  readonly yearIndex: number;
  readonly calendarYear: number;
  readonly age: number;
  /** The balance against the FI number in that year. */
  readonly explanation: Explained;
}

/**
 * Projects the portfolio year by year from today until `MAX_PROJECTION_AGE`.
 *
 * Called by `summarisePlan` (src/engine/fiNumber.ts); the Year by year and
 * Results screens show its rows. Row 0 is today (no growth or contribution,
 * closing balance = today's balance). If the current age is already past the
 * maximum, only row 0 is returned. There are no withdrawals in M2: growth just
 * continues once contributions stop.
 */
export function projectPortfolio(inputs: ProjectionInputs, startYear: number): ProjectionRow[] {
  const rows: ProjectionRow[] = [
    {
      yearIndex: 0,
      calendarYear: startYear,
      age: inputs.currentAge,
      inflationIndex: 1,
      portfolioOpening: inputs.openingBalance,
      portfolioGrowth: 0,
      contribution: 0,
      portfolioClosing: inputs.openingBalance,
      livingExpenses: inputs.livingAnnual,
      fiNumber: inputs.fiNumberToday,
    },
  ];

  let balance = inputs.openingBalance;

  for (let yearIndex = 1; inputs.currentAge + yearIndex <= MAX_PROJECTION_AGE; yearIndex++) {
    const age = inputs.currentAge + yearIndex;
    const inflationIndex = Math.pow(1 + inputs.inflationRate, yearIndex);

    const openingBalance = balance;
    const growth = openingBalance * inputs.expectedReturn;

    // The year you turn the stop age is the last one with a contribution.
    const contribution = age <= inputs.contributionsStopAge ? inputs.annualContribution : 0;

    balance = openingBalance + growth + contribution;

    rows.push({
      yearIndex,
      calendarYear: startYear + yearIndex,
      age,
      inflationIndex,
      portfolioOpening: openingBalance,
      portfolioGrowth: growth,
      contribution,
      portfolioClosing: balance,
      livingExpenses: inputs.livingAnnual * inflationIndex,
      fiNumber: inputs.fiNumberToday * inflationIndex,
    });
  }

  return rows;
}

/**
 * Finds the first row whose closing balance is at least that row's FI number
 * (for row 0 the closing balance is the opening balance, i.e. today's).
 *
 * Returns `undefined` if no row reaches it by the end of the projection. Called
 * by `summarisePlan` to fill `fiReached`, which the Results screen shows.
 */
export function findFiReached(rows: readonly ProjectionRow[]): FiMilestone | undefined {
  const row = rows.find((candidate) => candidate.portfolioClosing >= candidate.fiNumber);

  if (row === undefined) {
    return undefined;
  }

  const lines: ExplanationLine[] = [
    {
      label: `Balance at end of ${row.calendarYear} (age ${row.age})`,
      value: row.portfolioClosing,
      unit: "dollars",
      source: "calculated",
    },
    {
      label: `FI number in ${row.calendarYear}`,
      value: row.fiNumber,
      unit: "dollars",
      operator: "−",
      source: "calculated",
    },
    {
      // The margin by which the balance is at or above the FI number.
      label: "FI reached",
      value: row.portfolioClosing - row.fiNumber,
      unit: "dollars",
      operator: "=",
      source: "calculated",
    },
  ];

  return {
    yearIndex: row.yearIndex,
    calendarYear: row.calendarYear,
    age: row.age,
    explanation: { value: row.portfolioClosing, unit: "dollars", lines },
  };
}
