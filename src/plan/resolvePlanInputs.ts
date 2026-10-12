// Turns a `Plan` (only what the user entered) into complete engine inputs.
//
//   Plan ──► resolvePlanInputs ──┬─► { status: "complete", inputs }   (engine runs)
//                                └─► { status: "incomplete", missing } (UI says what to enter)
//
// The engine never sees `undefined`; this is where defaults are applied.

import {
  DEFAULT_ANNUAL_CONTRIBUTION,
  DEFAULT_CASH_BALANCE,
  DEFAULT_EXPECTED_RETURN,
  DEFAULT_INFLATION_RATE,
  DEFAULT_INTEREST_RATE,
  DEFAULT_PORTFOLIO_VALUE,
  DEFAULT_PROJECTION_END_AGE,
  DEFAULT_RETIREMENT_SPENDING,
  DEFAULT_SAFE_WITHDRAWAL_RATE,
  DEFAULT_SALARY_ANNUAL,
  DEFAULT_SALARY_GROWTH,
  DEFAULT_SUPER_BALANCE,
  DEFAULT_SUPER_CONTRIBUTION_ANNUAL,
  DEFAULT_SUPER_RETURN,
} from "./defaults";
import type {
  Plan,
  RetirementSpending,
  SalaryGrowth,
  Sourced,
  SuperAccount,
  SuperContribution,
} from "./types";

/** An input the user still has to provide. The UI maps `field` to the step where it is entered. */
export interface MissingInput {
  readonly field:
    | "livingExpenses"
    | "retirementSpending"
    | "currentAge"
    | "targetRetirementAge"
    | "projectionEndAge";
  readonly label: string;
}

/** A portfolio whose value has been resolved (default $0 if unset). */
export interface ResolvedPortfolio {
  readonly id: string;
  readonly name: string;
  readonly value: Sourced<number>;
}

/** A dated expense with its amount resolved (unset counts as $0). */
export interface ResolvedDatedExpense {
  readonly id: string;
  readonly name: string;
  /** Dollars per year in today's dollars. */
  readonly annual: Sourced<number>;
  readonly fromYear: number;
  readonly toYear: number;
}

/** A voluntary super contribution with its amount resolved; the years stay optional (see `SuperContribution`). */
export interface ResolvedSuperContribution {
  readonly annual: Sourced<number>;
  /** `undefined` means from next year. */
  readonly fromYear?: number;
  /** `undefined` means to the retirement year, so the earliest-retirement search can follow the age it tries. */
  readonly toYear?: number;
}

/** The super account with defaults applied (IN-21 to IN-23). */
export interface ResolvedSuperAccount {
  readonly balance: Sourced<number>;
  /** Return net of fees, a fraction (default 7%). */
  readonly returnRate: Sourced<number>;
  /**
   * The user's employer rate, or `undefined` with source "rule" when it is
   * left to the law: the rate then comes from each row's rules.
   */
  readonly employerRate: Sourced<number | undefined>;
  readonly salarySacrifice: ResolvedSuperContribution;
  readonly nonConcessional: ResolvedSuperContribution;
  /** The user's earnings tax rate, or `undefined` with source "rule" for the legislated rate. */
  readonly earningsTaxRate: Sourced<number | undefined>;
}

/**
 * The inputs the year-by-year projection needs, all resolved. M2 has one
 * person and one portfolio, so these come from the first of each.
 */
export interface ResolvedProjectionInputs {
  readonly currentAge: Sourced<number>;
  readonly targetRetirementAge: Sourced<number>;
  readonly inflationRate: Sourced<number>;
  readonly expectedReturn: Sourced<number>;
  /** Dollars per year, the same every year. */
  readonly annualContribution: Sourced<number>;
  /** The last age in which a contribution is made; defaults to the target retirement age. */
  readonly contributionsStopAge: Sourced<number>;
  /** The age the projection runs until (default 95). */
  readonly endAge: Sourced<number>;
  /** General interest rate on cash, a fraction (default 4%). */
  readonly interestRate: Sourced<number>;
  /** Dated and one-off expenses, in the order entered. */
  readonly datedExpenses: readonly ResolvedDatedExpense[];
  /** Gross salary per year today (default $0). */
  readonly salaryAnnual: Sourced<number>;
  /** How the salary grows (default: with inflation). */
  readonly salaryGrowth: Sourced<SalaryGrowth>;
  /** The super account (default: empty, $0). */
  readonly superAccount: ResolvedSuperAccount;
  /**
   * The age the person wants super accessible from, or `undefined` with
   * source "rule" when left to the law: the default is then the unconditional
   * release age from the rules (65). The engine clamps a user value between the
   * preservation age and that age, because both come from the rules data.
   */
  readonly superAccessAge: Sourced<number | undefined>;
}

