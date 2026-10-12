// M1's calculations: retirement spending, FI number and progress to FI, all in
// today's dollars. Everything here is pure (no clock, no randomness, no UI or
// storage imports), so the same plan always gives the same answer.
//
//   Plan ─► resolvePlanInputs ─► retirementSpendingAnnual ─► calculateFiNumber ─┐
//                              └─► investable (portfolios + cash) ──────────────┴─► calculateProgressToFi
//
// `summarisePlan` is the entry point the UI calls; the other functions are
// exported so they can be tested one at a time.

import {
  resolvePlanInputs,
  type MissingInput,
  type ResolvedPerson,
  type ResolvedPlanInputs,
  type ResolvedSuperContribution,
} from "../plan/resolvePlanInputs";
import { DEFAULT_SUPER_BALANCE } from "../plan/defaults";
import type { Plan, RetirementSpending, Sourced } from "../plan/types";
import type { RuleSet } from "../rules/ruleSet";
import type { Explained, ExplanationLine } from "./explained";
import {
  effectiveSuperAccessAge,
  findFiReached,
  householdRetirementRowIndex,
  projectPortfolio,
  type ContributionsStop,
  type FiMilestone,
  type ProjectionInputs,
  type ProjectionPerson,
  type ProjectionSuperContribution,
  type ProjectionRow,
} from "./projection";
import { calculateCoastFire, type CoastFire } from "./coastFire";
import { calculateCoastSplit, type CoastSplit } from "./coastSplit";
import { findEarliestRetirementAge, type EarliestRetirement } from "./earliestRetirement";
import { assessBridge, type BridgeAssessment } from "./bridge";
import { assessSolvency, type Solvency } from "./solvency";

/** One person's retirement figures in the summary. */
export interface PersonSummary {
  /** Matches `Person.id` in the plan. */
  readonly id: string;
  /** The plan's display label, e.g. "Person 1". */
  readonly label: string;
  /** The target retirement age. */
  readonly retirementAge: number;
  /** The calendar year the target retirement age is reached: start year + (retirement age − current age). */
  readonly retirementYear: number;
  /** The age this person's super can first be drawn while retired (see `effectiveSuperAccessAge`); absent when they have no super. */
  readonly superAccessAge?: number;
  /**
   * The first retirement age for this person, from today to their last age,
   * at which the money lasts (FIRE-3), with everyone else keeping their target.
   */
  readonly earliestRetirement: EarliestRetirement;
}

/**
 * The year-by-year part of the summary. It has its own "complete" level
 * because it also needs the two ages, which M1's figures don't.
 */
export type ProjectionSummary =
  | {
      readonly status: "complete";
      readonly rows: readonly ProjectionRow[];
      /** `undefined` if FI isn't reached by the end of the projection. */
      readonly fiReached?: FiMilestone;
      /** The FI number in nominal dollars at the target retirement age (FIRE-1). */
      readonly fiNumberAtRetirement: Explained;
      /** Each person's retirement, access age and earliest retirement, in the plan's order (always at least one). */
      readonly people: readonly [PersonSummary, ...PersonSummary[]];
      /**
       * The calendar year of the household retirement row: the last year anybody
       * works (see `householdRetirementRowIndex`). With one person it is their
       * retirement year.
       */
      readonly householdRetirementYear: number;
      /** The age the projection runs until, measured on the youngest person (IN-4), so screens needn't look it up. */
      readonly endAge: number;
      /** Whether the money lasts to the end age, or the first year it can't be funded. */
      readonly solvency: Solvency;
      /** The bridge to super and the years after access (FIRE-4). Both parts are absent when there is no super. */
      readonly bridge: BridgeAssessment;
      /** The Coast FIRE number, its path to retirement and when it is reached (COAST-1, COAST-2). */
      readonly coast: CoastFire & { readonly split: CoastSplit };
    }
  | { readonly status: "incomplete"; readonly missing: readonly MissingInput[] };

/** What `summarisePlan` returns: the figures, or what the user still has to enter. */
export type PlanSummary =
  | {
      readonly status: "complete";
      readonly fiNumber: Explained;
      readonly progressToFi: Explained;
      readonly investable: Explained;
      readonly retirementSpending: Explained;
      readonly safeWithdrawalRate: number;
      readonly projection: ProjectionSummary;
    }
  | { readonly status: "incomplete"; readonly missing: readonly MissingInput[] };

