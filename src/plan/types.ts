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
}

/** One share portfolio. M1 has exactly one; several arrive in later milestones. */
export interface Portfolio {
  readonly id: string;
  readonly name: string;
  /** Current value in today's dollars. `undefined` means "not set" (default $0). */
  readonly value?: number;
}

/** How retirement spending is expressed: a dollar amount or a share of today's spending. */
export type RetirementSpending =
  | { readonly kind: "amount"; readonly annual: number } // dollars per year
  | { readonly kind: "percentOfToday"; readonly fraction: number }; // e.g. 0.9 for 90%

/** Everything the user has entered. Unset values are `undefined`. */
export interface Plan {
  /** M1: exactly one person. */
  readonly household: { readonly people: readonly Person[] };
  readonly expenses: {
    /** Dollars per year, after tax. No default: without it nothing can be calculated. */
    readonly livingAnnual?: number;
    readonly retirementSpending?: RetirementSpending;
  };
  readonly assumptions: {
    /** A fraction, e.g. 0.04 for 4%. */
    readonly safeWithdrawalRate?: number;
  };
  /** M1: exactly one portfolio. */
  readonly portfolios: readonly Portfolio[];
}

/** Where a resolved value came from: typed in by the user, or filled in from the defaults. */
export type ValueSource = "input" | "default";

/** A resolved value together with where it came from, so explanations can say so. */
export interface Sourced<Value> {
  readonly value: Value;
  readonly source: ValueSource;
}
