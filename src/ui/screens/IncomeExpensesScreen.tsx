import { StepPage } from "../components/StepPage";
import { steps } from "../navigation/steps";
import { DatedExpensesSection } from "../sections/DatedExpensesSection";
import { LivingExpensesSection } from "../sections/LivingExpensesSection";
import { RetirementSpendingSection } from "../sections/RetirementSpendingSection";
import { SalarySection } from "../sections/SalarySection";

const step = steps.find((candidate) => candidate.id === "income-expenses")!;

/**
 * The Income & expenses step: salary, today's living expenses, retirement
 * spending and dated expenses. A page layout around self-contained sections; routed from App.
 */
export function IncomeExpensesScreen() {
  return (
    <StepPage
      step={step}
      intro="What your household earns, what it spends in a year, after tax, and what you expect to spend in retirement."
    >
      <SalarySection />
      <LivingExpensesSection />
      <RetirementSpendingSection />
      <DatedExpensesSection />
    </StepPage>
  );
}
