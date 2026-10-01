import { StepPage } from "../components/StepPage";
import { steps } from "../navigation/steps";
import { PersonAgesSection } from "../sections/PersonAgesSection";

const step = steps.find((candidate) => candidate.id === "household")!;

/**
 * The Household step: your current and target retirement ages. A page layout
 * around self-contained sections; routed from App, and the page the welcome
 * screen's "Start planning" leads to.
 */
export function HouseholdScreen() {
  return (
    <StepPage
      step={step}
      intro="Who the plan is for. Your ages set how long your money has to grow."
    >
      <PersonAgesSection />
    </StepPage>
  );
}
