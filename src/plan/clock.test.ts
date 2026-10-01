import { describe, expect, it } from "vitest";

import { currentCalendarYear, systemClock } from "./clock";

// Tests for the clock the UI uses to find the start year.
describe("currentCalendarYear", () => {
  // A fixed clock gives a fixed year.
  it("reads the year from the given clock", () => {
    expect(currentCalendarYear({ now: () => new Date(2031, 5, 15) })).toBe(2031);
  });

  // With no clock given it uses the real one.
  it("defaults to the system clock", () => {
    expect(currentCalendarYear()).toBe(systemClock.now().getFullYear());
  });
});
