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
//   super (M5), in this order:
//     employer      = rate × min(salary, maximum contribution base)   (before sacrifice)
//     sacrifice     = salary sacrifice, only while working and in its years
//     concessional  = employer + sacrifice;  tax = 15% of it
//     earnings      = super opening × return;  tax = earnings × earnings tax rate
//     super available = opening + earnings − earnings tax
//                     + concessional − contributions tax + non-concessional
//
//   take it from: 1. portfolio available
//                 2. super available, only once it is drawable (see isSuperDrawable)
//                 3. cash available (last, as a buffer)
//   anything left over = shortfall for this year (everything drawn ends at $0)
//
// Cash is drawn last so it acts as a buffer: it is only touched once the
// portfolio is empty. That holds in working years too, so a dated expense
// before retirement is paid from the portfolio and the cash is left alone.
//
// Every value in row k shares one inflation index, (1+i)^k, so converting any
// of them to today's dollars divides by that single number.

import type { SalaryGrowth } from "../plan/types";
import { rulesForYear, type RuleSet, type SuperannuationRules } from "../rules/ruleSet";
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

/** A voluntary super contribution as the projection needs it (IN-23). */
export interface ProjectionSuperContribution {
  /** Dollars per year. */
  readonly annual: number;
  /** First calendar year it is paid; absent means from the first projected year. */
  readonly fromYear?: number;
  /** Last calendar year it is paid; absent means to the retirement year (so the retirement-age search can move it). */
  readonly toYear?: number;
}

/** A person's super account as the projection needs it (IN-21 to IN-24). */
export interface ProjectionSuper {
  /** Balance today. */
  readonly opening: number;
  /** Return net of fees, as a fraction. */
  readonly returnRate: number;
  /** The user's employer rate; absent means the legislated rate from each row's rules. */
  readonly employerRate?: number;
  /** The user's earnings tax rate; absent means the legislated rate from each row's rules. */
  readonly earningsTaxRate?: number;
  readonly salarySacrifice: ProjectionSuperContribution;
  readonly nonConcessional: ProjectionSuperContribution;
  /**
   * The age the person wants super accessible from (IN-5). Absent means the
   * unconditional release age (65). Whatever is given is clamped between the
   * preservation age and that age, using the rules (see `resolveSuperAccessAge`).
   */
  readonly accessAge?: number;
  /** The statutory rules, from which each row takes its rates and the contribution base. */
  readonly ruleSet: RuleSet;
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
  /** Gross salary (IN-7). Absent means no salary. It sets employer super contributions. */
  readonly salary?: ProjectionSalary;
  /** The super account (IN-21 to IN-24). Absent means no super at all. */
  readonly superAccount?: ProjectionSuper;
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
  /** The part of spending paid from cash, drawn last: once the portfolio (and accessible super) are empty. */
  readonly fromCash: number;
  /** The part of spending that couldn't be funded; 0 in a funded year. */
  readonly shortfall: number;
  /** The part of spending paid from super, after the portfolio and before cash; 0 while super isn't drawable. */
  readonly fromSuper: number;
  /** Whether super can be drawn this year, by the condition of release (see `isSuperDrawable`); false when there is no super. */
  readonly superAccessible: boolean;
  /** Cash plus portfolio plus super at the end of the year. */
  readonly investableClosing: number;
  readonly livingExpenses: number;
  readonly fiNumber: number;
  /** Gross salary this year (nominal); 0 once retired or when there is none. */
  readonly salary: number;
  /** Employer contributions this year, before contributions tax. */
  readonly employerContribution: number;
  /** Salary sacrifice this year, before contributions tax. */
  readonly salarySacrifice: number;
  /** Non-concessional contributions this year (not taxed on entry). */
  readonly nonConcessional: number;
  /** Tax on concessional contributions (employer + salary sacrifice). */
  readonly contributionsTax: number;
  readonly superOpening: number;
  /** Earnings on the opening balance, before earnings tax. */
  readonly superEarnings: number;
  readonly superEarningsTax: number;
  readonly superClosing: number;
}

/**
 * True when a year can't be fully funded while some super sits locked: super
 * can't be drawn this year (`superAccessible` is false) but has a balance
 * that could otherwise have helped. Used by the Year by year status and by
 * the "Money runs out" breakdown, so both say the same thing about the same
 * year; the age they quote is `effectiveSuperAccessAge`.
 */
export function isShortfallWithSuperLocked(row: ProjectionRow): boolean {
  return row.shortfall > 0 && !row.superAccessible && row.superClosing > 0;
}

/**
 * Clamps the access age a person asked for (IN-5) into the range the rules
 * allow: no lower than the preservation age, no higher than the unconditional
 * release age, and the release age when none was given. Called by
 * `isSuperDrawable` and `effectiveSuperAccessAge`.
 */
