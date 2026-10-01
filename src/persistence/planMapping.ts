// Explicit mappers between the in-memory `Plan` and the stored `PlanDocumentV1`.
//
//   save:  Plan ──planToWire──► PlanDocumentV1 ──► (validate, write)
//   load:  (read, migrate, validate) ──► PlanDocumentV1 ──planFromWire──► Plan
//
// These are the only functions that know about both shapes. Neither type is
// ever stored or used in place of the other.

import type { Person, Plan, Portfolio, RetirementSpending } from "../plan/types";
import { CURRENT_SCHEMA_VERSION, type PlanDocumentV1 } from "./planDocument";

/** The wire form of retirement spending, taken from the document type. */
type WireRetirement = NonNullable<PlanDocumentV1["expenses"]["retirement"]>;

/**
 * Rounds away floating-point noise. Dividing or multiplying by 100 can leave
 * errors in the 16th digit (4.1 / 100 is 0.040999999999999995, not 0.041).
 * Rounding to 12 significant digits keeps every value a person could type
 * while making conversions give the clean number they expect, and makes
 * converting back and forth stable.
 */
function removeFloatingPointNoise(value: number): number {
  return Number(value.toPrecision(12));
}

/** Converts a stored percent (4) to the in-memory fraction (0.04), without float noise. */
export function percentToFraction(percent: number): number {
  return removeFloatingPointNoise(percent / 100);
}

/** Converts an in-memory fraction (0.04) to a stored percent (4), without float noise. */
export function fractionToPercent(fraction: number): number {
  return removeFloatingPointNoise(fraction * 100);
}

/** Maps retirement spending to its wire form, converting a fraction to a percent. */
function retirementSpendingToWire(spending: RetirementSpending): WireRetirement {
  if (spending.kind === "amount") {
    return { kind: "amount", annualDollars: spending.annual };
  }

  return { kind: "percentOfToday", percent: fractionToPercent(spending.fraction) };
}

/** Inverse of `retirementSpendingToWire`: converts a stored percent back to a fraction. */
function retirementSpendingFromWire(retirement: WireRetirement): RetirementSpending {
  if (retirement.kind === "amount") {
    return { kind: "amount", annual: retirement.annualDollars };
  }

  return { kind: "percentOfToday", fraction: percentToFraction(retirement.percent) };
}

/**
 * Converts the in-memory plan to the stored document. Called by the save path
 * just before validation and writing. Only values that are set are written
 * (keys for unset values are omitted entirely), and fractions become percents.
 */
export function planToWire(plan: Plan): PlanDocumentV1 {
  const expenses: PlanDocumentV1["expenses"] = {};
  if (plan.expenses.livingAnnual !== undefined) {
    expenses.livingAnnualDollars = plan.expenses.livingAnnual;
  }
  if (plan.expenses.retirementSpending !== undefined) {
    expenses.retirement = retirementSpendingToWire(plan.expenses.retirementSpending);
  }

  const assumptions: PlanDocumentV1["assumptions"] = {};
  if (plan.assumptions.safeWithdrawalRate !== undefined) {
    assumptions.safeWithdrawalRatePercent = fractionToPercent(plan.assumptions.safeWithdrawalRate);
  }

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    household: {
      people: plan.household.people.map((person) => ({ id: person.id, label: person.label })),
    },
    expenses,
    assumptions,
    portfolios: plan.portfolios.map((portfolio) => {
      const wirePortfolio: PlanDocumentV1["portfolios"][number] = {
        id: portfolio.id,
        name: portfolio.name,
      };
      if (portfolio.value !== undefined) {
        wirePortfolio.valueDollars = portfolio.value;
      }
      return wirePortfolio;
    }),
  };
}

/**
 * Converts a validated stored document back to the in-memory plan. Called by
 * the load path after migration and validation. Values missing from the
 * document stay `undefined` (defaults are applied later by `resolvePlanInputs`),
 * percents become fractions, and a person stored without a label gets "Person N".
 */
export function planFromWire(document: PlanDocumentV1): Plan {
  const people: Person[] = document.household.people.map((wirePerson, index) => ({
    id: wirePerson.id,
    label: wirePerson.label ?? `Person ${index + 1}`,
  }));

  const portfolios: Portfolio[] = document.portfolios.map((wirePortfolio) => ({
    id: wirePortfolio.id,
    name: wirePortfolio.name,
    ...(wirePortfolio.valueDollars !== undefined ? { value: wirePortfolio.valueDollars } : {}),
  }));

  return {
    household: { people },
    expenses: {
      ...(document.expenses.livingAnnualDollars !== undefined
        ? { livingAnnual: document.expenses.livingAnnualDollars }
        : {}),
      ...(document.expenses.retirement !== undefined
        ? { retirementSpending: retirementSpendingFromWire(document.expenses.retirement) }
        : {}),
    },
    assumptions: {
      ...(document.assumptions.safeWithdrawalRatePercent !== undefined
        ? { safeWithdrawalRate: percentToFraction(document.assumptions.safeWithdrawalRatePercent) }
        : {}),
    },
    portfolios,
  };
}
