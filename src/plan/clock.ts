// The app's only source of "today". The engine never reads the clock; the UI
// reads it here and passes the calendar year into `summarisePlan`, so
// calculations stay deterministic and tests can fix the year.
//
//   Clock ──► currentCalendarYear ──► PlanProvider (startYear) ──► summarisePlan

/** Something that can say what the date is now. Tests pass a fixed one. */
export interface Clock {
  /** The current date and time. */
  now(): Date;
}

/** The real clock, backed by the browser's `Date`. Used by `PlanProvider` unless told otherwise. */
export const systemClock: Clock = {
  now: () => new Date(),
};

/**
 * The current calendar year according to the clock, e.g. 2026. It becomes row
 * 0 of the projection (see `PlanProvider`).
 */
export function currentCalendarYear(clock: Clock = systemClock): number {
  return clock.now().getFullYear();
}
