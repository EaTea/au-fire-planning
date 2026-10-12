import { StepPage } from "../components/StepPage";
import { steps } from "../navigation/steps";
import { HouseholdSection } from "../sections/HouseholdSection";
import { PersonAgesSection } from "../sections/PersonAgesSection";

const step = steps.find((candidate) => candidate.id === "household")!;

/**
 * The Household step: just you or a couple, each person's name and ages, and the age the plan runs
 * until. A page layout around self-contained sections; routed from App, and the page the welcome
 * screen's "Start planning" leads to.
 */
export function HouseholdScreen() {
  return (
    <StepPage
      step={step}
      intro="Who the plan is for. Your ages set how long your money has to grow."
    >
      <div className="household-stack">
        <HouseholdSection />
        <PersonAgesSection />
      </div>
    </StepPage>
  );
}
