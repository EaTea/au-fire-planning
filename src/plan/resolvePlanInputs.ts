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
  Person,
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
 * One person's inputs, resolved: their ages, salary, super account and
 * access age, each `Sourced` where a default may have been applied. There is
 * one of these for every person in the plan, in the plan's order.
 */
export interface ResolvedPerson {
  readonly id: string;
  /** The plan's display label, e.g. "Person 1". */
  readonly label: string;
  readonly currentAge: Sourced<number>;
  readonly targetRetirementAge: Sourced<number>;
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
 * The inputs the year-by-year projection needs, all resolved: one
 * `ResolvedPerson` for each person, and the household-wide values (the
 * rates, the portfolio's contributions, the plan-until age and the dated
 * expenses). The portfolio values come from the first portfolio, because
 * only one is supported until M9.
 */
export interface ResolvedProjectionInputs {
  /** Everyone in the plan, in order; always at least one. */
  readonly people: readonly [ResolvedPerson, ...ResolvedPerson[]];
  readonly inflationRate: Sourced<number>;
  readonly expectedReturn: Sourced<number>;
  /** Dollars per year, the same every year. */
  readonly annualContribution: Sourced<number>;
  /**
   * The last age in which a contribution is made, measured on the first
   * owner; defaults to that owner's target retirement age (source "default").
   */
  readonly contributionsStopAge: Sourced<number>;
  /** Who owns the portfolio, by person id. Until ownership is stored (M7 step 4) that is the first person. */
  readonly portfolioOwnerIds: readonly string[];
  /** The age the projection runs until, measured on the youngest person (default 95). */
  readonly endAge: Sourced<number>;
  /** General interest rate on cash, a fraction (default 4%). */
  readonly interestRate: Sourced<number>;
  /** Dated and one-off expenses, in the order entered. */
  readonly datedExpenses: readonly ResolvedDatedExpense[];
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
 * Resolves the projection inputs: each person's two ages (no defaults, so
 * they can be reported missing) and the household-wide inflation, return,
 * contribution, stop age, end age, interest rate and dated expenses, which
 * have defaults. Each person's salary, super and access age are resolved by
 * `resolvePerson`.
 *
 * Also validates the ages against the plan-until age: it must be after the
 * youngest person's current age, and each retirement age must be before that
 * person's own last age. These are reported as missing inputs, because the
 * engine never throws on user data. With one person the labels read as they
 * always have ("Current age"); with several, each is prefixed with the
 * person's label ("Alex: Current age").
 *
 * Called by `resolvePlanInputs`. Uses the first portfolio, because only one
 * is supported until M9.
 */
function resolveProjectionInputs(plan: Plan): ResolvedProjection {
  const planPeople = plan.household.people;
  const portfolio = plan.portfolios[0];
  const endAge = sourceOrDefault(plan.household.projectionEndAge, DEFAULT_PROJECTION_END_AGE);

  const missing: MissingInput[] = [];

  // A plan with nobody in it is reported the way a first person with no ages is.
  if (planPeople.length === 0) {
    return {
      status: "incomplete",
      missing: [
        { field: "currentAge", label: "Current age" },
        { field: "targetRetirementAge", label: "Target retirement age" },
      ],
    };
  }

  /** Words a missing-input label with the person's name when there is more than one person. */
  const labelFor = (person: Person, text: string): string =>
    planPeople.length > 1 ? `${person.label}: ${text}` : text;

  // Each person's own ages: both must be there, and retirement can't be before today.
  for (const person of planPeople) {
    if (person.currentAge === undefined) {
      missing.push({ field: "currentAge", label: labelFor(person, "Current age") });
    }
    if (person.targetRetirementAge === undefined) {
      missing.push({
        field: "targetRetirementAge",
        label: labelFor(person, "Target retirement age"),
      });
    }

    // Only compare the ages once both are known.
    if (
      person.currentAge !== undefined &&
      person.targetRetirementAge !== undefined &&
      person.targetRetirementAge < person.currentAge
    ) {
      missing.push({
        field: "targetRetirementAge",
        label: labelFor(person, "Target retirement age must be at or after your current age"),
      });
    }
  }

  // The plan-until age is measured on the youngest person whose age is known.
  const knownCurrentAges = planPeople.flatMap((person) =>
    person.currentAge === undefined ? [] : [person.currentAge],
  );
  const youngestAge = knownCurrentAges.length === 0 ? undefined : Math.min(...knownCurrentAges);

  if (youngestAge !== undefined && endAge.value <= youngestAge) {
    missing.push({
      field: "projectionEndAge",
      label: "Plan until age must be after your current age",
    });
  }

  // Each person's last age is the plan-until age, moved by how much older than the youngest they are.
  for (const person of planPeople) {
    if (person.targetRetirementAge === undefined || person.currentAge === undefined) continue;
    if (youngestAge === undefined) continue;

    const personEndAge = endAge.value + (person.currentAge - youngestAge);
    if (person.targetRetirementAge >= personEndAge) {
      missing.push({
        field: "targetRetirementAge",
        label: labelFor(person, "Target retirement age must be before your plan-until age"),
      });
    }
  }

  // A person with an age missing resolves to nothing; the plan is then incomplete anyway.
  const resolvedPeople = planPeople.flatMap((person) => {
    const resolved = resolvePerson(person);

    return resolved === undefined ? [] : [resolved];
  });
  const [firstPerson, ...otherPeople] = resolvedPeople;

  if (missing.length > 0 || firstPerson === undefined) {
    return { status: "incomplete", missing };
  }

  return {
    status: "complete",
    inputs: {
      people: [firstPerson, ...otherPeople],
      inflationRate: sourceOrDefault(plan.assumptions.inflationRate, DEFAULT_INFLATION_RATE),
      expectedReturn: sourceOrDefault(portfolio?.expectedReturn, DEFAULT_EXPECTED_RETURN),
      annualContribution: sourceOrDefault(
        portfolio?.annualContribution,
        DEFAULT_ANNUAL_CONTRIBUTION,
      ),
      // Depends on another input, so it can't be a constant in defaults.ts.
      contributionsStopAge: sourceOrDefault(
        portfolio?.contributionsStopAge,
        firstPerson.targetRetirementAge.value,
      ),
      portfolioOwnerIds: [firstPerson.id],
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
    },
  };
}

/**
 * Resolves one person whose two ages are known (`resolveProjectionInputs`
 * has already reported anyone whose ages are missing): applies the salary,
 * super and access-age defaults. Returns `undefined` for a person with an age
 * missing, which the caller never uses because the plan is then incomplete.
 */
function resolvePerson(person: Person): ResolvedPerson | undefined {
  if (person.currentAge === undefined || person.targetRetirementAge === undefined) {
    return undefined;
  }

  return {
    id: person.id,
    label: person.label,
    currentAge: { value: person.currentAge, source: "input" },
    targetRetirementAge: { value: person.targetRetirementAge, source: "input" },
    salaryAnnual: sourceOrDefault(person.salary?.annual, DEFAULT_SALARY_ANNUAL),
    salaryGrowth: sourceOrDefault(person.salary?.growth, DEFAULT_SALARY_GROWTH),
    superAccount: resolveSuperAccount(person.superAccount),
    superAccessAge:
      person.superAccessAge === undefined
        ? { value: undefined, source: "rule" }
        : { value: person.superAccessAge, source: "input" },
  };
}

/**
 * Applies the super defaults (IN-21 to IN-23). The employer rate and the
 * earnings tax rate left unset resolve to `undefined` with source "rule": the
 * projection then reads the legislated rate for each row from the rules data.
 * Called by `resolvePerson`.
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
