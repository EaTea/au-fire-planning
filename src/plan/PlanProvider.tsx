// React context that holds the plan and makes it available to every screen.
//
//   PlanProvider
//     ├─ useReducer(planReducer) ──► plan      ──► usePlan()
//     ├─ useMemo(summarisePlan)  ──► summary   ──► usePlanSummary()
//     └─ dispatch                              ──► usePlanDispatch()
//
// Three separate contexts are used so a component that only dispatches (for
// example a form field) doesn't re-render when the plan changes.

import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";

import { summarisePlan, type PlanSummary } from "../engine/fiNumber";
import { currentCalendarYear } from "./clock";
import { createNewPlan } from "./createNewPlan";
import { planReducer, type PlanAction } from "./planReducer";
import type { Plan } from "./types";

const PlanContext = createContext<Plan | null>(null);
const PlanSummaryContext = createContext<PlanSummary | null>(null);
const PlanDispatchContext = createContext<Dispatch<PlanAction> | null>(null);

interface PlanProviderProps {
  /** The plan to start from. Defaults to a new blank plan (e.g. when no saved plan exists). */
  readonly initialPlan?: Plan;
  /**
   * The calendar year of row 0 of the projection. Defaults to the current year
   * from the clock; tests pass a fixed year (e.g. 2026) so results don't
   * depend on today's date.
   */
  readonly startYear?: number;
  readonly children: ReactNode;
}

/**
 * Wraps the app (see src/ui/App.tsx) so screens can read and edit the plan.
 *
 * The plan lives in memory only for now; saving to the browser arrives in
 * step 7. The summary is recomputed by the engine only when the plan changes.
 */
export function PlanProvider({ initialPlan, startYear, children }: PlanProviderProps) {
  // The third argument makes React build the blank plan once, not on every render.
  const [plan, dispatch] = useReducer(
    planReducer,
    initialPlan,
    (startingPlan) => startingPlan ?? createNewPlan(() => crypto.randomUUID()),
  );

  const resolvedStartYear = startYear ?? currentCalendarYear();

  const summary = useMemo(() => summarisePlan(plan, resolvedStartYear), [plan, resolvedStartYear]);

  return (
    <PlanDispatchContext.Provider value={dispatch}>
      <PlanContext.Provider value={plan}>
        <PlanSummaryContext.Provider value={summary}>{children}</PlanSummaryContext.Provider>
      </PlanContext.Provider>
    </PlanDispatchContext.Provider>
  );
}

/** Returns the current plan. Used by input screens to show what the user has entered. */
export function usePlan(): Plan {
  return requireContextValue(useContext(PlanContext), "usePlan");
}

/** Returns the engine's summary of the current plan. Used by the Results screen. */
export function usePlanSummary(): PlanSummary {
  return requireContextValue(useContext(PlanSummaryContext), "usePlanSummary");
}

/** Returns the function that applies a `PlanAction`. Used by input screens when the user edits a field. */
export function usePlanDispatch(): Dispatch<PlanAction> {
  return requireContextValue(useContext(PlanDispatchContext), "usePlanDispatch");
}

/** Fails loudly if a hook is used outside `PlanProvider`, rather than returning `null` to callers. */
function requireContextValue<Value>(value: Value | null, hookName: string): Value {
  if (value === null) {
    throw new Error(`${hookName} must be used inside a PlanProvider`);
  }

  return value;
}
