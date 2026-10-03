import { StepPage } from "../components/StepPage";
import type { Step, StepId } from "../navigation/steps";

/**
 * One-sentence purpose of each step, taken from the mockups in
 * requirements/mockups/. Shown on the placeholder until the real page arrives.
 */
const stepPurposes: Record<StepId, string> = {
  household: "Who the plan is for: ages, retirement ages and when super becomes accessible.",
  "income-expenses": "What comes in and what you spend, entered as after-tax spending.",
  assets: "What you own and owe: your home, shares, investment property, super, cash and debts.",
  assumptions:
    "The economic assumptions and rules that drive the projection, with sensible defaults.",
  results: "Your FI and Coast FIRE numbers, milestones and charts, then every year of the plan.",
  scenarios: "Saved variations of your plan compared side by side.",
};

/**
 * Stand-in page for a step whose real screen hasn't been built yet. Rendered
 * by one route per step in App; each milestone replaces the placeholder with
 * the real screen for that step.
 */
export function PlaceholderScreen({ step }: { readonly step: Step }) {
  return (
    <StepPage step={step} intro={stepPurposes[step.id]}>
      <p className="placeholder-note">Arrives in milestone {step.arrivesIn}</p>
    </StepPage>
  );
}
