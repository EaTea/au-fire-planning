// Explicit mappers between the in-memory `Plan` and the stored `PlanDocumentV1`.
//
//   save:  Plan ──planToWire──► PlanDocumentV1 ──► (validate, write)
//   load:  (read, migrate, validate) ──► PlanDocumentV1 ──planFromWire──► Plan
//
// These are the only functions that know about both shapes. Neither type is
// ever stored or used in place of the other.

import type {
  DatedExpense,
  GrowthRate,
  Person,
  Plan,
  Portfolio,
  RetirementSpending,
  SuperAccount,
  SuperContribution,
} from "../plan/types";
import { CURRENT_SCHEMA_VERSION, type PlanDocumentV1 } from "./planDocument";

/** The wire form of retirement spending, taken from the document type. */
type WireRetirement = NonNullable<PlanDocumentV1["expenses"]["retirement"]>;

/** The wire form of one dated expense, taken from the document type. */
type WireDatedExpense = NonNullable<PlanDocumentV1["expenses"]["datedExpenses"]>[number];

/** Maps a dated expense to its wire form; an unset amount is left out. */
function datedExpenseToWire(expense: DatedExpense): WireDatedExpense {
  return {
    id: expense.id,
    name: expense.name,
    ...(expense.annual !== undefined ? { annualDollars: expense.annual } : {}),
    fromYear: expense.fromYear,
    toYear: expense.toYear,
  };
}

/** Inverse of `datedExpenseToWire`. */
function datedExpenseFromWire(wireExpense: WireDatedExpense): DatedExpense {
  return {
    id: wireExpense.id,
    name: wireExpense.name,
    ...(wireExpense.annualDollars !== undefined ? { annual: wireExpense.annualDollars } : {}),
    fromYear: wireExpense.fromYear,
    toYear: wireExpense.toYear,
  };
}

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

/** The wire form of a growth rate, taken from the document type. */
type WireGrowthRate = NonNullable<
  NonNullable<PlanDocumentV1["household"]["people"][number]["salary"]>["growth"]
>;

/** Maps a growth rate to its wire form, converting fractions to percents. */
function growthRateToWire(growth: GrowthRate): WireGrowthRate {
  switch (growth.kind) {
    case "inflationPlus":
      return { kind: "inflationPlus", marginPercent: fractionToPercent(growth.margin) };
    case "fixed":
      return { kind: "fixed", ratePercent: fractionToPercent(growth.rate) };
    case "none":
      return { kind: "none" };
  }
}

/** Inverse of `growthRateToWire`: converts stored percents back to fractions. */
function growthRateFromWire(wireGrowth: WireGrowthRate): GrowthRate {
  switch (wireGrowth.kind) {
    case "inflationPlus":
      return { kind: "inflationPlus", margin: percentToFraction(wireGrowth.marginPercent) };
    case "fixed":
      return { kind: "fixed", rate: percentToFraction(wireGrowth.ratePercent) };
    case "none":
      return { kind: "none" };
  }
}

/** The wire form of a super account, taken from the document type. */
type WireSuperAccount = NonNullable<PlanDocumentV1["household"]["people"][number]["superAccount"]>;

/** The wire form of a voluntary super contribution, taken from the document type. */
type WireSuperContribution = NonNullable<WireSuperAccount["salarySacrifice"]>;

/** Maps a voluntary contribution to its wire form; unset fields are left out. */
function superContributionToWire(contribution: SuperContribution): WireSuperContribution {
  return {
    ...(contribution.annual !== undefined ? { annualDollars: contribution.annual } : {}),
    ...(contribution.fromYear !== undefined ? { fromYear: contribution.fromYear } : {}),
    ...(contribution.toYear !== undefined ? { toYear: contribution.toYear } : {}),
  };
}

/** Inverse of `superContributionToWire`. */
function superContributionFromWire(wireContribution: WireSuperContribution): SuperContribution {
  return {
    ...(wireContribution.annualDollars !== undefined
      ? { annual: wireContribution.annualDollars }
      : {}),
    ...(wireContribution.fromYear !== undefined ? { fromYear: wireContribution.fromYear } : {}),
    ...(wireContribution.toYear !== undefined ? { toYear: wireContribution.toYear } : {}),
  };
}

