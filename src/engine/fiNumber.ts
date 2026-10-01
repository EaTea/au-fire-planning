// M1's calculations: retirement spending, FI number and progress to FI, all in
// today's dollars. Everything here is pure (no clock, no randomness, no UI or
// storage imports), so the same plan always gives the same answer.
//
//   Plan ─► resolvePlanInputs ─► retirementSpendingAnnual ─► calculateFiNumber ─┐
//                              └─► investable (sum of portfolios) ──────────────┴─► calculateProgressToFi
//
// `summarisePlan` is the entry point the UI calls; the other functions are
// exported so they can be tested one at a time.

import { resolvePlanInputs, type MissingInput } from "../plan/resolvePlanInputs";
import type { Plan, RetirementSpending, Sourced } from "../plan/types";
import type { Explained, ExplanationLine } from "./explained";

/** What `summarisePlan` returns: the figures, or what the user still has to enter. */
export type PlanSummary =
  | {
      readonly status: "complete";
      readonly fiNumber: Explained;
      readonly progressToFi: Explained;
      readonly investable: Explained;
      readonly retirementSpending: Explained;
      readonly safeWithdrawalRate: number;
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
 * Progress to FI = investable amount ÷ FI number, as a fraction.
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

  return {
    value: progress,
    unit: "fraction",
    lines: [
      summaryLine("Investable amount", investable),
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
 * The M1 entry point: resolves the plan's inputs, then calculates the FI
 * number, the investable amount and progress to FI.
 *
 * On success it also returns the retirement spending and the resolved safe
 * withdrawal rate, so the UI can show them without digging into breakdown
 * lines.
 *
 * Returns `incomplete` (naming what is missing) rather than guessing when
 * required inputs are absent or retirement spending is not above $0. The investable amount is the sum of the
 * portfolios' values, ready for more portfolios in later milestones.
 */
export function summarisePlan(plan: Plan): PlanSummary {
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
  const investable = sumPortfolios(inputs.portfolios);
  const progressToFi = calculateProgressToFi(investable, fiNumber);

  return {
    status: "complete",
    fiNumber,
    progressToFi,
    investable,
    retirementSpending: spending,
    safeWithdrawalRate: inputs.safeWithdrawalRate.value,
  };
}

/**
 * Adds up the portfolios into one investable amount, listing each portfolio as
 * a line (and a total line when there is more than one).
 */
function sumPortfolios(portfolios: readonly { name: string; value: Sourced<number> }[]): Explained {
  const total = portfolios.reduce((running, portfolio) => running + portfolio.value.value, 0);

  const portfolioLines = portfolios.map((portfolio, index): ExplanationLine => ({
    label: portfolio.name,
    value: portfolio.value.value,
    unit: "dollars",
    ...(index > 0 ? { operator: "+" as const } : {}),
    source: portfolio.value.source,
  }));

  // With one portfolio the total would just repeat that line, so only add it for several.
  const totalLines: ExplanationLine[] =
    portfolios.length > 1
      ? [
          {
            label: "Investable amount",
            value: total,
            unit: "dollars",
            operator: "=",
            source: "calculated",
          },
        ]
      : [];

  return { value: total, unit: "dollars", lines: [...portfolioLines, ...totalLines] };
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
