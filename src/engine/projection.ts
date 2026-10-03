// The year-by-year projection of cash and portfolio, in nominal dollars. Pure,
// like the rest of the engine: no clock (the start year is passed in), no
// randomness.
//
// Row 0 is today. Row k is the end of the k-th year from now:
//
//   start of year k                                 end of year k
//   cash C0  ──► + interest  = C0 × g  ──────────► cash available
//   port P0  ──► + growth    = P0 × r
//            ──► + contribution (if age ≤ stop age) ► portfolio available
//
//   spending to fund (nominal) =
//       retirement spending × index    (only if age > retirement age)
//     + dated expenses for this year × index
//
//   take it from: 1. portfolio available   2. cash available
//   anything left over = shortfall for this year (cash and portfolio end at $0)
//
// Cash is drawn last so it acts as a buffer: it is only touched once the
// portfolio is empty. That holds in working years too, so a dated expense
// before retirement is paid from the portfolio and the cash is left alone.
//
// Every value in row k shares one inflation index, (1+i)^k, so converting any
// of them to today's dollars divides by that single number.

import type { SalaryGrowth } from "../plan/types";
import type { Explained, ExplanationLine } from "./explained";

/** A dated expense as the projection needs it: today's dollars per year, over calendar years. */
export interface ProjectionDatedExpense {
  /** Dollars per year in today's dollars; grown by inflation like living expenses. */
  readonly annual: number;
  /** First calendar year it applies. */
  readonly fromYear: number;
  /** Last calendar year it applies (inclusive). */
  readonly toYear: number;
}

/** A person's salary as the projection needs it (IN-7). */
export interface ProjectionSalary {
  /** Gross dollars per year today. */
  readonly annual: number;
  /** How it grows each year. */
  readonly growth: SalaryGrowth;
}

/** Plain numbers the projection needs, all resolved (see ResolvedProjectionInputs). */
export interface ProjectionInputs {
  readonly currentAge: number;
  /** The projection runs to this age, inclusive. */
  readonly endAge: number;
  /** The last working age: contributions default to stopping here, and spending starts the year after. */
  readonly retirementAge: number;
  /** Nominal portfolio return as a fraction, e.g. 0.07. */
  readonly expectedReturn: number;
  /** Interest rate paid on cash as a fraction, e.g. 0.04. */
  readonly interestRate: number;
  /** Inflation as a fraction, e.g. 0.025. */
  readonly inflationRate: number;
  /** Dollars added each year, the same amount every year. */
  readonly annualContribution: number;
  /** The last age in which a contribution is made. */
  readonly contributionsStopAge: number;
  /** Total of the portfolios today. */
  readonly portfolioOpening: number;
  /** Cash savings today. */
  readonly cashOpening: number;
  /** Living expenses per year in today's dollars (shown for reference; not drawn before retirement). */
  readonly livingAnnual: number;
  /** Spending drawn each retired year, in today's dollars. */
  readonly retirementSpendingAnnual: number;
  /** Dated and one-off expenses, drawn from savings in any year they apply. */
  readonly datedExpenses: readonly ProjectionDatedExpense[];
  /** M1's FI number in today's dollars. */
  readonly fiNumberToday: number;
  /** Gross salary (IN-7). Absent means no salary. It affects only each row's `salary` for now. */
  readonly salary?: ProjectionSalary;
}

/** Whether a year is before or after the target retirement age. */
export type ProjectionPhase = "working" | "retired";

