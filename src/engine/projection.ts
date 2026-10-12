// The year-by-year projection of cash, the portfolio and every person's super,
// in nominal dollars. Pure, like the rest of the engine: no clock (the start
// year is passed in), no randomness.
//
// The household is a list of people (one person today; couples arrive in M7
// step 4). Each person has their own age, retirement age, salary and super
// account. The cash and the portfolio belong to the household.
//
// Row 0 is today. Row k is the end of the k-th year from now. Every person is
// k years older than they are today, and the rows run until the youngest
// person reaches the end age.
//
//   start of year k                                 end of year k
//   cash C0  ──► + interest  = C0 × g  ──────────► cash available
//   port P0  ──► + growth    = P0 × r
//            ──► + contribution (while the stop rule allows) ► portfolio available
//
//   spending to fund (nominal) =
//       retirement spending × index    (only once everyone has retired)
//     + dated expenses for this year × index
//
//   super, once for each person (M5), in this order:
//     employer      = rate × min(salary, maximum contribution base)   (before sacrifice)
//     sacrifice     = salary sacrifice, only while that person works and in its years
//     concessional  = employer + sacrifice;  tax = 15% of it
//     earnings      = super opening × return;  tax = earnings × earnings tax rate
//     super available = opening + earnings − earnings tax
//                     + concessional − contributions tax + non-concessional
//
//   take it from: 1. portfolio available
//                 2. super available, person by person, but only for people
//                    whose super is drawable (see isSuperDrawable); when
//                    several are, each pays in proportion to their
//                    available balance
//                 3. cash available (last, as a buffer)
//   anything left over = shortfall for this year (everything drawn ends at $0)
//
//   one row, as data:
//
//     ProjectionRow (household totals: the sums over `people`)
//       ├─ cash, portfolio, spending, shortfall ...  (household only)
//       └─ people[0] ─ PersonYear: age, phase, salary, super flows
//          people[1] ─ PersonYear: ...                (couples, later)
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

/** A list that always has at least one item, so `list[0]` is never undefined. */
export type NonEmptyList<Item> = readonly [Item, ...Item[]];

/**
 * Maps every item of a non-empty list, keeping the result non-empty. Used for
 * the per-person lists in the projection (and by the Coast FIRE code, which
 * rewrites every person's super) so that "the first person" is always there
 * to read without a check.
 */
export function mapNonEmpty<Item, Result>(
  items: NonEmptyList<Item>,
  transform: (item: Item, index: number) => Result,
): NonEmptyList<Result> {
  const [firstItem, ...otherItems] = items;

  return [
    transform(firstItem, 0),
    ...otherItems.map((item, otherIndex) => transform(item, otherIndex + 1)),
  ];
}

/** One person as the projection needs them: their ages, pay and super. */
export interface ProjectionPerson {
  /** Matches `Person.id` in the plan; the portfolio's contributions rule refers to people by it. */
  readonly id: string;
  /** Name shown in explanations, e.g. "Person 1". */
  readonly label: string;
  /** Age in whole years today. */
  readonly currentAge: number;
  /** The last working age: salary and employer super stop after it, and retirement spending can start the year after. */
  readonly retirementAge: number;
  /** Gross salary (IN-7). Absent means no salary. It sets employer super contributions. */
  readonly salary?: ProjectionSalary;
  /** The super account (IN-21 to IN-24). Absent means no super at all. */
  readonly superAccount?: ProjectionSuper;
}

/**
 * When the portfolio's contributions stop:
 * - `whileWorking`: in every year in which at least one of the listed people
 *   is still working (a person works up to and including their retirement
 *   age), so the rule follows the retirement ages, which the
 *   earliest-retirement search relies on;
 * - `throughYear`: in every calendar year up to and including `year`.
 */
export type ContributionsStop =
  | { readonly kind: "whileWorking"; readonly personIds: readonly string[] }
  | { readonly kind: "throughYear"; readonly year: number };

