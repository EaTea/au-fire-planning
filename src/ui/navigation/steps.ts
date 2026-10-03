/**
 * The six steps of the app, defined once. The router (src/ui/App.tsx), the
 * header navigation (StepNav), the Back/Next footer (StepPage) and the
 * placeholder screens all derive from this list, so adding or reordering a
 * step happens here and nowhere else.
 */

/** Identifies one step; also the last segment of the step's route. */
export type StepId =
  "household" | "income-expenses" | "assets" | "assumptions" | "results" | "scenarios";

/** One step of the planning journey, as shown in the header and routed to. */
export interface Step {
  /** Position in the journey, starting at 1. Shown in the header pill. */
  readonly number: number;
  readonly id: StepId;
  /** Short name used in the header, page title and Back/Next links. */
  readonly label: string;
  /** Route path within the hash router, e.g. "/household". */
  readonly path: string;
  /** Milestone in PLAN.md that replaces the placeholder with the real page. */
  readonly arrivesIn: string;
}

/** The ordered list of steps (see the table in PLAN.md, "The steps, in one place"). */
export const steps: readonly Step[] = [
  { number: 1, id: "household", label: "Household", path: "/household", arrivesIn: "M2" },
  {
    number: 2,
    id: "income-expenses",
    label: "Income & expenses",
    path: "/income-expenses",
    arrivesIn: "M1",
  },
  { number: 3, id: "assets", label: "Assets", path: "/assets", arrivesIn: "M1" },
  {
    number: 4,
    id: "assumptions",
    label: "Assumptions",
    path: "/assumptions",
    arrivesIn: "M1",
  },
  { number: 5, id: "results", label: "Results", path: "/results", arrivesIn: "M1" },
  { number: 6, id: "scenarios", label: "Scenarios", path: "/scenarios", arrivesIn: "M16" },
];

/** The step the app opens on, and where unknown routes redirect to. */
export const firstStep: Step = steps[0] as Step;

/**
 * Looks up the step for a router path such as "/results". Used where only the
 * current location is known. Returns undefined for paths that aren't a step.
 */
export function findStepByPath(path: string): Step | undefined {
  return steps.find((step) => step.path === path);
}

/**
 * Finds the steps either side of the given one, for the Back/Next footer in
 * StepPage. `previous` is absent on the first step and `next` on the last.
 */
export function getNeighbouringSteps(stepId: StepId): { previous?: Step; next?: Step } {
  const index = steps.findIndex((step) => step.id === stepId);

  if (index === -1) {
    return {};
  }

  const previous = steps[index - 1];
  const next = steps[index + 1];

  return {
    ...(previous !== undefined && { previous }),
    ...(next !== undefined && { next }),
  };
}
