// Personal income tax for one person in one year (M8, TAX-1 and TAX-9).
//
//   taxable income (never below $0)
//     → tax on each bracket
//     − low income tax offset   (reduces tax, never below $0)
//     = income tax
//     + Medicare levy           (2%, shaded in at low incomes)
//     = tax payable
//
// The rules come in as `IncomeTaxRules` (src/rules/ruleSet.ts), chosen and
// indexed for the row's year by `rulesForYear`; this module never reads the
// rules data itself. The projection (M8 step 3 onwards) calls
// `calculateIncomeTax` once per person per year, and the Income & expenses
// screen calls it for the "How is this calculated?" breakdown.

import type { Explained, ExplanationLine } from "./explained";
import type { IncomeTaxRules } from "../rules/ruleSet";

/**
 * The tax payable as an `Explained` (value = total tax payable, lines = the
 * working), plus the parts the projection stores separately on each person's
 * year: the income tax (after the offset) and the Medicare levy.
 */
export interface IncomeTaxResult extends Explained {
  /** Tax from the brackets, before the offset. */
  readonly bracketTax: number;
  /** The offset actually used: the full offset, capped at the bracket tax. */
  readonly lowIncomeTaxOffsetApplied: number;
  /** Bracket tax less the offset applied; excludes the Medicare levy. */
  readonly incomeTax: number;
  readonly medicareLevy: number;
}

/** Whole dollars with thousands separators, e.g. "$45,000", for line labels. */
function formatWholeDollars(dollars: number): string {
  return `$${Math.round(dollars).toLocaleString("en-AU")}`;
}

/** A fraction as a percentage without float noise, e.g. 0.16 → "16%", 0.015 → "1.5%". */
function formatPercent(fraction: number): string {
  return `${Number((fraction * 100).toFixed(2))}%`;
}

/**
 * The low income tax offset (LITO) before it is capped at the tax payable:
 * the maximum up to the first threshold, falling at the first reduction rate
 * to the second threshold, then at the second rate, and never below $0.
 * Used by `calculateIncomeTax`.
 */
function lowIncomeTaxOffsetBeforeCap(taxableIncome: number, rules: IncomeTaxRules): number {
  const offset = rules.lowIncomeTaxOffset;

  if (taxableIncome <= offset.firstThresholdDollars) {
    return offset.maximumDollars;
  }

  const afterFirstStage =
    offset.maximumDollars -
    offset.firstReductionRate *
      (Math.min(taxableIncome, offset.secondThresholdDollars) - offset.firstThresholdDollars);

  if (taxableIncome <= offset.secondThresholdDollars) {
    return Math.max(0, afterFirstStage);
  }

  return Math.max(
    0,
    afterFirstStage - offset.secondReductionRate * (taxableIncome - offset.secondThresholdDollars),
  );
}

/**
 * The Medicare levy: nothing up to the low-income threshold, then the shade-in
 * rate on the amount above it until that equals the full rate on all income,
 * then the full rate. Used by `calculateIncomeTax`.
 */
function medicareLevyFor(taxableIncome: number, rules: IncomeTaxRules): number {
  const levy = rules.medicareLevy;

  if (taxableIncome <= levy.lowIncomeThresholdDollars) {
    return 0;
  }

  const shadedInLevy = levy.shadeInRate * (taxableIncome - levy.lowIncomeThresholdDollars);

  return Math.min(shadedInLevy, levy.rate * taxableIncome);
}

/** One bracket's slice of a taxable income: the part inside the bracket and the tax on it. */
interface BracketSlice {
  readonly bracket: IncomeTaxRules["residentBrackets"][number];
  readonly nextBracket: IncomeTaxRules["residentBrackets"][number] | undefined;
  readonly taxInBracket: number;
}

/** The tax-only figures of one calculation: everything but the explanation lines. */
interface IncomeTaxFigures {
  readonly bracketSlices: readonly BracketSlice[];
  readonly bracketTax: number;
  readonly lowIncomeTaxOffsetApplied: number;
  readonly incomeTax: number;
  readonly medicareLevy: number;
  readonly totalTax: number;
}

/**
 * Cleans a taxable income for calculation: negative or non-finite counts as $0,
 * so callers can pass a raw salary-less-sacrifice figure without guarding.
 */
function cleanTaxableIncome(taxableIncome: number): number {
  return Number.isFinite(taxableIncome) ? Math.max(0, taxableIncome) : 0;
}

/**
 * The numbers behind a tax calculation, with no text built. This is the one
 * place the tax is worked out; `calculateIncomeTax` adds the explanation on
 * top and `calculateIncomeTaxFigures` exposes it to the projection, which
 * runs it thousands of times in the Coast FIRE and earliest-age searches and
 * must not build labels each time.
 */