function resolveSuperAccessAge(
  requestedAge: number | undefined,
  rules: SuperannuationRules,
): number {
  const age = requestedAge ?? rules.unconditionalReleaseAgeYears;

  return Math.min(Math.max(age, rules.preservationAgeYears), rules.unconditionalReleaseAgeYears);
}

/**
 * The condition of release (SUPER-1): whether super can be drawn at `age`.
 *
 *   drawable at age a  ⇔  a ≥ unconditional release age (65)
 *                       or (a ≥ access age  and  a ≥ preservation age (60)
 *                           and  a > retirement age)
 *
 * So the condition is met on retiring at or after the preservation age, or at
 * 65 regardless. Both ages come from `rules`, never from literals. Called by
 * `projectPortfolio` for every row.
 */
function isSuperDrawable(
  age: number,
  retirementAge: number,
  requestedAccessAge: number | undefined,
  rules: SuperannuationRules,
): boolean {
  const accessAge = resolveSuperAccessAge(requestedAccessAge, rules);

  return (
    age >= rules.unconditionalReleaseAgeYears ||
    (age >= accessAge && age >= rules.preservationAgeYears && age > retirementAge)
  );
}

/**
 * The effective access age: the first age at which super can be drawn while
 * retired. It is the (clamped) access age when the person retires before it,
 * otherwise the year after retirement, capped at the unconditional release age.
 * It drives the bridge, the milestones and the "super locked until" wording.
 *
 * Returns `undefined` when the plan has no super account, since there are no
 * rules to read the ages from. The rules are the ones in effect in
 * `startYear`; the ages are not indexed, so this agrees with the per-row rules
 * `projectPortfolio` uses. Called by `summarisePlan` and the retirement-age search.
 */
export function effectiveSuperAccessAge(
  inputs: ProjectionInputs,
  startYear: number,
): number | undefined {
  const account = inputs.superAccount;
  if (account === undefined) return undefined;

  const rules = rulesForYear(account.ruleSet, startYear, inputs.inflationRate).superannuation;
  const accessAge = resolveSuperAccessAge(account.accessAge, rules);

  return inputs.retirementAge < accessAge
    ? accessAge
    : Math.min(inputs.retirementAge + 1, rules.unconditionalReleaseAgeYears);
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
 * Projects cash, the portfolio and super year by year from today to the end age.
 *
 * Called by `summarisePlan` (src/engine/fiNumber.ts); the Results screen
 * shows its rows (chart and Year by year table), and `assessSolvency` reads the shortfalls.
 * Row 0 is today (no flows). Each later row follows the timing rules in the
 * diagram at the top of this file. If the end age is not after the current
 * age, only row 0 is returned.
 */
export function projectPortfolio(inputs: ProjectionInputs, startYear: number): ProjectionRow[] {
  const superOpeningToday = inputs.superAccount?.opening ?? 0;

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
      fromSuper: 0,
      superAccessible: isSuperAccessibleInYear(inputs, inputs.currentAge, startYear),
      investableClosing: inputs.cashOpening + inputs.portfolioOpening + superOpeningToday,
      livingExpenses: inputs.livingAnnual,
      fiNumber: inputs.fiNumberToday,
      salary: salaryInYear(inputs, 0),
      employerContribution: 0,
      salarySacrifice: 0,
      nonConcessional: 0,
      contributionsTax: 0,
      superOpening: superOpeningToday,
      superEarnings: 0,
      superEarningsTax: 0,
      superClosing: superOpeningToday,
    },
  ];

  let cash = inputs.cashOpening;
  let portfolio = inputs.portfolioOpening;
  let superBalance = superOpeningToday;

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

    const superYear = projectSuperYear(inputs, yearIndex, calendarYear, superBalance);

    const cashAvailable = cashOpening + cashInterest;
    const portfolioAvailable = portfolioOpening + portfolioGrowth + contribution;

    // Retirement spending only starts in the first retired year, but dated
    // expenses apply in any year, including while working.
    const retirementSpending =
      phase === "retired" ? inputs.retirementSpendingAnnual * inflationIndex : 0;
    const datedSpending =
      sumDatedExpensesInYear(inputs.datedExpenses, calendarYear) * inflationIndex;
    const spending = retirementSpending + datedSpending;

    // The portfolio is drawn first, then super but only once it is drawable
    // (the condition of release), and cash last, so cash stays as a buffer until everything else is
    // spent; whatever is left over is the shortfall.
    const fromPortfolio = Math.min(spending, portfolioAvailable);
    const superIsAccessible = isSuperAccessibleInYear(inputs, age, calendarYear);
    const fromSuper = superIsAccessible
      ? Math.min(spending - fromPortfolio, superYear.available)
      : 0;
    const fromCash = Math.min(spending - fromPortfolio - fromSuper, cashAvailable);
    const shortfall = spending - fromPortfolio - fromSuper - fromCash;

    cash = cashAvailable - fromCash;
    portfolio = portfolioAvailable - fromPortfolio;
    superBalance = superYear.available - fromSuper;

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
      fromSuper,
      superAccessible: superIsAccessible,
      investableClosing: cash + portfolio + superBalance,
      livingExpenses: inputs.livingAnnual * inflationIndex,
      fiNumber: inputs.fiNumberToday * inflationIndex,
      salary: salaryInYear(inputs, yearIndex),
      employerContribution: superYear.employer,
      salarySacrifice: superYear.salarySacrifice,
      nonConcessional: superYear.nonConcessional,
      contributionsTax: superYear.contributionsTax,
      superOpening: superYear.opening,
      superEarnings: superYear.earnings,
      superEarningsTax: superYear.earningsTax,
      superClosing: superBalance,
    });
  }

  return rows;
}

