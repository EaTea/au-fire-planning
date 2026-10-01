import { StepPage } from "../components/StepPage";
import { steps } from "../navigation/steps";
import { DrawdownSection } from "../sections/DrawdownSection";

const step = steps.find((candidate) => candidate.id === "assumptions")!;

/**
 * The Assumptions step: for now just the drawdown rule. A page layout around
 * self-contained sections; routed from App.
 */
export function AssumptionsScreen() {
  return (
    <StepPage
      step={step}
      intro="The rule that turns your retirement spending into an FI number. The default is a sensible starting point."
    >
      <DrawdownSection />
    </StepPage>
  );
}