/**
 * Works out annual spending in retirement, in today's dollars.
 *
 * For a dollar amount it is that amount; for a percentage it is living
 * expenses × the fraction, with a line showing the multiplication. Called by
 * `summarisePlan`, and its result feeds `calculateFiNumber`.
 */
export function retirementSpendingAnnual(
  livingAnnual: Sourced<number>,
  retirementSpending: Sourced<RetirementSpending>,
): Explained {
  const spending = retirementSpending.value;

  if (spending.kind === "amount") {
    return {
      value: spending.annual,
      unit: "dollars",
      lines: [
        {
          label: "Retirement spending per year",
          value: spending.annual,
          unit: "dollars",
          source: retirementSpending.source,
        },
      ],
    };
  }

  const annual = livingAnnual.value * spending.fraction;

  return {
    value: annual,
    unit: "dollars",
    lines: [
      {
        label: "Living expenses per year",
        value: livingAnnual.value,
        unit: "dollars",
        source: livingAnnual.source,
      },
      {
        label: "Share of today's spending needed in retirement",
        value: spending.fraction,
        unit: "fraction",
        operator: "×",
        source: retirementSpending.source,
      },
      {
        label: "Retirement spending per year",
        value: annual,
        unit: "dollars",
        operator: "=",
        source: "calculated",
      },
    ],
  };
}

/**
 * FI number = retirement spending ÷ safe withdrawal rate.
 *
 * `rateSource` says whether the rate was typed in or is the default, so the
 * breakdown can say so. Throws a `RangeError` if the rate isn't greater than
 * 0 (the UI prevents entering one), because dividing by it would be meaningless.
 */
export function calculateFiNumber(
  retirementSpending: Explained,
  safeWithdrawalRate: number,
  rateSource: Sourced<number>["source"],
): Explained {
  if (!(safeWithdrawalRate > 0)) {
    throw new RangeError(`Safe withdrawal rate must be greater than 0, got ${safeWithdrawalRate}`);
  }

  const fiNumber = retirementSpending.value / safeWithdrawalRate;

  return {
    value: fiNumber,
    unit: "dollars",
    lines: [
      summaryLine("Retirement spending per year", retirementSpending),
      {
        label: "Safe withdrawal rate",
        value: safeWithdrawalRate,
        unit: "fraction",
        operator: "÷",
        source: rateSource,
      },
      {
        label: "FI number",
        value: fiNumber,
        unit: "dollars",
        operator: "=",
        source: "calculated",
      },
    ],
  };
}

/**
 * Progress to FI = investable amount ÷ FI number, as a fraction. The
 * breakdown lists the parts of the investable amount before dividing.
 *
 * Not capped at 100%, so 1.25 means 125%. Throws a `RangeError` if the FI
 * number isn't greater than 0 (e.g. spending of $0), since progress towards
 * nothing is undefined.
 */
export function calculateProgressToFi(investable: Explained, fiNumber: Explained): Explained {
  if (!(fiNumber.value > 0)) {
    throw new RangeError(
      `FI number must be greater than 0 to measure progress, got ${fiNumber.value}`,
    );
  }

  const progress = investable.value / fiNumber.value;

  // Show what investable is made of (each portfolio, cash, super, then the total) so a
  // jump in progress can be traced; a single-line investable stays one line.
  const investableLines =
    investable.lines.length > 1 ? investable.lines : [summaryLine("Investable amount", investable)];

  return {
    value: progress,
    unit: "fraction",
    lines: [
      ...investableLines,
      { ...summaryLine("FI number", fiNumber), operator: "÷" },
      {
        label: "Progress to FI",
        value: progress,
        unit: "fraction",
        operator: "=",
        source: "calculated",
      },
    ],
  };
}

