import { fc, test } from "@fast-check/vitest";
import { expect } from "vitest";

import { calculateIncomeTax } from "./incomeTax";
import { bundledRuleSet } from "../rules/bundledRuleSet";
import { rulesForYear } from "../rules/ruleSet";

// Property-based tests for the income tax calculation (TAX-1, TAX-9): rules
// that hold for any income in any year, including years estimated beyond the
// latest rules file.

/** A calendar year (before, within and beyond the rules files) and an inflation rate. */
const yearAndInflation = fc.record({
  calendarYear: fc.integer({ min: 2024, max: 2060 }),
  inflationRate: fc.integer({ min: 0, max: 80 }).map((tenthsOfPercent) => tenthsOfPercent / 1000),
});

/** Whole-dollar taxable incomes up to $1,000,000. */
const income = fc.integer({ min: 0, max: 1_000_000 });

test.prop([yearAndInflation, income])(
  "tax payable never exceeds taxable income",
  ({ calendarYear, inflationRate }, taxableIncome) => {
    const rules = rulesForYear(bundledRuleSet, calendarYear, inflationRate).incomeTax;

    expect(calculateIncomeTax(taxableIncome, rules).value).toBeLessThanOrEqual(taxableIncome);
  },
);

test.prop([yearAndInflation, income, fc.integer({ min: 0, max: 100_000 })])(
  "take-home pay never falls as income rises",
  ({ calendarYear, inflationRate }, lowerIncome, extraIncome) => {
    const rules = rulesForYear(bundledRuleSet, calendarYear, inflationRate).incomeTax;
    const higherIncome = lowerIncome + extraIncome;

    const lowerTakeHome = lowerIncome - calculateIncomeTax(lowerIncome, rules).value;
    const higherTakeHome = higherIncome - calculateIncomeTax(higherIncome, rules).value;

    // A tiny allowance for floating point at the kinks between brackets.
    expect(higherTakeHome).toBeGreaterThanOrEqual(lowerTakeHome - 1e-6);
  },
);

test.prop([yearAndInflation, fc.double({ min: 0, max: 1, noNaN: true })])(
  "income under both the tax-free threshold and the Medicare threshold pays $0",
  ({ calendarYear, inflationRate }, fractionOfThreshold) => {
    const rules = rulesForYear(bundledRuleSet, calendarYear, inflationRate).incomeTax;
    const firstTaxedBracket = rules.residentBrackets.find((bracket) => bracket.rate > 0);
    const lowestThreshold = Math.min(
      firstTaxedBracket?.fromDollars ?? 0,
      rules.medicareLevy.lowIncomeThresholdDollars,
    );

    const result = calculateIncomeTax(lowestThreshold * fractionOfThreshold, rules);

    expect(result.value).toBe(0);
  },
);
