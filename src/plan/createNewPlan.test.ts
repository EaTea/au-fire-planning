import { describe, expect, it } from "vitest";

import { createNewPlan } from "./createNewPlan";

// Tests for the blank plan a first-time visitor starts with.
describe("createNewPlan", () => {
  // The starting plan must have one labelled person and one named portfolio, with nothing entered.
  it("has one person, one portfolio and nothing else set", () => {
    let counter = 0;
    const plan = createNewPlan(() => `id-${++counter}`);

    expect(plan).toEqual({
      household: { people: [{ id: "id-1", label: "Person 1" }] },
      expenses: {},
      assumptions: {},
      portfolios: [{ id: "id-2", name: "Share portfolio" }],
    });
  });
});
