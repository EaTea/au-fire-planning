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
  projectPortfolio,
  type FiMilestone,
  type ProjectionInputs,
  type ProjectionSuperContribution,
  type ProjectionRow,
} from "./projection";
import { calculateCoastFire, type CoastFire } from "./coastFire";
import { calculateCoastSplit, type CoastSplit } from "./coastSplit";
import { findEarliestRetirementAge, type EarliestRetirement } from "./earliestRetirement";
import { assessBridge, type BridgeAssessment } from "./bridge";
import { assessSolvency, type Solvency } from "./solvency";

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
      /** The target retirement age, so screens needn't look it up. */
      readonly retirementAge: number;
      /** The calendar year the target retirement age is reached: start year + (retirement age − current age). */
      readonly retirementYear: number;
      /** The age the projection runs until (IN-4), so screens needn't look it up. */
      readonly endAge: number;
      /** Whether the money lasts to the end age, or the first year it can't be funded. */
      readonly solvency: Solvency;
      /** The age super can first be drawn while retired (see `effectiveSuperAccessAge`); absent when the plan has no super. */
      readonly superAccessAge?: number;
      /** The bridge to super and the years after access (FIRE-4). Both parts are absent when there is no super. */
      readonly bridge: BridgeAssessment;
      /** The first retirement age from today to the end age at which the money lasts (FIRE-3). */
      readonly earliestRetirement: EarliestRetirement;
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
      ? inputs.projection.inputs.superAccount.balance
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
 * reached, and the FI number at the target retirement age.
 *
 * Returns `incomplete` when the ages are missing, so M1's figures still show.
 * Called by `summarisePlan` once the FI number is known.
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
  const { superAccount } = projectionInputs;

  const projectionSettings: ProjectionInputs = {
    currentAge: projectionInputs.currentAge.value,
    endAge: projectionInputs.endAge.value,
    retirementAge: projectionInputs.targetRetirementAge.value,
    expectedReturn: projectionInputs.expectedReturn.value,
    interestRate: projectionInputs.interestRate.value,
    inflationRate: projectionInputs.inflationRate.value,
    annualContribution: projectionInputs.annualContribution.value,
    contributionsStopAge: projectionInputs.contributionsStopAge.value,
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
    salary: {
      annual: projectionInputs.salaryAnnual.value,
      growth: projectionInputs.salaryGrowth.value,
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
      ...(projectionInputs.superAccessAge.value !== undefined
        ? { accessAge: projectionInputs.superAccessAge.value }
        : {}),
      ruleSet,
    },
  };

  const rows = projectPortfolio(projectionSettings, startYear);
  const superAccessAge = effectiveSuperAccessAge(projectionSettings, startYear);

  const bridge = assessBridge(rows, projectionSettings);
  const coastSplit = calculateCoastSplit(rows, projectionSettings, bridge);

  const fiReached = findFiReached(rows);
  const retirementAge = projectionInputs.targetRetirementAge.value;
  const yearsUntilRetirement = retirementAge - projectionInputs.currentAge.value;

  return {
    status: "complete",
    rows,
    ...(fiReached === undefined ? {} : { fiReached }),
    fiNumberAtRetirement: calculateFiNumberAtRetirement(
      fiNumberToday,
      projectionInputs.inflationRate.value,
      yearsUntilRetirement,
    ),
    retirementAge,
    retirementYear: startYear + yearsUntilRetirement,
    endAge: projectionInputs.endAge.value,
    ...(superAccessAge === undefined ? {} : { superAccessAge }),
    solvency: assessSolvency(rows, superAccessAge),
    bridge,
    coast: { ...calculateCoastFire(rows, projectionSettings), split: coastSplit },
    earliestRetirement: findEarliestRetirementAge(
      {
        ...projectionSettings,
        // A stop age the user left unset follows each retirement age the search tries.
        contributionsStopAgeFollowsRetirementAge:
          projectionInputs.contributionsStopAge.source === "default",
      },
      startYear,
    ),
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