/**
 * The entry point the UI calls: resolves the plan's inputs, then calculates
 * the FI number, the investable amount, progress to FI and the projection.
 *
 * `startYear` is the current calendar year, passed in so the engine never
 * reads the clock (the UI gets it from the app's clock). It labels row 0 of
 * the projection.
 *
 * `ruleSet` is the statutory rules data (NFR-3): `PlanProvider` passes the
 * bundled set, tests may pass their own. The engine never imports the data.
 *
 * On success it also returns the retirement spending and the resolved safe
 * withdrawal rate, so the UI can show them without digging into breakdown
 * lines.
 *
 * Returns `incomplete` (naming what is missing) rather than guessing when
 * required inputs are absent or retirement spending is not above $0. The investable amount is the sum of the
 * portfolios' values, cash savings and super.
 */
export function summarisePlan(plan: Plan, startYear: number, ruleSet: RuleSet): PlanSummary {
  const resolved = resolvePlanInputs(plan);

  if (resolved.status === "incomplete") {
    return { status: "incomplete", missing: resolved.missing };
  }

  const { inputs } = resolved;

  const spending = retirementSpendingAnnual(inputs.livingAnnual, inputs.retirementSpending);

  // Zero (or negative) spending would make the FI number 0 and progress undefined.
  // User data must never make the engine throw, so report it as something to fix.
  if (!(spending.value > 0)) {
    return {
      status: "incomplete",
      missing: [{ field: "retirementSpending", label: "Retirement spending must be more than $0" }],
    };
  }

  const fiNumber = calculateFiNumber(
    spending,
    inputs.safeWithdrawalRate.value,
    inputs.safeWithdrawalRate.source,
  );
  const investable = sumInvestable(
    inputs.portfolios,
    inputs.cashBalance,
    inputs.projection.status === "complete"
      ? totalSuperBalance(inputs.projection.inputs.people)
      : { value: DEFAULT_SUPER_BALANCE, source: "default" },
  );
  const progressToFi = calculateProgressToFi(investable, fiNumber);

  return {
    status: "complete",
    fiNumber,
    progressToFi,
    investable,
    retirementSpending: spending,
    safeWithdrawalRate: inputs.safeWithdrawalRate.value,
    projection: summariseProjection(inputs, fiNumber, spending.value, startYear, ruleSet),
  };
}

/**
 * Builds the projection part of the summary: the rows, the year FI is
 * reached, the FI number at the household retirement row, and each person's
 * retirement figures.
 *
 * Returns `incomplete` when the ages are missing, so M1's figures still show.
 * Called by `summarisePlan` once the FI number is known. This is where the
 * resolved plan (user-facing, with sources) becomes the engine's plain
 * `ProjectionInputs`, one `ProjectionPerson` for each resolved person.
 *
 * The portfolio's stop age becomes the engine's stop rule here rather than
 * in `resolvePlanInputs`, because a stop age is turned into a calendar year
 * with the start year, which resolution doesn't have:
 *
 *   stop age left unset ─► whileWorking (the portfolio's owners)  follows retirement
 *   stop age entered    ─► throughYear (start year + stop age − first owner's current age)
 */