/** One year of the projection. All dollar values are nominal. */
export interface ProjectionRow {
  /** 0 for today, then 1, 2, ... */
  readonly yearIndex: number;
  readonly calendarYear: number;
  readonly age: number;
  /** "retired" when age is above the target retirement age. */
  readonly phase: ProjectionPhase;
  /** (1+i)^yearIndex; a value in today's dollars is the nominal value ÷ this. */
  readonly inflationIndex: number;
  readonly cashOpening: number;
  readonly cashInterest: number;
  readonly cashClosing: number;
  readonly portfolioOpening: number;
  readonly portfolioGrowth: number;
  readonly contribution: number;
  readonly portfolioClosing: number;
  /** Spending to fund this year: retirement spending plus dated expenses. */
  readonly spending: number;
  /** The part of spending paid from the portfolio, which is drawn first. */
  readonly fromPortfolio: number;
  /** The part of spending paid from cash, once the portfolio is empty. */
  readonly fromCash: number;
  /** The part of spending that couldn't be funded; 0 in a funded year. */
  readonly shortfall: number;
  /** Cash plus portfolio at the end of the year. */
  readonly investableClosing: number;
  readonly livingExpenses: number;
  readonly fiNumber: number;
  /** Gross salary this year (nominal); 0 once retired or when there is none. Sets employer super from M5 step 5. */
  readonly salary: number;
}

/** The year investable net worth first reaches the FI number, with the working behind it. */
export interface FiMilestone {
  readonly yearIndex: number;
  readonly calendarYear: number;
  readonly age: number;
  /** The investable net worth against the FI number in that year. */
  readonly explanation: Explained;
}

/**
 * Projects cash and the portfolio year by year from today to the end age.
 *
 * Called by `summarisePlan` (src/engine/fiNumber.ts); the Results screen
 * shows its rows (chart and Year by year table), and `assessSolvency` reads the shortfalls.
 * Row 0 is today (no flows). Each later row follows the timing rules in the
 * diagram at the top of this file. If the end age is not after the current
 * age, only row 0 is returned.
 */
export function projectPortfolio(inputs: ProjectionInputs, startYear: number): ProjectionRow[] {
  const rows: ProjectionRow[] = [
    {
      yearIndex: 0,
      calendarYear: startYear,
      age: inputs.currentAge,
      phase: phaseAtAge(inputs.currentAge, inputs.retirementAge),
      inflationIndex: 1,
      cashOpening: inputs.cashOpening,
      cashInterest: 0,
      cashClosing: inputs.cashOpening,
      portfolioOpening: inputs.portfolioOpening,
      portfolioGrowth: 0,
      contribution: 0,
      portfolioClosing: inputs.portfolioOpening,
      spending: 0,
      fromCash: 0,
      fromPortfolio: 0,
      shortfall: 0,
      investableClosing: inputs.cashOpening + inputs.portfolioOpening,
      livingExpenses: inputs.livingAnnual,
      fiNumber: inputs.fiNumberToday,
      salary: salaryInYear(inputs, 0),
    },
  ];

  let cash = inputs.cashOpening;
  let portfolio = inputs.portfolioOpening;

  for (let yearIndex = 1; inputs.currentAge + yearIndex <= inputs.endAge; yearIndex++) {
    const age = inputs.currentAge + yearIndex;
    const calendarYear = startYear + yearIndex;
    const inflationIndex = Math.pow(1 + inputs.inflationRate, yearIndex);
    const phase = phaseAtAge(age, inputs.retirementAge);

    // Interest and growth are earned on the opening balances.
    const cashOpening = cash;
    const cashInterest = cashOpening * inputs.interestRate;
    const portfolioOpening = portfolio;
    const portfolioGrowth = portfolioOpening * inputs.expectedReturn;

    // The year you turn the stop age is the last one with a contribution.
    const contribution = age <= inputs.contributionsStopAge ? inputs.annualContribution : 0;

    const cashAvailable = cashOpening + cashInterest;
    const portfolioAvailable = portfolioOpening + portfolioGrowth + contribution;

    // Retirement spending only starts in the first retired year, but dated
    // expenses apply in any year, including while working.
    const retirementSpending =
      phase === "retired" ? inputs.retirementSpendingAnnual * inflationIndex : 0;
    const datedSpending =
      sumDatedExpensesInYear(inputs.datedExpenses, calendarYear) * inflationIndex;
    const spending = retirementSpending + datedSpending;

    // The portfolio is drawn first and cash last, so cash stays as a buffer
    // until the portfolio is empty; whatever is left over is the shortfall.
    const fromPortfolio = Math.min(spending, portfolioAvailable);
    const fromCash = Math.min(spending - fromPortfolio, cashAvailable);
    const shortfall = spending - fromPortfolio - fromCash;

    cash = cashAvailable - fromCash;
    portfolio = portfolioAvailable - fromPortfolio;

    rows.push({
      yearIndex,
      calendarYear,
      age,
      phase,
      inflationIndex,
      cashOpening,
      cashInterest,
      cashClosing: cash,
      portfolioOpening,
      portfolioGrowth,
      contribution,
      portfolioClosing: portfolio,
      spending,
      fromCash,
      fromPortfolio,
      shortfall,
      investableClosing: cash + portfolio,
      livingExpenses: inputs.livingAnnual * inflationIndex,
      fiNumber: inputs.fiNumberToday * inflationIndex,
      salary: salaryInYear(inputs, yearIndex),
    });
  }

  return rows;
}

