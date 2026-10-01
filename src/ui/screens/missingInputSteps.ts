/**
 * Maps each input the engine can report as missing to the step where the user
 * enters it. Lives in the UI (not the engine) because the engine names the
 * field but must never import UI code. Used by ResultsScreen to turn the
 * "missing inputs" list into links.
 */

import type { MissingInput } from "../../plan/resolvePlanInputs";
import type { StepId } from "../navigation/steps";

/** The step that edits each missing-able field; both M1 fields are on Income & expenses. */
export const missingInputSteps: Record<MissingInput["field"], StepId> = {
  livingExpenses: "income-expenses",
  retirementSpending: "income-expenses",
};