function summariseProjection(
  inputs: ResolvedPlanInputs,
  fiNumberToday: Explained,
  retirementSpendingAnnual: number,
  startYear: number,
  ruleSet: RuleSet,
): ProjectionSummary {
  if (inputs.projection.status === "incomplete") {
    return { status: "incomplete", missing: inputs.projection.missing };
  }

  const projectionInputs = inputs.projection.inputs;
  const resolvedPeople = projectionInputs.people;

  const ownerIds = projectionInputs.portfolioOwnerIds;
  const firstOwner =
    resolvedPeople.find((person) => person.id === ownerIds[0]) ?? resolvedPeople[0];

  const contributionsStop: ContributionsStop =
    projectionInputs.contributionsStopAge.source === "default"
      ? { kind: "whileWorking", personIds: ownerIds }
      : {
          kind: "throughYear",
          year:
            startYear + (projectionInputs.contributionsStopAge.value - firstOwner.currentAge.value),
        };

  const [firstPerson, ...otherPeople] = resolvedPeople;

  const projectionSettings: ProjectionInputs = {
    people: [
      projectionPersonFrom(firstPerson, ruleSet),
      ...otherPeople.map((person) => projectionPersonFrom(person, ruleSet)),
    ],
    endAge: projectionInputs.endAge.value,
    expectedReturn: projectionInputs.expectedReturn.value,
    interestRate: projectionInputs.interestRate.value,
    inflationRate: projectionInputs.inflationRate.value,
    annualContribution: projectionInputs.annualContribution.value,
    contributionsStop,
    portfolioOpening: sumValues(inputs.portfolios),
    cashOpening: inputs.cashBalance.value,
    livingAnnual: inputs.livingAnnual.value,
    retirementSpendingAnnual,
    datedExpenses: projectionInputs.datedExpenses.map((expense) => ({
      annual: expense.annual.value,
      fromYear: expense.fromYear,
      toYear: expense.toYear,
    })),
    fiNumberToday: fiNumberToday.value,
  };

  const rows = projectPortfolio(projectionSettings, startYear);

  // One summary for each person, in the plan's order. A stop age the user left
  // unset is `whileWorking`, so the search follows each retirement age it tries.
  const personSummaries = projectionSettings.people.map((person, personIndex): PersonSummary => {
    const superAccessAge = effectiveSuperAccessAge(person, projectionSettings, startYear);

    return {
      id: person.id,
      label: person.label,
      retirementAge: person.retirementAge,
      retirementYear: startYear + (person.retirementAge - person.currentAge),
      ...(superAccessAge === undefined ? {} : { superAccessAge }),
      earliestRetirement: findEarliestRetirementAge(projectionSettings, startYear, personIndex),
    };
  });
  const [firstPersonSummary, ...otherPersonSummaries] = personSummaries;

  const bridge = assessBridge(rows, projectionSettings);
  const coastSplit = calculateCoastSplit(rows, projectionSettings, bridge);

  const fiReached = findFiReached(rows);
  const yearsUntilRetirement = householdRetirementRowIndex(projectionSettings);

  return {
    status: "complete",
    rows,
    ...(fiReached === undefined ? {} : { fiReached }),
    fiNumberAtRetirement: calculateFiNumberAtRetirement(
      fiNumberToday,
      projectionInputs.inflationRate.value,
      yearsUntilRetirement,
    ),
    // `personSummaries` has one entry per person, and there is always at least one.
    people: [firstPersonSummary as PersonSummary, ...otherPersonSummaries],
    householdRetirementYear: startYear + yearsUntilRetirement,
    endAge: projectionInputs.endAge.value,
    // Until the couple wording (M7 PR B) the locked-super note quotes the first person's access age.
    solvency: assessSolvency(rows, personSummaries[0]?.superAccessAge),
    bridge,
    coast: { ...calculateCoastFire(rows, projectionSettings), split: coastSplit },
  };
}

/**
 * Maps one resolved person (user-facing, values tagged with their source)
 * to the engine's plain `ProjectionPerson`. Called by `summariseProjection`
 * for each person.
 */
function projectionPersonFrom(person: ResolvedPerson, ruleSet: RuleSet): ProjectionPerson {
  const { superAccount } = person;

  return {
    id: person.id,
    label: person.label,
    currentAge: person.currentAge.value,
    retirementAge: person.targetRetirementAge.value,
    salary: {
      annual: person.salaryAnnual.value,
      growth: person.salaryGrowth.value,
    },
    superAccount: {
      opening: superAccount.balance.value,
      returnRate: superAccount.returnRate.value,
      ...(superAccount.employerRate.value !== undefined
        ? { employerRate: superAccount.employerRate.value }
        : {}),
      ...(superAccount.earningsTaxRate.value !== undefined
        ? { earningsTaxRate: superAccount.earningsTaxRate.value }
        : {}),
      salarySacrifice: projectionContributionFrom(superAccount.salarySacrifice),
      nonConcessional: projectionContributionFrom(superAccount.nonConcessional),
      ...(person.superAccessAge.value !== undefined
        ? { accessAge: person.superAccessAge.value }
        : {}),
      ruleSet,
    },
  };
}

/**
 * The super balance of the whole household as one `Sourced` figure, for the
 * investable amount. One person keeps their own figure and source; with
 * several the balances are added, and the total counts as entered if any of
 * them was. Called by `summarisePlan`.
 */
