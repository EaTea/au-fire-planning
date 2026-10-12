// Test helpers for building `ProjectionInputs` for a household of one person.
//
// The engine takes a list of people (M7), but most tests are about a single
// person. `onePersonInputs` lets a test describe that person and the household
// money in one flat object, the way the engine's inputs looked before the
// household existed, and turns it into the real `ProjectionInputs`. That keeps
// the single-person tests readable, and their expected values untouched.
//
//   OnePersonSettings (flat, one person)
//        │  onePersonInputs(settings, startYear)
//        ▼
//   ProjectionInputs { people: [ one ProjectionPerson ], contributionsStop, ... }
//
// Only tests import this file.

import type {
  ContributionsStop,
  ProjectionDatedExpense,
  ProjectionInputs,
  ProjectionPerson,
  ProjectionSalary,
  ProjectionSuper,
} from "../projection";

/** The id the single test person gets; the portfolio's `whileWorking` rule points at it. */
export const ONE_PERSON_ID = "person-1";

/** The start year the stop age is turned into a `throughYear` rule with, unless a test says otherwise. */
const DEFAULT_START_YEAR = 2026;

/** One person and the household money in a flat shape, for tests. */
export interface OnePersonSettings {
  readonly currentAge: number;
  /** The projection runs to this age, inclusive. */
  readonly endAge: number;
  readonly retirementAge: number;
  readonly expectedReturn: number;
  readonly interestRate: number;
  readonly inflationRate: number;
  readonly annualContribution: number;
  /**
   * The last age in which a portfolio contribution is made. It becomes a
   * `throughYear` rule. Leave it out for the `whileWorking` rule (contributions
   * stop at retirement, which is what an unset stop age means in the app).
   */
  readonly contributionsStopAge?: number;
  readonly portfolioOpening: number;
  readonly cashOpening: number;
  readonly livingAnnual: number;
  readonly retirementSpendingAnnual: number;
  readonly datedExpenses: readonly ProjectionDatedExpense[];
  readonly fiNumberToday: number;
  readonly salary?: ProjectionSalary;
  readonly superAccount?: ProjectionSuper;
}

/**
 * Builds the engine's inputs for a household of one person from flat
 * settings. `startYear` must be the year the test passes to
 * `projectPortfolio`, because a stop age is turned into a calendar year with
 * it (the age rule "stop after age N" is the year `startYear + N − currentAge`).
 */
export function onePersonInputs(
  settings: OnePersonSettings,
  startYear: number = DEFAULT_START_YEAR,
): ProjectionInputs {
  const person: ProjectionPerson = {
    id: ONE_PERSON_ID,
    label: "Person 1",
    currentAge: settings.currentAge,
    retirementAge: settings.retirementAge,
    ...(settings.salary === undefined ? {} : { salary: settings.salary }),
    ...(settings.superAccount === undefined ? {} : { superAccount: settings.superAccount }),
  };

  const contributionsStop: ContributionsStop =
    settings.contributionsStopAge === undefined
      ? { kind: "whileWorking", personIds: [ONE_PERSON_ID] }
      : {
          kind: "throughYear",
          year: startYear + (settings.contributionsStopAge - settings.currentAge),
        };

  return {
    people: [person],
    endAge: settings.endAge,
    expectedReturn: settings.expectedReturn,
    interestRate: settings.interestRate,
    inflationRate: settings.inflationRate,
    annualContribution: settings.annualContribution,
    contributionsStop,
    portfolioOpening: settings.portfolioOpening,
    cashOpening: settings.cashOpening,
    livingAnnual: settings.livingAnnual,
    retirementSpendingAnnual: settings.retirementSpendingAnnual,
    datedExpenses: settings.datedExpenses,
    fiNumberToday: settings.fiNumberToday,
  };
}

/**
 * The same inputs with changes to the first person (age, retirement age,
 * salary, super). Tests use it where they used to spread new values over the
 * flat inputs, for example `withFirstPerson(inputs, { retirementAge: 60 })`.
 */
export function withFirstPerson(
  inputs: ProjectionInputs,
  changes: Partial<ProjectionPerson>,
): ProjectionInputs {
  const [first, ...others] = inputs.people;

  return { ...inputs, people: [{ ...first, ...changes }, ...others] };
}