/**
 * Whether the person's super can be drawn at `age` in `calendarYear`, using
 * that year's rules. False when there is no super account. Called by
 * `projectPortfolio` for each row.
 */
function isSuperAccessibleInYear(
  inputs: ProjectionInputs,
  age: number,
  calendarYear: number,
): boolean {
  const account = inputs.superAccount;
  if (account === undefined) return false;

  const rules = rulesForYear(account.ruleSet, calendarYear, inputs.inflationRate).superannuation;

  return isSuperDrawable(age, inputs.retirementAge, account.accessAge, rules);
}

/** One year of super before any drawing, as worked out by `projectSuperYear`. */
interface SuperYear {
  readonly opening: number;
  readonly employer: number;
  readonly salarySacrifice: number;
  readonly nonConcessional: number;
  readonly contributionsTax: number;
  readonly earnings: number;
  readonly earningsTax: number;
  /** Opening + earnings − earnings tax + concessional − contributions tax + non-concessional. */
  readonly available: number;
}

/**
 * Super for one row, in the order the plan sets out (M5 "Super each year"):
 * employer contributions on salary before sacrifice and capped at the
 * maximum contribution base, then salary sacrifice (only while working),
 * non-concessional contributions (their years, working or not), contributions
 * tax, then earnings on the opening balance and earnings tax. The rates and
 * the base come from `rulesForYear`, so no statutory figure lives here.
 * Called by `projectPortfolio` for every row after row 0; the drawing happens
 * there, on the `available` it returns.
 */
function projectSuperYear(
  inputs: ProjectionInputs,
  yearIndex: number,
  calendarYear: number,
  opening: number,
): SuperYear {
  const account = inputs.superAccount;

  if (account === undefined) {
    return {
      opening,
      employer: 0,
      salarySacrifice: 0,
      nonConcessional: 0,
      contributionsTax: 0,
      earnings: 0,
      earningsTax: 0,
      available: opening,
    };
  }

  const age = inputs.currentAge + yearIndex;
  const isWorking = age <= inputs.retirementAge;
  const rules = rulesForYear(account.ruleSet, calendarYear, inputs.inflationRate).superannuation;

  const salary = salaryInYear(inputs, yearIndex);
  const employerRate = account.employerRate ?? rules.guaranteeRate;
  const employer = employerRate * Math.min(salary, rules.maximumContributionBaseAnnualDollars);

  // Salary sacrifice comes out of salary, so it is paid only while working.
  const salarySacrifice =
    isWorking && isInContributionYears(account.salarySacrifice, calendarYear, isWorking)
      ? account.salarySacrifice.annual
      : 0;

  const nonConcessional = isInContributionYears(account.nonConcessional, calendarYear, isWorking)
    ? account.nonConcessional.annual
    : 0;

  const concessional = employer + salarySacrifice;
  const contributionsTax = concessional * rules.contributionsTaxRate;

  const earnings = opening * account.returnRate;
  const earningsTax = earnings * (account.earningsTaxRate ?? rules.earningsTaxRate);

  return {
    opening,
    employer,
    salarySacrifice,
    nonConcessional,
    contributionsTax,
    earnings,
    earningsTax,
    available: opening + earnings - earningsTax + concessional - contributionsTax + nonConcessional,
  };
}

/**
 * Whether a voluntary contribution is paid in a calendar year. A missing
 * start means "from the first projected year" and a missing end means "to the
 * retirement year" (`isWorking`), which is what lets the earliest-retirement
 * search move the end with the age it tries. Called by `projectSuperYear`.
 */
function isInContributionYears(
  contribution: ProjectionSuperContribution,
  calendarYear: number,
  isWorking: boolean,
): boolean {
  const afterStart = contribution.fromYear === undefined || calendarYear >= contribution.fromYear;
  const beforeEnd =
    contribution.toYear === undefined ? isWorking : calendarYear <= contribution.toYear;

  return afterStart && beforeEnd;
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
 * Finds the first row whose investable net worth (cash + portfolio + super) is at
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
