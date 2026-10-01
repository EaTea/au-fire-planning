// Builds the blank plan a first-time visitor starts with.

import type { Plan } from "./types";

/**
 * Creates a new plan with one person ("Person 1") and one portfolio
 * ("Share portfolio"), and nothing else set.
 *
 * Used by the plan provider (and the storage layer) when no saved plan exists.
 * IDs are injected rather than generated here, so tests can be deterministic;
 * production passes `() => crypto.randomUUID()`.
 */
export function createNewPlan(generateId: () => string): Plan {
  return {
    household: { people: [{ id: generateId(), label: "Person 1" }] },
    expenses: {},
    assumptions: {},
    portfolios: [{ id: generateId(), name: "Share portfolio" }],
  };
}