/**
 * The projection has its own "complete" level, separate from M1's: the FI
 * number needs only living expenses, but the projection also needs both ages.
 */
export type ResolvedProjection =
  | { readonly status: "complete"; readonly inputs: ResolvedProjectionInputs }
  | { readonly status: "incomplete"; readonly missing: readonly MissingInput[] };

/** Complete inputs for the engine: every value filled in, each tagged with its source. */
export interface ResolvedPlanInputs {
  readonly livingAnnual: Sourced<number>;
  readonly retirementSpending: Sourced<RetirementSpending>;
  readonly safeWithdrawalRate: Sourced<number>;
  readonly portfolios: readonly ResolvedPortfolio[];
  /** Cash savings in today's dollars (default $0). */
  readonly cashBalance: Sourced<number>;
  readonly projection: ResolvedProjection;
}

/** The result of resolving: either everything needed, or what is missing. */
export type ResolvedPlan =
  | { readonly status: "complete"; readonly inputs: ResolvedPlanInputs }
  | { readonly status: "incomplete"; readonly missing: readonly MissingInput[] };

/**
 * Applies the defaults to a plan, or reports which required inputs are missing.
 *
 * Called by `summarisePlan` (src/engine/fiNumber.ts) at the start of every
 * calculation. Living expenses are the only input whose absence makes the
 * whole result incomplete; missing ages only make `projection` incomplete.
 */
export function resolvePlanInputs(plan: Plan): ResolvedPlan {
  const { livingAnnual, retirementSpending } = plan.expenses;
  const { safeWithdrawalRate } = plan.assumptions;

  // No default exists for living expenses, so an unset value stops the calculation.
  if (livingAnnual === undefined) {
    return {
      status: "incomplete",
      missing: [{ field: "livingExpenses", label: "Living expenses" }],
    };
  }

  const portfolios = plan.portfolios.map((portfolio): ResolvedPortfolio => ({
    id: portfolio.id,
    name: portfolio.name,
    value: sourceOrDefault(portfolio.value, DEFAULT_PORTFOLIO_VALUE),
  }));

  return {
    status: "complete",
    inputs: {
      livingAnnual: { value: livingAnnual, source: "input" },
      retirementSpending: sourceOrDefault(retirementSpending, DEFAULT_RETIREMENT_SPENDING),
      safeWithdrawalRate: sourceOrDefault(safeWithdrawalRate, DEFAULT_SAFE_WITHDRAWAL_RATE),
      portfolios,
      cashBalance: sourceOrDefault(plan.cash?.balance, DEFAULT_CASH_BALANCE),
      projection: resolveProjectionInputs(plan),
    },
  };
}

/**
 * Resolves the projection inputs: the two ages (no defaults, so they can be
 * reported missing) plus inflation, return, contribution, stop age, end age,
 * interest rate and dated expenses, which have defaults.
 *
 * Also validates the ages against the plan-until age: it must be after the
 * current age, and the retirement age must be before it. These are reported
 * as missing inputs, because the engine never throws on user data.
 *
 * Called by `resolvePlanInputs`. Uses the first person and first portfolio,
 * because M2 supports exactly one of each.
 */