function workOutIncomeTax(income: number, rules: IncomeTaxRules): IncomeTaxFigures {
  const bracketSlices: BracketSlice[] = [];
  let bracketTax = 0;

  // The slice of income inside each bracket it reaches, times the bracket's rate.
  rules.residentBrackets.forEach((bracket, index) => {
    if (income <= bracket.fromDollars) {
      return;
    }

    const nextBracket = rules.residentBrackets[index + 1];
    const sliceTop = nextBracket === undefined ? income : Math.min(income, nextBracket.fromDollars);
    const taxInBracket = (sliceTop - bracket.fromDollars) * bracket.rate;

    bracketTax += taxInBracket;
    bracketSlices.push({ bracket, nextBracket, taxInBracket });
  });

  // The offset can only reduce tax to $0, never create a refund.
  const lowIncomeTaxOffsetApplied = Math.min(
    lowIncomeTaxOffsetBeforeCap(income, rules),
    bracketTax,
  );
  const incomeTax = bracketTax - lowIncomeTaxOffsetApplied;
  const medicareLevy = medicareLevyFor(income, rules);

  return {
    bracketSlices,
    bracketTax,
    lowIncomeTaxOffsetApplied,
    incomeTax,
    medicareLevy,
    totalTax: incomeTax + medicareLevy,
  };
}

/**
 * The income tax and Medicare levy for one person-year without the
 * explanation. Called by `projectPortfolio` for every person in every row;
 * the Income & expenses screen uses `calculateIncomeTax` for the working.
 * Gives exactly the same figures as `calculateIncomeTax`.
 */
export function calculateIncomeTaxFigures(
  taxableIncome: number,
  rules: IncomeTaxRules,
): Pick<
  IncomeTaxResult,
  "bracketTax" | "lowIncomeTaxOffsetApplied" | "incomeTax" | "medicareLevy"
> & {
  readonly tax: number;
} {
  const figures = workOutIncomeTax(cleanTaxableIncome(taxableIncome), rules);

  return {
    bracketTax: figures.bracketTax,
    lowIncomeTaxOffsetApplied: figures.lowIncomeTaxOffsetApplied,
    incomeTax: figures.incomeTax,
    medicareLevy: figures.medicareLevy,
    tax: figures.totalTax,
  };
}

/**
 * Works out one person's tax payable for one year, with the working shown (NFR-1).
 *
 * Lines are one per bracket that income reaches (added together), then the
 * offset (taken off), the Medicare levy (added) and the total (the result).
 * Never throws: a negative or non-finite taxable income counts as $0.
 */
export function calculateIncomeTax(taxableIncome: number, rules: IncomeTaxRules): IncomeTaxResult {
  const income = cleanTaxableIncome(taxableIncome);
  const figures = workOutIncomeTax(income, rules);

  const lines: ExplanationLine[] = figures.bracketSlices.map(
    ({ bracket, nextBracket, taxInBracket }, sliceIndex) => {
      const rangeText =
        nextBracket !== undefined && income > nextBracket.fromDollars
          ? `from ${formatWholeDollars(bracket.fromDollars)} to ${formatWholeDollars(nextBracket.fromDollars)}`
          : `above ${formatWholeDollars(bracket.fromDollars)}`;

      return {
        label: `Tax on income ${rangeText} at ${formatPercent(bracket.rate)}`,
        value: taxInBracket,
        unit: "dollars",
        ...(sliceIndex === 0 ? {} : { operator: "+" as const }),
        source: "calculated",
      };
    },
  );

  // With no taxable income no bracket applies; keep a first line so the
  // working still starts from something.
  if (lines.length === 0) {
    lines.push({ label: "Tax on income", value: 0, unit: "dollars", source: "calculated" });
  }

  lines.push(
    {
      label: "Low income tax offset",
      value: figures.lowIncomeTaxOffsetApplied,
      unit: "dollars",
      operator: "−",
      source: "calculated",
    },
    {
      label: `Medicare levy (${formatPercent(rules.medicareLevy.rate)}, shaded in at low incomes)`,
      value: figures.medicareLevy,
      unit: "dollars",
      operator: "+",
      source: "calculated",
    },
    {
      label: "Tax payable",
      value: figures.totalTax,
      unit: "dollars",
      operator: "=",
      source: "calculated",
    },
  );

  return {
    value: figures.totalTax,
    unit: "dollars",
    lines,
    bracketTax: figures.bracketTax,
    lowIncomeTaxOffsetApplied: figures.lowIncomeTaxOffsetApplied,
    incomeTax: figures.incomeTax,
    medicareLevy: figures.medicareLevy,
  };
}
