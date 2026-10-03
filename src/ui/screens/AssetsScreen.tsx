import { StepPage } from "../components/StepPage";
import { steps } from "../navigation/steps";
import { CashSection } from "../sections/CashSection";
import { PortfolioSection } from "../sections/PortfolioSection";

const step = steps.find((candidate) => candidate.id === "assets")!;

/**
 * The Assets step: the share portfolio, its expected return and contributions, and cash savings. A page layout around
 * self-contained sections; routed from App.
 */
export function AssetsScreen() {
  return (
    <StepPage
      step={step}
      intro="What you own today that will fund your retirement: your shares and cash."
    >
      <PortfolioSection />
      <CashSection />
    </StepPage>
  );
}
