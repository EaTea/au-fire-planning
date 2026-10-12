import { fc, test } from "@fast-check/vitest";
import { expect } from "vitest";

import { drawSuperProRata, type NonEmptyList } from "./projection";

// Property-based tests for splitting a year's draw between people's super
// (M7 decision 2): whatever the balances, the shares add up to exactly what
// was drawn, and nobody is drawn below $0.

/** A person's available super in cents (so it looks like money and doesn't line up neatly in binary), and whether it is open. */
const candidateArbitrary = fc.record({
  available: fc.integer({ min: 0, max: 200_000_000 }).map((cents) => cents / 100),
  accessible: fc.boolean(),
});

/** One to four candidates, as a non-empty list. */
const candidatesArbitrary = fc
  .tuple(candidateArbitrary, fc.array(candidateArbitrary, { maxLength: 3 }))
  .map(([first, others]): NonEmptyList<typeof first> => [first, ...others]);

test.prop([
  candidatesArbitrary,
  fc.integer({ min: 0, max: 300_000_000 }).map((cents) => cents / 100),
])(
  "the shares add up exactly to the amount drawn, and no balance goes negative",
  (candidates, amountNeeded) => {
    const drawings = drawSuperProRata(amountNeeded, candidates);

    const accessibleTotal = candidates.reduce(
      (total, candidate) => total + (candidate.accessible ? candidate.available : 0),
      0,
    );
    const expectedTotal = accessibleTotal > 0 ? Math.min(amountNeeded, accessibleTotal) : 0;

    // Added in person order from 0, as the projection adds them. Exact for a
    // household of up to two people (the most the app allows); within a
    // rounding error beyond that.
    const drawnTotal = drawings.reduce((total, drawing) => total + drawing.drawn, 0);
    if (candidates.length <= 2) {
      expect(drawnTotal).toBe(expectedTotal);
    } else {
      expect(drawnTotal).toBeCloseTo(expectedTotal, 6);
    }

    for (const drawing of drawings) {
      const drawable = drawing.accessible ? drawing.available : 0;

      expect(drawing.drawn).toBeGreaterThanOrEqual(0);
      expect(drawing.drawn).toBeLessThanOrEqual(drawable);
      expect(drawing.available - drawing.drawn).toBeGreaterThanOrEqual(0);
    }
  },
);