/** Maps a super account to its wire form: rates become percents, unset fields are left out. */
function superAccountToWire(account: SuperAccount): WireSuperAccount {
  return {
    ...(account.balance !== undefined ? { balanceDollars: account.balance } : {}),
    ...(account.returnRate !== undefined
      ? { returnPercent: fractionToPercent(account.returnRate) }
      : {}),
    ...(account.employerRate !== undefined
      ? { employerRatePercent: fractionToPercent(account.employerRate) }
      : {}),
    ...(account.salarySacrifice !== undefined
      ? { salarySacrifice: superContributionToWire(account.salarySacrifice) }
      : {}),
    ...(account.nonConcessional !== undefined
      ? { nonConcessional: superContributionToWire(account.nonConcessional) }
      : {}),
    ...(account.earningsTaxRate !== undefined
      ? { earningsTaxPercent: fractionToPercent(account.earningsTaxRate) }
      : {}),
  };
}

/** Inverse of `superAccountToWire`: converts stored percents back to fractions. */
function superAccountFromWire(wireAccount: WireSuperAccount): SuperAccount {
  return {
    ...(wireAccount.balanceDollars !== undefined ? { balance: wireAccount.balanceDollars } : {}),
    ...(wireAccount.returnPercent !== undefined
      ? { returnRate: percentToFraction(wireAccount.returnPercent) }
      : {}),
    ...(wireAccount.employerRatePercent !== undefined
      ? { employerRate: percentToFraction(wireAccount.employerRatePercent) }
      : {}),
    ...(wireAccount.salarySacrifice !== undefined
      ? { salarySacrifice: superContributionFromWire(wireAccount.salarySacrifice) }
      : {}),
    ...(wireAccount.nonConcessional !== undefined
      ? { nonConcessional: superContributionFromWire(wireAccount.nonConcessional) }
      : {}),
    ...(wireAccount.earningsTaxPercent !== undefined
      ? { earningsTaxRate: percentToFraction(wireAccount.earningsTaxPercent) }
      : {}),
  };
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
  // An empty list is kept (as []), so a plan with the table emptied round-trips unchanged.
  if (plan.expenses.datedExpenses !== undefined) {
    expenses.datedExpenses = plan.expenses.datedExpenses.map(datedExpenseToWire);
  }

  const assumptions: PlanDocumentV1["assumptions"] = {};
  if (plan.assumptions.safeWithdrawalRate !== undefined) {
    assumptions.safeWithdrawalRatePercent = fractionToPercent(plan.assumptions.safeWithdrawalRate);
  }

  if (plan.assumptions.inflationRate !== undefined) {
    assumptions.inflationPercent = fractionToPercent(plan.assumptions.inflationRate);
  }
  if (plan.assumptions.interestRate !== undefined) {
    assumptions.interestPercent = fractionToPercent(plan.assumptions.interestRate);
  }

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    household: {
      ...(plan.household.projectionEndAge !== undefined
        ? { projectionEndAgeYears: plan.household.projectionEndAge }
        : {}),
      people: plan.household.people.map((person) => {
        const wirePerson: PlanDocumentV1["household"]["people"][number] = {
          id: person.id,
          label: person.label,
        };
        if (person.currentAge !== undefined) {
          wirePerson.currentAgeYears = person.currentAge;
        }
        if (person.targetRetirementAge !== undefined) {
          wirePerson.targetRetirementAgeYears = person.targetRetirementAge;
        }
        if (person.superAccessAge !== undefined) {
          wirePerson.superAccessAgeYears = person.superAccessAge;
        }
        // The salary section is written only once something in it is set.
        if (person.salary?.annual !== undefined || person.salary?.growth !== undefined) {
          wirePerson.salary = {
            ...(person.salary.annual !== undefined ? { annualDollars: person.salary.annual } : {}),
            ...(person.salary.growth !== undefined
              ? { growth: growthRateToWire(person.salary.growth) }
              : {}),
          };
        }
        // The super section is written only once something in it is set.
        if (person.superAccount !== undefined) {
          const wireSuperAccount = superAccountToWire(person.superAccount);
          if (Object.keys(wireSuperAccount).length > 0) {
            wirePerson.superAccount = wireSuperAccount;
          }
        }
        return wirePerson;
      }),
    },
    // The cash section is written only once a balance is set.
    ...(plan.cash?.balance !== undefined ? { cash: { balanceDollars: plan.cash.balance } } : {}),
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
      if (portfolio.expectedReturn !== undefined) {
        wirePortfolio.expectedReturnPercent = fractionToPercent(portfolio.expectedReturn);
      }
      if (portfolio.annualContribution !== undefined) {
        wirePortfolio.annualContributionDollars = portfolio.annualContribution;
      }
      if (portfolio.contributionsStopAge !== undefined) {
        wirePortfolio.contributionsStopAgeYears = portfolio.contributionsStopAge;
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
    ...(wirePerson.currentAgeYears !== undefined ? { currentAge: wirePerson.currentAgeYears } : {}),
    ...(wirePerson.targetRetirementAgeYears !== undefined
      ? { targetRetirementAge: wirePerson.targetRetirementAgeYears }
      : {}),
    ...(wirePerson.superAccessAgeYears !== undefined
      ? { superAccessAge: wirePerson.superAccessAgeYears }
      : {}),
    ...(wirePerson.salary !== undefined
      ? {
          salary: {
            ...(wirePerson.salary.annualDollars !== undefined
              ? { annual: wirePerson.salary.annualDollars }
              : {}),
            ...(wirePerson.salary.growth !== undefined
              ? { growth: growthRateFromWire(wirePerson.salary.growth) }
              : {}),
          },
        }
      : {}),
    ...(wirePerson.superAccount !== undefined
      ? { superAccount: superAccountFromWire(wirePerson.superAccount) }
      : {}),
  }));

  const portfolios: Portfolio[] = document.portfolios.map((wirePortfolio) => ({
    id: wirePortfolio.id,
    name: wirePortfolio.name,
    ...(wirePortfolio.valueDollars !== undefined ? { value: wirePortfolio.valueDollars } : {}),
    ...(wirePortfolio.expectedReturnPercent !== undefined
      ? { expectedReturn: percentToFraction(wirePortfolio.expectedReturnPercent) }
      : {}),
    ...(wirePortfolio.annualContributionDollars !== undefined
      ? { annualContribution: wirePortfolio.annualContributionDollars }
      : {}),
    ...(wirePortfolio.contributionsStopAgeYears !== undefined
      ? { contributionsStopAge: wirePortfolio.contributionsStopAgeYears }
      : {}),
  }));

  return {
    household: {
      people,
      ...(document.household.projectionEndAgeYears !== undefined
        ? { projectionEndAge: document.household.projectionEndAgeYears }
        : {}),
    },
    ...(document.cash?.balanceDollars !== undefined
      ? { cash: { balance: document.cash.balanceDollars } }
      : {}),
    expenses: {
      ...(document.expenses.livingAnnualDollars !== undefined
        ? { livingAnnual: document.expenses.livingAnnualDollars }
        : {}),
      ...(document.expenses.retirement !== undefined
        ? { retirementSpending: retirementSpendingFromWire(document.expenses.retirement) }
        : {}),
      ...(document.expenses.datedExpenses !== undefined
        ? { datedExpenses: document.expenses.datedExpenses.map(datedExpenseFromWire) }
        : {}),
    },
    assumptions: {
      ...(document.assumptions.safeWithdrawalRatePercent !== undefined
        ? { safeWithdrawalRate: percentToFraction(document.assumptions.safeWithdrawalRatePercent) }
        : {}),
      ...(document.assumptions.inflationPercent !== undefined
        ? { inflationRate: percentToFraction(document.assumptions.inflationPercent) }
        : {}),
      ...(document.assumptions.interestPercent !== undefined
        ? { interestRate: percentToFraction(document.assumptions.interestPercent) }
        : {}),
    },
    portfolios,
  };
}
