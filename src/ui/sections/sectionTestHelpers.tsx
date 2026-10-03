// Shared helper for the section tests: renders a section inside a real
// PlanProvider and shows the plan as JSON, so a test can check both what the
// field displays and what ended up in the plan.

import { render } from "@testing-library/react";
import type { ReactElement } from "react";

import { PlanProvider, usePlan } from "../../plan/PlanProvider";
import type { Plan } from "../../plan/types";

/** A plan with one person and one portfolio and nothing entered, with fixed ids. */
export const blankPlan: Plan = {
  household: { people: [{ id: "person-1", label: "Person 1" }] },
  expenses: {},
  assumptions: {},
  portfolios: [{ id: "portfolio-1", name: "Share portfolio" }],
};

/** Writes the current plan into the page so tests can read it back with `readPlan`. */
function PlanDump() {
  return <pre data-testid="plan-dump">{JSON.stringify(usePlan())}</pre>;
}

/** Renders `section` (with the clock fixed in 2026) with the given starting plan; returns `readPlan` for assertions on the plan. */
export function renderSection(section: ReactElement, initialPlan: Plan = blankPlan) {
  const rendered = render(
    <PlanProvider initialPlan={initialPlan} startYear={2026}>
      {section}
      <PlanDump />
    </PlanProvider>,
  );

  /** The plan as it is now, parsed back from the page. */
  function readPlan(): Plan {
    return JSON.parse(rendered.getByTestId("plan-dump").textContent ?? "") as Plan;
  }

  return { ...rendered, readPlan };
}
