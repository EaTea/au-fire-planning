import { StepPage } from "../components/StepPage";
import { steps } from "../navigation/steps";
import { DrawdownSection } from "../sections/DrawdownSection";
import { InflationSection } from "../sections/InflationSection";

const step = steps.find((candidate) => candidate.id === "assumptions")!;

/**
 * The Assumptions step: inflation and the drawdown rule. A page layout around
 * self-contained sections; routed from App.
 */
export function AssumptionsScreen() {
  return (
    <StepPage
      step={step}
      intro="The economic assumptions behind your plan. The defaults are a sensible starting point."
    >
      <InflationSection />
      <DrawdownSection />
    </StepPage>
  );
}