/**
 * The yearly growth rate of a salary (IN-7): inflation plus the margin,
 * a fixed rate, or zero. Called by `salaryInYear`.
 */
export function salaryGrowthRate(growth: SalaryGrowth, inflationRate: number): number {
  switch (growth.kind) {
    case "inflationPlus":
      return inflationRate + growth.margin;
    case "fixed":
      return growth.rate;
    case "none":
      return 0;
  }
}

/**
 * Gross salary in row `yearIndex`: today's salary grown `yearIndex` times
 * (like living expenses, one index per row, so row 1 already has a year's
 * growth), while working (age at or below the retirement age), then 0.
 * Called by `projectPortfolio` for every row.
 */
function salaryInYear(inputs: ProjectionInputs, yearIndex: number): number {
  const age = inputs.currentAge + yearIndex;

  if (inputs.salary === undefined || age > inputs.retirementAge) {
    return 0;
  }

  const growthRate = salaryGrowthRate(inputs.salary.growth, inputs.inflationRate);

  return inputs.salary.annual * Math.pow(1 + growthRate, yearIndex);
}

/** Retired years are those after the target retirement age (the retirement-age year is the last working one). */
function phaseAtAge(age: number, retirementAge: number): ProjectionPhase {
  return age > retirementAge ? "retired" : "working";
}

/**
 * Adds up, in today's dollars, the dated expenses that apply in a calendar
 * year (From and To are both inclusive). Called by `projectPortfolio` once
 * per row, before inflation is applied.
 */
function sumDatedExpensesInYear(
  expenses: readonly ProjectionDatedExpense[],
  calendarYear: number,
): number {
  return expenses
    .filter((expense) => expense.fromYear <= calendarYear && calendarYear <= expense.toYear)
    .reduce((total, expense) => total + expense.annual, 0);
}

/**
 * Finds the first row whose investable net worth (cash + portfolio) is at
 * least that row's FI number (for row 0 that is today's total).
 *
 * Returns `undefined` if no row reaches it by the end of the projection. Called
 * by `summarisePlan` to fill `fiReached`, which the Results screen shows.
 */
export function findFiReached(rows: readonly ProjectionRow[]): FiMilestone | undefined {
  const row = rows.find((candidate) => candidate.investableClosing >= candidate.fiNumber);

  if (row === undefined) {
    return undefined;
  }

  const lines: ExplanationLine[] = [
    {
      label: `Balance at end of ${row.calendarYear} (age ${row.age})`,
      value: row.investableClosing,
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
      value: row.investableClosing - row.fiNumber,
      unit: "dollars",
      operator: "=",
      source: "calculated",
    },
  ];

  return {
    yearIndex: row.yearIndex,
    calendarYear: row.calendarYear,
    age: row.age,
    explanation: { value: row.investableClosing, unit: "dollars", lines },
  };
}
