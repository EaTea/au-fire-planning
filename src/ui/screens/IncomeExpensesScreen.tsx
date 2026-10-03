import { StepPage } from "../components/StepPage";
import { steps } from "../navigation/steps";
import { DatedExpensesSection } from "../sections/DatedExpensesSection";
import { LivingExpensesSection } from "../sections/LivingExpensesSection";
import { RetirementSpendingSection } from "../sections/RetirementSpendingSection";

const step = steps.find((candidate) => candidate.id === "income-expenses")!;

/**
 * The Income & expenses step: today's living expenses, retirement
 * spending and dated expenses. A page layout around three self-contained sections; routed from App.
 */
export function IncomeExpensesScreen() {
  return (
    <StepPage
      step={step}
      intro="What your household spends in a year, after tax, and what you expect to spend in retirement."
    >
      <LivingExpensesSection />
      <RetirementSpendingSection />
      <DatedExpensesSection />
    </StepPage>
  );
}