function totalSuperBalance(people: readonly ResolvedPerson[]): Sourced<number> {
  const balances = people.map((person) => person.superAccount.balance);
  const [onlyBalance] = balances;

  if (balances.length === 1 && onlyBalance !== undefined) return onlyBalance;

  return {
    value: balances.reduce((total, balance) => total + balance.value, 0),
    source: balances.some((balance) => balance.source === "input") ? "input" : "default",
  };
}

/** Maps a resolved voluntary super contribution to the projection's form (amount plus optional years). */
function projectionContributionFrom(
  contribution: ResolvedSuperContribution,
): ProjectionSuperContribution {
  return {
    annual: contribution.annual.value,
    ...(contribution.fromYear !== undefined ? { fromYear: contribution.fromYear } : {}),
    ...(contribution.toYear !== undefined ? { toYear: contribution.toYear } : {}),
  };
}

/**
 * The FI number in nominal dollars at the target retirement age: today's FI
 * number grown by inflation for the years until then (FIRE-1).
 *
 * Called by `summariseProjection`; the Results screen shows it with its
 * breakdown.
 */
export function calculateFiNumberAtRetirement(
  fiNumberToday: Explained,
  inflationRate: number,
  yearsUntilRetirement: number,
): Explained {
  const inflationGrowth = Math.pow(1 + inflationRate, yearsUntilRetirement);
  const fiNumberAtRetirement = fiNumberToday.value * inflationGrowth;

  return {
    value: fiNumberAtRetirement,
    unit: "dollars",
    lines: [
      summaryLine("FI number today", fiNumberToday),
      {
        label: `Inflation growth over ${yearsUntilRetirement} years`,
        value: inflationGrowth,
        unit: "factor",
        operator: "×",
        source: "calculated",
      },
      {
        label: "FI number at retirement",
        value: fiNumberAtRetirement,
        unit: "dollars",
        operator: "=",
        source: "calculated",
      },
    ],
  };
}

/** Adds up the portfolios' values. Shared by the investable explanation and the projection's opening balance. */
function sumValues(portfolios: readonly { value: Sourced<number> }[]): number {
  return portfolios.reduce((running, portfolio) => running + portfolio.value.value, 0);
}

/**
 * Adds up the portfolios, cash savings and super into one investable amount (cash +
 * portfolio + super), listing each portfolio and the cash as a line, then a total.
 * Called by `summarisePlan`; this is the figure progress to FI measures.
 */
function sumInvestable(
  portfolios: readonly { name: string; value: Sourced<number> }[],
  cashBalance: Sourced<number>,
  superBalance: Sourced<number>,
): Explained {
  const total = sumValues(portfolios) + cashBalance.value + superBalance.value;

  const portfolioLines = portfolios.map((portfolio, index): ExplanationLine => ({
    label: portfolio.name,
    value: portfolio.value.value,
    unit: "dollars",
    ...(index > 0 ? { operator: "+" as const } : {}),
    source: portfolio.value.source,
  }));

  const cashLine: ExplanationLine = {
    label: "Cash savings",
    value: cashBalance.value,
    unit: "dollars",
    // Cash always follows at least one portfolio line in M3, but stay correct if there are none.
    ...(portfolios.length > 0 ? { operator: "+" as const } : {}),
    source: cashBalance.source,
  };

  const superLine: ExplanationLine = {
    label: "Super",
    value: superBalance.value,
    unit: "dollars",
    operator: "+",
    source: superBalance.source,
  };

  const totalLine: ExplanationLine = {
    label: "Investable amount",
    value: total,
    unit: "dollars",
    operator: "=",
    source: "calculated",
  };

  return {
    value: total,
    unit: "dollars",
    lines: [...portfolioLines, cashLine, superLine, totalLine],
  };
}

/**
 * Turns an already-explained figure into a single line of a larger
 * explanation. If it was itself a single input/default line (e.g. a dollar
 * amount of retirement spending) it keeps that source; otherwise it was
 * calculated.
 */
function summaryLine(label: string, explained: Explained): ExplanationLine {
  const onlyLine = explained.lines.length === 1 ? explained.lines[0] : undefined;

  return {
    label,
    value: explained.value,
    unit: explained.unit,
    source: onlyLine?.source ?? "calculated",
  };
}
