import { describe, expect, it } from "vitest";

import { findStepByPath, getNeighbouringSteps, steps } from "./steps";

// Tests for the step list that drives the router, header and Back/Next links.
describe("steps", () => {
  // Guards the single source of truth: six steps, numbered in order.
  it("has six steps numbered 1 to 6 in order", () => {
    expect(steps).toHaveLength(6);
    expect(steps.map((step) => step.number)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  // Duplicate ids or paths would make two steps indistinguishable to the router.
  it("has unique ids and paths", () => {
    expect(new Set(steps.map((step) => step.id)).size).toBe(steps.length);
    expect(new Set(steps.map((step) => step.path)).size).toBe(steps.length);
  });
});

describe("findStepByPath", () => {
  // A known path resolves to its step; an unknown one to nothing.
  it("finds a step by its path and returns undefined for unknown paths", () => {
    expect(findStepByPath("/results")?.label).toBe("Results");
    expect(findStepByPath("/nowhere")).toBeUndefined();
    // Year by year is a section of Results now, not a step (its old route redirects in App).
    expect(findStepByPath("/year-by-year")).toBeUndefined();
  });
});

describe("getNeighbouringSteps", () => {
  // The first step has nothing before it.
  it("has no previous step before step 1", () => {
    const { previous, next } = getNeighbouringSteps("household");

    expect(previous).toBeUndefined();
    expect(next?.id).toBe("income-expenses");
  });

  // The last step has nothing after it.
  it("has no next step after step 6", () => {
    const { previous, next } = getNeighbouringSteps("scenarios");

    expect(previous?.id).toBe("results");
    expect(next).toBeUndefined();
  });

  // A middle step has both neighbours.
  it("returns both neighbours for a middle step", () => {
    const { previous, next } = getNeighbouringSteps("assets");

    expect(previous?.id).toBe("income-expenses");
    expect(next?.id).toBe("assumptions");
  });
});