function resolveProjectionInputs(plan: Plan): ResolvedProjection {
  const person = plan.household.people[0];
  const portfolio = plan.portfolios[0];

  const currentAge = person?.currentAge;
  const targetRetirementAge = person?.targetRetirementAge;

  const missing: MissingInput[] = [];

  if (currentAge === undefined) {
    missing.push({ field: "currentAge", label: "Current age" });
  }
  if (targetRetirementAge === undefined) {
    missing.push({ field: "targetRetirementAge", label: "Target retirement age" });
  }

  // Only compare the ages once both are known.
  if (
    currentAge !== undefined &&
    targetRetirementAge !== undefined &&
    targetRetirementAge < currentAge
  ) {
    missing.push({
      field: "targetRetirementAge",
      label: "Target retirement age must be at or after your current age",
    });
  }

  const endAge = sourceOrDefault(plan.household.projectionEndAge, DEFAULT_PROJECTION_END_AGE);

  if (currentAge !== undefined && endAge.value <= currentAge) {
    missing.push({
      field: "projectionEndAge",
      label: "Plan until age must be after your current age",
    });
  }
  if (targetRetirementAge !== undefined && targetRetirementAge >= endAge.value) {
    missing.push({
      field: "targetRetirementAge",
      label: "Target retirement age must be before your plan-until age",
    });
  }

  if (currentAge === undefined || targetRetirementAge === undefined || missing.length > 0) {
    return { status: "incomplete", missing };
  }

  return {
    status: "complete",
    inputs: {
      currentAge: { value: currentAge, source: "input" },
      targetRetirementAge: { value: targetRetirementAge, source: "input" },
      inflationRate: sourceOrDefault(plan.assumptions.inflationRate, DEFAULT_INFLATION_RATE),
      expectedReturn: sourceOrDefault(portfolio?.expectedReturn, DEFAULT_EXPECTED_RETURN),
      annualContribution: sourceOrDefault(
        portfolio?.annualContribution,
        DEFAULT_ANNUAL_CONTRIBUTION,
      ),
      // Depends on another input, so it can't be a constant in defaults.ts.
      contributionsStopAge: sourceOrDefault(portfolio?.contributionsStopAge, targetRetirementAge),
      endAge,
      interestRate: sourceOrDefault(plan.assumptions.interestRate, DEFAULT_INTEREST_RATE),
      datedExpenses: (plan.expenses.datedExpenses ?? []).map((expense): ResolvedDatedExpense => ({
        id: expense.id,
        name: expense.name,
        // An amount not typed yet counts as $0.
        annual: {
          value: expense.annual ?? 0,
          source: expense.annual === undefined ? "default" : "input",
        },
        fromYear: expense.fromYear,
        toYear: expense.toYear,
      })),
      salaryAnnual: sourceOrDefault(person?.salary?.annual, DEFAULT_SALARY_ANNUAL),
      salaryGrowth: sourceOrDefault(person?.salary?.growth, DEFAULT_SALARY_GROWTH),
      superAccount: resolveSuperAccount(person?.superAccount),
      superAccessAge:
        person?.superAccessAge === undefined
          ? { value: undefined, source: "rule" }
          : { value: person.superAccessAge, source: "input" },
    },
  };
}

/**
 * Applies the super defaults (IN-21 to IN-23). The employer rate and the
 * earnings tax rate left unset resolve to `undefined` with source "rule": the
 * projection then reads the legislated rate for each row from the rules data.
 * Called by `resolveProjectionInputs`.
 */
function resolveSuperAccount(account: SuperAccount | undefined): ResolvedSuperAccount {
  const resolveContribution = (
    contribution: SuperContribution | undefined,
  ): ResolvedSuperContribution => ({
    annual: sourceOrDefault(contribution?.annual, DEFAULT_SUPER_CONTRIBUTION_ANNUAL),
    ...(contribution?.fromYear !== undefined ? { fromYear: contribution.fromYear } : {}),
    ...(contribution?.toYear !== undefined ? { toYear: contribution.toYear } : {}),
  });

  const sourceOrRule = (userValue: number | undefined): Sourced<number | undefined> =>
    userValue === undefined
      ? { value: undefined, source: "rule" }
      : { value: userValue, source: "input" };

  return {
    balance: sourceOrDefault(account?.balance, DEFAULT_SUPER_BALANCE),
    returnRate: sourceOrDefault(account?.returnRate, DEFAULT_SUPER_RETURN),
    employerRate: sourceOrRule(account?.employerRate),
    salarySacrifice: resolveContribution(account?.salarySacrifice),
    nonConcessional: resolveContribution(account?.nonConcessional),
    earningsTaxRate: sourceOrRule(account?.earningsTaxRate),
  };
}

/** Uses the user's value when set, otherwise the default, and records which one was used. */
function sourceOrDefault<Value>(userValue: Value | undefined, defaultValue: Value): Sourced<Value> {
  return userValue === undefined
    ? { value: defaultValue, source: "default" }
    : { value: userValue, source: "input" };
}
