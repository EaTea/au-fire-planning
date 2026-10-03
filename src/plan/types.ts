// Internal (in-memory) types for the user's plan.
//
// A `Plan` holds ONLY what the user has entered: anything they haven't set is
// `undefined`. That is deliberate. The UI shows a field as "default" when its
// value is `undefined`, and `resolvePlanInputs` (resolvePlanInputs.ts) is the
// single place that fills the gaps from `defaults.ts` before the engine runs.
//
//   UI edits ──► Plan (only user-entered values) ──► resolvePlanInputs ──► engine
//
// These are NOT the stored (wire) types; those live in src/persistence/ and are
// converted to and from these by explicit mapper functions.

/** One person in the household. M1 has exactly one; couples arrive in M7. */
export interface Person {
  readonly id: string;
  /** Display label, e.g. "Person 1". */
  readonly label: string;
  /** Age in whole years today. `undefined` means "not set" (no default). */
  readonly currentAge?: number;
  /** Age in whole years at which they plan to retire. `undefined` means "not set" (no default). */
  readonly targetRetirementAge?: number;
}

/** One share portfolio. M1 has exactly one; several arrive in later milestones. */
export interface Portfolio {
  readonly id: string;
  readonly name: string;
  /** Current value in today's dollars. `undefined` means "not set" (default $0). */
  readonly value?: number;
  /** Expected nominal total return as a fraction, e.g. 0.07. `undefined` means default (7%). */
  readonly expectedReturn?: number;
  /** Dollars added each year, the same amount every year (not indexed). `undefined` means default ($0). */
  readonly annualContribution?: number;
  /** Last age (whole years) in which a contribution is made. `undefined` means the target retirement age. */
  readonly contributionsStopAge?: number;
}

/** How retirement spending is expressed: a dollar amount or a share of today's spending. */
export type RetirementSpending =
  | { readonly kind: "amount"; readonly annual: number } // dollars per year
  | { readonly kind: "percentOfToday"; readonly fraction: number }; // e.g. 0.9 for 90%

/**
 * An expense that happens in a range of calendar years (EXP-6), such as a car
 * replacement or school fees. Drawn from savings in each year it applies,
 * including before retirement. A one-off has `fromYear === toYear`.
 */
export interface DatedExpense {
  readonly id: string;
  /** Display name, e.g. "Replace car". May be "". */
  readonly name: string;
  /** Dollars per year in today's dollars (grown by inflation). `undefined` counts as $0. */
  readonly annual?: number;
  /** First calendar year it applies. Set when the row is added. */
  readonly fromYear: number;
  /** Last calendar year it applies (inclusive); at least `fromYear`. */
  readonly toYear: number;
}

/** Everything the user has entered. Unset values are `undefined`. */
export interface Plan {
  /** M1: exactly one person. */
  readonly household: {
    readonly people: readonly Person[];
    /** Age in whole years the plan runs until (IN-4). `undefined` means default (95). */
    readonly projectionEndAge?: number;
  };
  /** Cash savings (IN-26). `undefined` means no cash entered (default $0). */
  readonly cash?: {
    /** Dollars today. `undefined` means default ($0). */
    readonly balance?: number;
  };
  readonly expenses: {
    /** Dollars per year, after tax. No default: without it nothing can be calculated. */
    readonly livingAnnual?: number;
    readonly retirementSpending?: RetirementSpending;
    /** Dated and one-off expenses (EXP-6). `undefined` means none. */
    readonly datedExpenses?: readonly DatedExpense[];
  };
  readonly assumptions: {
    /** A fraction, e.g. 0.04 for 4%. */
    readonly safeWithdrawalRate?: number;
    /** A fraction, e.g. 0.025 for 2.5%. `undefined` means default (2.5%). */
    readonly inflationRate?: number;
    /** General interest rate on cash (IN-12) as a fraction. `undefined` means default (4%). */
    readonly interestRate?: number;
  };
  /** M1: exactly one portfolio. */
  readonly portfolios: readonly Portfolio[];
}

/**
 * Where a resolved value came from: typed in by the user, filled in from the
 * defaults, or set by the law (a statutory rate from the rules data, NFR-3).
 */
export type ValueSource = "input" | "default" | "rule";

/** A resolved value together with where it came from, so explanations can say so. */
export interface Sourced<Value> {
  readonly value: Value;
  readonly source: ValueSource;
}
