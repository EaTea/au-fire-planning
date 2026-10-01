import { StepPage } from "../components/StepPage";
import { steps } from "../navigation/steps";
import { LivingExpensesSection } from "../sections/LivingExpensesSection";
import { RetirementSpendingSection } from "../sections/RetirementSpendingSection";

const step = steps.find((candidate) => candidate.id === "income-expenses")!;

/**
 * The Income & expenses step: today's living expenses and retirement
 * spending. A page layout around two self-contained sections; routed from App.
 */
export function IncomeExpensesScreen() {
  return (
    <StepPage
      step={step}
      intro="What your household spends in a year, after tax, and what you expect to spend in retirement."
    >
      <LivingExpensesSection />
      <RetirementSpendingSection />
    </StepPage>
  );
}