/** Plain numbers the projection needs, all resolved (see ResolvedProjectionInputs). */
export interface ProjectionInputs {
  /** The household. The projection runs until the youngest person reaches `endAge`. */
  readonly people: NonEmptyList<ProjectionPerson>;
  /** The age the youngest person has in the last row, inclusive. */
  readonly endAge: number;
  /** Nominal portfolio return as a fraction, e.g. 0.07. */
  readonly expectedReturn: number;
  /** Interest rate paid on cash as a fraction, e.g. 0.04. */
  readonly interestRate: number;
  /** Inflation as a fraction, e.g. 0.025. */
  readonly inflationRate: number;
  /** Dollars added each year, the same amount every year. */
  readonly annualContribution: number;
  /** When the portfolio's contributions stop. */
  readonly contributionsStop: ContributionsStop;
  /** Total of the portfolios today. */
  readonly portfolioOpening: number;
  /** Cash savings today. */
  readonly cashOpening: number;
  /** Living expenses per year in today's dollars (shown for reference; not drawn before retirement). */
  readonly livingAnnual: number;
  /** Spending drawn each retired year, in today's dollars. */
  readonly retirementSpendingAnnual: number;
  /**
   * Spending drawn from savings in each year in which some but not all of the
   * household have retired (EXP-2), in today's dollars. Absent means $0: the
   * partner still working is assumed to cover it, as in working years.
   */
  readonly interimSpendingAnnual?: number;
  /** Dated and one-off expenses, drawn from savings in any year they apply. */
  readonly datedExpenses: readonly ProjectionDatedExpense[];
  /** M1's FI number in today's dollars. */
  readonly fiNumberToday: number;
}

/** Whether one person is working or retired in a year. */
export type PersonPhase = "working" | "retired";

/**
 * Where the household is in a year:
 * - `working`: everyone is working;
 * - `oneRetired`: at least one person has retired, but not everyone;
 * - `retired`: everyone has retired.
 * With one person, `oneRetired` never occurs.
 */
export type ProjectionPhase = "working" | "oneRetired" | "retired";

/** One person's part of one year of the projection. Dollar values are nominal. */
export interface PersonYear {
  /** Matches `ProjectionPerson.id`. */
  readonly personId: string;
  /** The person's display name ("Alex", or "Person 1"), for explanation lines that quote their age. */
  readonly label: string;
  /** This person's age in the row. */
  readonly age: number;
  /** "retired" when `age` is above this person's retirement age. */
  readonly phase: PersonPhase;
  /** Gross salary this year; 0 once retired or when there is none. */
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
  /** The part of this year's spending paid from this person's super. */
  readonly fromSuper: number;
  readonly superClosing: number;
  /** Whether this person's super can be drawn this year (see `isSuperDrawable`); false when they have no super. */
  readonly superAccessible: boolean;
}

/**
 * One year of the projection. All dollar values are nominal. The salary and
 * super fields are the sums over `people`; each person's own figures are in
 * `people`.
 */
export interface ProjectionRow {
  /** 0 for today, then 1, 2, ... */
  readonly yearIndex: number;
  readonly calendarYear: number;
  /** Each person's age, phase, salary and super in this year, in the order of `ProjectionInputs.people`. */
  readonly people: NonEmptyList<PersonYear>;
  /** The household phase: "retired" when everyone is above their retirement age. */
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
  /** The part of spending paid from super, after the portfolio and before cash; 0 while no super is drawable. Sum over `people`. */
  readonly fromSuper: number;
  /** Whether anyone's super can be drawn this year (see `isSuperDrawable`); false when there is no super. */
  readonly superAccessible: boolean;
  /** Cash plus portfolio plus everyone's super at the end of the year. */
  readonly investableClosing: number;
  readonly livingExpenses: number;
  readonly fiNumber: number;
  /** Gross salary this year (nominal), summed over people; 0 once everyone has retired or when there is none. */
  readonly salary: number;
  /** Employer contributions this year, before contributions tax. Sum over `people`. */
  readonly employerContribution: number;
  /** Salary sacrifice this year, before contributions tax. Sum over `people`. */
  readonly salarySacrifice: number;
  /** Non-concessional contributions this year (not taxed on entry). Sum over `people`. */
  readonly nonConcessional: number;
  /** Tax on concessional contributions (employer + salary sacrifice). Sum over `people`. */
  readonly contributionsTax: number;
  readonly superOpening: number;
  /** Earnings on the opening balance, before earnings tax. Sum over `people`. */
  readonly superEarnings: number;
  readonly superEarningsTax: number;
  readonly superClosing: number;
}

