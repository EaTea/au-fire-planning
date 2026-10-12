// Tells whether the user has entered anything, so "Start over" (the logo in
// AppShell) can skip its confirmation when there is nothing to lose.

import { createNewPlan } from "./createNewPlan";
import type { Plan } from "./types";

/**
 * True when the plan is the same as a fresh `createNewPlan` plan apart from
 * its generated ids.
 *
 * Used by AppShell before starting over: a blank plan is reset without asking,
 * anything else needs the user's confirmation. Values cleared back to "not set"
 * (stored as `undefined`) and lists emptied again (such as dated expenses
 * added then removed) count as blank, because clearing them loses nothing.
 */
export function isBlankPlan(plan: Plan): boolean {
  const freshPlan = createNewPlan(() => "");

  return describeContent(plan) === describeContent(freshPlan);
}

/**
 * Turns a plan into a string of only what the user can see and lose: ids are
 * dropped, as are unset values and empty lists. Object keys are sorted so the
 * order fields were set in doesn't matter. Only used by `isBlankPlan`.
 */
function describeContent(plan: Plan): string {
  return JSON.stringify(withoutIdsOrEmptyValues(plan));
}

/** Recursive helper for `describeContent`: copies a JSON-like value without ids, unset values or empty lists. */
function withoutIdsOrEmptyValues(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(withoutIdsOrEmptyValues);
  }

  if (value === null || typeof value !== "object") {
    return value;
  }

  const kept: Record<string, unknown> = {};
  const sortedKeys = Object.keys(value).sort();

  for (const key of sortedKeys) {
    const fieldValue = (value as Record<string, unknown>)[key];

    const isGeneratedId = key === "id";
    const isUnset = fieldValue === undefined;
    const isEmptyList = Array.isArray(fieldValue) && fieldValue.length === 0;
    if (isGeneratedId || isUnset || isEmptyList) continue;

    kept[key] = withoutIdsOrEmptyValues(fieldValue);
  }

  return kept;
}
