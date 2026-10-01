// The values used when the user hasn't set something (see resolvePlanInputs.ts).
// The UI also reads these to display the dashed "default" fields, so what the
// user sees and what the engine uses can't drift apart.
//
// Living expenses have no default on purpose: without them there is nothing to
// calculate.

import type { RetirementSpending } from "./types";

/** Safe withdrawal rate: 4% a year (a fraction). */
export const DEFAULT_SAFE_WITHDRAWAL_RATE = 0.04;

/** Retirement spending: 100% of today's living expenses. */
export const DEFAULT_RETIREMENT_SPENDING: RetirementSpending = {
  kind: "percentOfToday",
  fraction: 1,
};

/** Portfolio value: $0. */
export const DEFAULT_PORTFOLIO_VALUE = 0;