/**
 * True when a year can't be fully funded while some super sits locked: there
 * is a shortfall, and somebody has a super balance that can't be drawn yet
 * (`superAccessible` is false for them) and could otherwise have helped.
 * Used by the Year by year status and by the "Money runs out" breakdown, so
 * both say the same thing about the same year; the age they quote is
 * `effectiveSuperAccessAge`.
 */
export function isShortfallWithSuperLocked(row: ProjectionRow): boolean {
  return (
    row.shortfall > 0 &&
    row.people.some((personYear) => !personYear.superAccessible && personYear.superClosing > 0)
  );
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
 * The condition of release (SUPER-1): whether a person's super can be drawn
 * at `age`.
 *
 *   drawable at age a  ⇔  a ≥ unconditional release age (65)
 *                       or (a ≥ access age  and  a ≥ preservation age (60)
 *                           and  a > retirement age)
 *
 * So the condition is met on retiring at or after the preservation age, or at
 * 65 regardless. Both ages come from `rules`, never from literals. Called by
 * `isSuperAccessibleInYear` for every person in every row.
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
 * The effective access age of one person: the first age at which their super
 * can be drawn while retired. It is the (clamped) access age when the person
 * retires before it, otherwise the year after retirement, capped at the
 * unconditional release age. It drives the bridge, the milestones and the
 * "super locked until" wording.
 *
 * Returns `undefined` when the person has no super account, since there are no
 * rules to read the ages from. The rules are the ones in effect in
 * `startYear`; the ages are not indexed, so this agrees with the per-row rules
 * `projectPortfolio` uses. Called by `summarisePlan`, the bridge check and
 * the retirement-age search, once per person.
 */
export function effectiveSuperAccessAge(
  person: ProjectionPerson,
  inputs: ProjectionInputs,
  startYear: number,
): number | undefined {
  const account = person.superAccount;
  if (account === undefined) return undefined;

  const rules = rulesForYear(account.ruleSet, startYear, inputs.inflationRate).superannuation;
  const accessAge = resolveSuperAccessAge(account.accessAge, rules);

  return person.retirementAge < accessAge
    ? accessAge
    : Math.min(person.retirementAge + 1, rules.unconditionalReleaseAgeYears);
}

/**
 * The same inputs with one person's retirement age changed. Used by the
 * earliest-retirement search to try each age for one person while everyone
 * else keeps their target. A portfolio stop rule of `whileWorking` follows the
 * new age by itself, because it reads the retirement ages. Called by
 * `findEarliestRetirementAge`.
 */
export function inputsWithRetirementAge(
  inputs: ProjectionInputs,
  personIndex: number,
  retirementAge: number,
): ProjectionInputs {
  return {
    ...inputs,
    people: mapNonEmpty(inputs.people, (person, index) =>
      index === personIndex ? { ...person, retirementAge } : person,
    ),
  };
}

/**
 * The person at a position in `inputs.people`. Throws a `RangeError` for a
 * position that isn't there: callers pass positions they got from the list
 * itself, so a bad one is a programming error, not bad user data. Called by
 * the earliest-retirement search.
 */
export function personAtIndex(inputs: ProjectionInputs, personIndex: number): ProjectionPerson {
  const person = inputs.people[personIndex];

  if (person === undefined) {
    throw new RangeError(
      `No person at position ${personIndex}; the household has ${inputs.people.length}`,
    );
  }

  return person;
}

/** The age of the youngest person today; the rows run until this person reaches the end age. */
function youngestCurrentAge(inputs: ProjectionInputs): number {
  return Math.min(...inputs.people.map((person) => person.currentAge));
}

/**
 * The age the youngest person has in row `yearIndex`. The end age is measured
 * on this person, so callers that want "a projection that stops at row n"
 * set `endAge` to this. Called by `projectPortfolio` (to know when to stop),
 * the earliest-retirement search and the Coast FIRE and coast split code.
 */
export function youngestAgeAtRow(inputs: ProjectionInputs, yearIndex: number): number {
  return youngestCurrentAge(inputs) + yearIndex;
}

/**
 * The last row in which everybody is still working: the row before anyone is
 * retired. The bridge starts after it. With one person this is the
 * retirement row, `retirementAge − currentAge`. Called by the bridge check
 * and the outside-super coast test.
 */
export function firstRetirementRowIndex(inputs: ProjectionInputs): number {
  return Math.min(...inputs.people.map((person) => person.retirementAge - person.currentAge));
}

/**
 * The last row in which anybody works: the row before everyone is retired.
 * The FI number "at retirement" and Coast FIRE's target refer to it. With one
 * person this is the retirement row, `retirementAge − currentAge`. Called by
 * the summary, Coast FIRE and the coast split.
 */
export function householdRetirementRowIndex(inputs: ProjectionInputs): number {
  return Math.max(...inputs.people.map((person) => person.retirementAge - person.currentAge));
}

/**
 * The last calendar year in which the portfolio receives a contribution,
 * whichever form the stop rule takes. Used by Coast FIRE to pull the stop
 * earlier ("stop contributing after row k") without losing the rule's own
 * limit. Called by `inputsWithVoluntaryContributionsStoppedAfter`.
 */
export function lastPortfolioContributionYear(inputs: ProjectionInputs, startYear: number): number {
  const stop = inputs.contributionsStop;

  if (stop.kind === "throughYear") return stop.year;

  const owners = inputs.people.filter((person) => stop.personIds.includes(person.id));
  const lastWorkingRows = owners.map((owner) => owner.retirementAge - owner.currentAge);

  // With no owners the portfolio is never contributed to: the last year is before the start.
  return startYear + Math.max(-1, ...lastWorkingRows);
}

/**
 * How a row's ages read in an explanation line. One person: "age 52". A
 * couple names both: "Alex 52 · Sam 50". Used inside parentheses and after
 * "at" by every engine line that quotes an age, so the wording is decided
 * once.
 */
export function describeAges(row: ProjectionRow): string {
  return formatAges(
    row.people.map((personYear) => ({ label: personYear.label, age: personYear.age })),
  );
}

/**
 * Words for one or more people's ages: "age 52" for one, "Alex 52 · Sam 50"
 * for several. Used by `describeAges` and by results that carry ages as data
 * (see `Solvency`).
 */
export function formatAges(
  ages: readonly { readonly label: string; readonly age: number }[],
): string {
  const [firstAge, ...otherAges] = ages;

  if (firstAge === undefined) return "";
  if (otherAges.length === 0) return `age ${firstAge.age}`;

  return ages.map(({ label, age }) => `${label} ${age}`).join(" · ");
}

/** The year investable net worth first reaches the FI number, with the working behind it. */
export interface FiMilestone {
  readonly yearIndex: number;
  readonly calendarYear: number;
  /** The first person's age in that year. */
  readonly age: number;
  /** The investable net worth against the FI number in that year. */
  readonly explanation: Explained;
}

/**
 * Projects cash, the portfolio and every person's super year by year from
 * today until the youngest person reaches the end age.
 *
 * Called by `summarisePlan` (src/engine/fiNumber.ts); the Results screen
 * shows its rows (chart and Year by year table), and `assessSolvency` reads the shortfalls.
 * Row 0 is today (no flows). Each later row follows the timing rules in the
 * diagram at the top of this file. If the end age is not after the youngest
 * person's current age, only row 0 is returned.
 */
export function projectPortfolio(inputs: ProjectionInputs, startYear: number): ProjectionRow[] {
  const openingPeople = mapNonEmpty(inputs.people, (person) =>
    personYearToday(person, inputs, startYear),
  );
  const superOpeningToday = sumOverPeople(openingPeople, (personYear) => personYear.superOpening);

  const rows: ProjectionRow[] = [
    {
      yearIndex: 0,
      calendarYear: startYear,
      people: openingPeople,
      phase: householdPhase(inputs, 0),
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
      superAccessible: openingPeople.some((personYear) => personYear.superAccessible),
      investableClosing: inputs.cashOpening + inputs.portfolioOpening + superOpeningToday,
      livingExpenses: inputs.livingAnnual,
      fiNumber: inputs.fiNumberToday,
      salary: sumOverPeople(openingPeople, (personYear) => personYear.salary),
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

  // Each person with their super balance at the start of the next row; carried
  // together so the loop never has to look a person up by position.
  let runningPeople: NonEmptyList<RunningPerson> = mapNonEmpty(inputs.people, (person) => ({
    person,
    superBalance: person.superAccount?.opening ?? 0,
  }));

  for (let yearIndex = 1; youngestAgeAtRow(inputs, yearIndex) <= inputs.endAge; yearIndex++) {
    const calendarYear = startYear + yearIndex;
    const inflationIndex = Math.pow(1 + inputs.inflationRate, yearIndex);
    const phase = householdPhase(inputs, yearIndex);

    // Interest and growth are earned on the opening balances.
    const cashOpening = cash;
    const cashInterest = cashOpening * inputs.interestRate;
    const portfolioOpening = portfolio;
    const portfolioGrowth = portfolioOpening * inputs.expectedReturn;

    const contribution = isPortfolioContributionYear(inputs, yearIndex, calendarYear)
      ? inputs.annualContribution
      : 0;

    // Each person's super grows and receives contributions on its own; the
    // drawing for the year is worked out afterwards, across all of them.
    const candidates = mapNonEmpty(runningPeople, ({ person, superBalance }) => {
      const superYear = projectSuperYear(person, inputs, yearIndex, calendarYear, superBalance);

      return {
        person,
        superYear,
        available: superYear.available,
        accessible: isSuperAccessibleInYear(person, inputs, yearIndex, calendarYear),
      };
    });

    const cashAvailable = cashOpening + cashInterest;
    const portfolioAvailable = portfolioOpening + portfolioGrowth + contribution;

    // Retirement spending only starts in the first year everyone is retired;
    // in the years between, the interim amount is drawn instead (default $0).
    // Dated expenses apply in any year, including while working.
    const retirementSpending = phaseSpendingToday(inputs, phase) * inflationIndex;
    const datedSpending =
      sumDatedExpensesInYear(inputs.datedExpenses, calendarYear) * inflationIndex;
    const spending = retirementSpending + datedSpending;

    // The portfolio is drawn first, then super but only the super that is
    // drawable (the condition of release), and cash last, so cash stays as a
    // buffer until everything else is spent; whatever is left over is the
    // shortfall.
    const fromPortfolio = Math.min(spending, portfolioAvailable);
    const drawings = drawSuperProRata(spending - fromPortfolio, candidates);
    const fromSuper = drawings.reduce((total, drawing) => total + drawing.drawn, 0);
    const fromCash = Math.min(spending - fromPortfolio - fromSuper, cashAvailable);
    const shortfall = spending - fromPortfolio - fromSuper - fromCash;

    cash = cashAvailable - fromCash;
    portfolio = portfolioAvailable - fromPortfolio;

    const people = mapNonEmpty(
      drawings,
      ({ person, superYear, accessible, drawn }): PersonYear => ({
        personId: person.id,
        label: person.label,
        age: person.currentAge + yearIndex,
        phase: personPhase(person, yearIndex),
        salary: salaryInYear(person, inputs, yearIndex),
        employerContribution: superYear.employer,
        salarySacrifice: superYear.salarySacrifice,
        nonConcessional: superYear.nonConcessional,
        contributionsTax: superYear.contributionsTax,
        superOpening: superYear.opening,
        superEarnings: superYear.earnings,
        superEarningsTax: superYear.earningsTax,
        fromSuper: drawn,
        superClosing: superYear.available - drawn,
        superAccessible: accessible,
      }),
    );
    const superBalance = sumOverPeople(people, (personYear) => personYear.superClosing);

    rows.push({
      yearIndex,
      calendarYear,
      people,
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
      superAccessible: people.some((personYear) => personYear.superAccessible),
      investableClosing: cash + portfolio + superBalance,
      livingExpenses: inputs.livingAnnual * inflationIndex,
      fiNumber: inputs.fiNumberToday * inflationIndex,
      salary: sumOverPeople(people, (personYear) => personYear.salary),
      employerContribution: sumOverPeople(people, (personYear) => personYear.employerContribution),
      salarySacrifice: sumOverPeople(people, (personYear) => personYear.salarySacrifice),
      nonConcessional: sumOverPeople(people, (personYear) => personYear.nonConcessional),
      contributionsTax: sumOverPeople(people, (personYear) => personYear.contributionsTax),
      superOpening: sumOverPeople(people, (personYear) => personYear.superOpening),
      superEarnings: sumOverPeople(people, (personYear) => personYear.superEarnings),
      superEarningsTax: sumOverPeople(people, (personYear) => personYear.superEarningsTax),
      superClosing: superBalance,
    });

    runningPeople = mapNonEmpty(drawings, ({ person, superYear, drawn }) => ({
      person,
      superBalance: superYear.available - drawn,
    }));
  }

  return rows;
}

/**
 * One person's part of row 0: today's age, salary and opening super, with
 * no flows yet. Called by `projectPortfolio` to build row 0.
 */
function personYearToday(
  person: ProjectionPerson,
  inputs: ProjectionInputs,
  startYear: number,
): PersonYear {
  const superToday = person.superAccount?.opening ?? 0;

  return {
    personId: person.id,
    label: person.label,
    age: person.currentAge,
    phase: personPhase(person, 0),
    salary: salaryInYear(person, inputs, 0),
    employerContribution: 0,
    salarySacrifice: 0,
    nonConcessional: 0,
    contributionsTax: 0,
    superOpening: superToday,
    superEarnings: 0,
    superEarningsTax: 0,
    fromSuper: 0,
    superClosing: superToday,
    superAccessible: isSuperAccessibleInYear(person, inputs, 0, startYear),
  };
}

/**
 * The spending drawn from savings in a household phase, apart from dated
 * expenses, in today's dollars: retirement spending once everyone has
 * retired, the interim amount while only some have, nothing while everyone
 * works. Called by `projectPortfolio` for every row.
 */
function phaseSpendingToday(inputs: ProjectionInputs, phase: ProjectionPhase): number {
  switch (phase) {
    case "retired":
      return inputs.retirementSpendingAnnual;
    case "oneRetired":
      return inputs.interimSpendingAnnual ?? 0;
    case "working":
      return 0;
  }
}

/**
 * Adds one number from each person's year. Starting from 0 and adding in
 * order means a one-person household gets exactly that person's figure back,
 * with no rounding difference. Called by `projectPortfolio` to turn the
 * per-person figures into the row's household totals.
 */
function sumOverPeople(
  people: NonEmptyList<PersonYear>,
  pick: (personYear: PersonYear) => number,
): number {
  return people.reduce((total, personYear) => total + pick(personYear), 0);
}

/** One person at the start of a row: who they are and what their super holds. */
interface RunningPerson {
  readonly person: ProjectionPerson;
  readonly superBalance: number;
}

/**
 * Splits the amount still to fund between the people whose super can be
 * drawn, in proportion to each one's available balance (M7 decision 2).
 * The total drawn is the smaller of the amount needed and what the accessible
 * people hold; people whose super is locked pay nothing. With one accessible
 * person that person pays the whole draw. Each item comes back with the
 * amount it `drawn`. Called by `projectPortfolio` after the portfolio has been
 * drawn.
 *
 * Adding rounded shares can land a hair away from the total, which would
 * show up as a false shortfall (or a slightly negative balance), so:
 *
 *   draw everything  ─► each person draws their whole balance, so the
 *                       shares add up to the total exactly
 *   draw part of it  ─► each person draws their proportion, except the
 *                       payer with the SMALLEST balance, who draws the
 *                       exact remainder (amount − everyone else's shares)
 *
 * Why the smallest: their proportion is at most half the amount, so the
 * others' shares add up to at least half of it, and subtracting two numbers
 * within a factor of two of each other is exact in floating point (Sterbenz's
 * lemma). The remainder then makes the shares add back to the amount
 * exactly. That holds whichever order two shares are added in. A household has
 * at most two people; with more, the total is right to within a rounding
 * error. If rounding pushes the remainder over that payer's balance, the
 * overshoot moves to the first payer with room.
 *
 * Every share stays within that person's own balance.
 */
export function drawSuperProRata<Candidate extends { available: number; accessible: boolean }>(
  amountNeeded: number,
  candidates: NonEmptyList<Candidate>,
): NonEmptyList<Candidate & { readonly drawn: number }> {
  const drawables = candidates.map((candidate) => (candidate.accessible ? candidate.available : 0));
  const totalDrawable = drawables.reduce((total, drawable) => total + drawable, 0);

  // Nothing to draw from, or nothing needed.
  if (totalDrawable <= 0 || amountNeeded <= 0) {
    return mapNonEmpty(candidates, (candidate) => ({ ...candidate, drawn: 0 }));
  }

  // Drawing everything: each person's whole balance, with no division to round.
  if (amountNeeded >= totalDrawable) {
    return mapNonEmpty(candidates, (candidate, personIndex) => ({
      ...candidate,
      drawn: drawables[personIndex] ?? 0,
    }));
  }

  // The remainder payer: the accessible person with the smallest balance
  // (the later one on a tie). See the doc comment for why.
  const remainderPayerIndex = drawables.reduce(
    (chosenIndex, drawable, personIndex) =>
      drawable > 0 && (chosenIndex < 0 || drawable <= (drawables[chosenIndex] ?? 0))
        ? personIndex
        : chosenIndex,
    -1,
  );

  // First pass: proportions, with the remainder payer taking the exact remainder.
  const shares = drawables.map((drawable) => amountNeeded * (drawable / totalDrawable));
  const othersTotal = shares.reduce(
    (total, share, personIndex) => (personIndex === remainderPayerIndex ? total : total + share),
    0,
  );
  shares[remainderPayerIndex] = amountNeeded - othersTotal;

  // Second pass: a remainder that overshoots its balance by a rounding error
  // moves to the first payer with room (someone has room, since not
  // everything is being drawn).
  const remainderPayerDrawable = drawables[remainderPayerIndex] ?? 0;
  const overshoot = (shares[remainderPayerIndex] ?? 0) - remainderPayerDrawable;
  if (overshoot > 0) {
    shares[remainderPayerIndex] = remainderPayerDrawable;
    const roomIndex = shares.findIndex(
      (share, personIndex) => (drawables[personIndex] ?? 0) - share >= overshoot,
    );
    if (roomIndex >= 0) shares[roomIndex] = (shares[roomIndex] ?? 0) + overshoot;
  }

  return mapNonEmpty(candidates, (candidate, personIndex) => ({
    ...candidate,
    drawn: Math.min(Math.max(shares[personIndex] ?? 0, 0), drawables[personIndex] ?? 0),
  }));
}

/**
 * Whether a person's super can be drawn in row `yearIndex` (calendar year
 * `calendarYear`), using that year's rules. False when they have no super
 * account. Called by `projectPortfolio` for each person in each row.
 */
function isSuperAccessibleInYear(
  person: ProjectionPerson,
  inputs: ProjectionInputs,
  yearIndex: number,
  calendarYear: number,
): boolean {
  const account = person.superAccount;
  if (account === undefined) return false;

  const rules = rulesForYear(account.ruleSet, calendarYear, inputs.inflationRate).superannuation;

  return isSuperDrawable(
    person.currentAge + yearIndex,
    person.retirementAge,
    account.accessAge,
    rules,
  );
}

/**
 * Whether the portfolio receives its contribution in a row, by the stop rule:
 * while any listed person works, or up to a calendar year. The year someone
 * turns their retirement age is the last one with a contribution. Called by
 * `projectPortfolio` for every row after row 0.
 */
function isPortfolioContributionYear(
  inputs: ProjectionInputs,
  yearIndex: number,
  calendarYear: number,
): boolean {
  const stop = inputs.contributionsStop;

  if (stop.kind === "throughYear") return calendarYear <= stop.year;

  return inputs.people.some(
    (person) => stop.personIds.includes(person.id) && personPhase(person, yearIndex) === "working",
  );
}

/** One year of one person's super before any drawing, as worked out by `projectSuperYear`. */
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
 * One person's super for one row, in the order the plan sets out (M5 "Super
 * each year"): employer contributions on salary before sacrifice and capped
 * at the maximum contribution base, then salary sacrifice (only while
 * working), non-concessional contributions (their years, working or not),
 * contributions tax, then earnings on the opening balance and earnings tax.
 * The rates and the base come from `rulesForYear`, so no statutory figure
 * lives here. Called by `projectPortfolio` for every person in every row
 * after row 0; the drawing happens there, on the `available` it returns.
 */
function projectSuperYear(
  person: ProjectionPerson,
  inputs: ProjectionInputs,
  yearIndex: number,
  calendarYear: number,
  opening: number,
): SuperYear {
  const account = person.superAccount;

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

  const isWorking = personPhase(person, yearIndex) === "working";
  const rules = rulesForYear(account.ruleSet, calendarYear, inputs.inflationRate).superannuation;

  const salary = salaryInYear(person, inputs, yearIndex);
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
 * One person's gross salary in row `yearIndex`: today's salary grown
 * `yearIndex` times (like living expenses, one index per row, so row 1
 * already has a year's growth), while they are working (age at or below
 * their retirement age), then 0. Called by `projectPortfolio` and
 * `projectSuperYear` for every person in every row.
 */
function salaryInYear(
  person: ProjectionPerson,
  inputs: ProjectionInputs,
  yearIndex: number,
): number {
  if (person.salary === undefined || personPhase(person, yearIndex) === "retired") {
    return 0;
  }

  const growthRate = salaryGrowthRate(person.salary.growth, inputs.inflationRate);

  return person.salary.annual * Math.pow(1 + growthRate, yearIndex);
}

/**
 * Whether one person is working or retired in row `yearIndex`. Retired years
 * are those after the person's retirement age (the retirement-age year is
 * the last working one). Called wherever the projection needs a person's
 * phase.
 */
function personPhase(person: ProjectionPerson, yearIndex: number): PersonPhase {
  return person.currentAge + yearIndex > person.retirementAge ? "retired" : "working";
}

/**
 * The household phase of row `yearIndex`: working while everyone works,
 * retired once everyone has retired, and oneRetired in between. Called by
 * `projectPortfolio` to decide when retirement spending starts.
 */
function householdPhase(inputs: ProjectionInputs, yearIndex: number): ProjectionPhase {
  const retiredCount = inputs.people.filter(
    (person) => personPhase(person, yearIndex) === "retired",
  ).length;

  if (retiredCount === 0) return "working";
  if (retiredCount === inputs.people.length) return "retired";

  return "oneRetired";
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
 * by `summarisePlan` to fill `fiReached`, which the Results screen shows. The
 * age reported is the first person's.
 */
export function findFiReached(rows: readonly ProjectionRow[]): FiMilestone | undefined {
  const row = rows.find((candidate) => candidate.investableClosing >= candidate.fiNumber);

  if (row === undefined) {
    return undefined;
  }

  const firstPersonAge = row.people[0].age;

  const lines: ExplanationLine[] = [
    {
      label: `Balance at end of ${row.calendarYear} (${describeAges(row)})`,
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
    age: firstPersonAge,
    explanation: { value: row.investableClosing, unit: "dollars", lines },
  };
}
