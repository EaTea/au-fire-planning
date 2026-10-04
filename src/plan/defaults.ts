// The values used when the user hasn't set something (see resolvePlanInputs.ts).
// The UI also reads these to display the dashed "default" fields, so what the
// user sees and what the engine uses can't drift apart.
//
// Living expenses have no default on purpose: without them there is nothing to
// calculate.

import type { RetirementSpending, SalaryGrowth } from "./types";

/** Safe withdrawal rate: 4% a year (a fraction). */
export const DEFAULT_SAFE_WITHDRAWAL_RATE = 0.04;

/** Retirement spending: 100% of today's living expenses. */
export const DEFAULT_RETIREMENT_SPENDING: RetirementSpending = {
  kind: "percentOfToday",
  fraction: 1,
};

/** Portfolio value: $0. */
export const DEFAULT_PORTFOLIO_VALUE = 0;

/** Inflation: 2.5% a year (a fraction). */
export const DEFAULT_INFLATION_RATE = 0.025;

/** Expected nominal total return on a portfolio: 7% a year (a fraction). */
export const DEFAULT_EXPECTED_RETURN = 0.07;

/** Regular contribution to a portfolio: $0 a year. */
export const DEFAULT_ANNUAL_CONTRIBUTION = 0;

/** The age the plan runs until: 95 (IN-4). */
export const DEFAULT_PROJECTION_END_AGE = 95;

/** General interest rate paid on cash: 4% a year (a fraction). */
export const DEFAULT_INTEREST_RATE = 0.04;

/** Gross salary: $0 a year (IN-7). */
export const DEFAULT_SALARY_ANNUAL = 0;

/**
 * Salary growth: none, so an untouched salary stays at the same dollar amount
 * every working year. Wages don't reliably keep pace with prices, so a plan
 * only assumes they do when the user picks "Inflation" (owner's decision).
 */
export const DEFAULT_SALARY_GROWTH: SalaryGrowth = { kind: "none" };

/** Super balance: $0. */
export const DEFAULT_SUPER_BALANCE = 0;

/** Super return, net of fees: 7% a year (a fraction). */
export const DEFAULT_SUPER_RETURN = 0.07;

/** Voluntary super contributions (salary sacrifice, non-concessional): $0 a year. */
export const DEFAULT_SUPER_CONTRIBUTION_ANNUAL = 0;

/**
 * The age from which super can be drawn (IN-5's default). M5 draws super only
 * from this age; M6 makes it an input and adds the bridge check, replacing
 * this constant's use in the engine with the person's own access age.
 */
export const DEFAULT_SUPER_ACCESS_AGE = 65;

/** Cash savings: $0. */
export const DEFAULT_CASH_BALANCE = 0;

// The age contributions stop has no constant here: it defaults to the target
// retirement age, so it depends on another input and is resolved in
// resolvePlanInputs.ts.
