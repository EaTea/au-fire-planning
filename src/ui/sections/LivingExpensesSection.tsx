import { usePlan, usePlanDispatch } from "../../plan/PlanProvider";
import { Card } from "../components/Card";
import { MoneyField } from "../components/MoneyField";

/**
 * Form section for EXP-1: the household's living expenses today, as one
 * after-tax total per year. Reads the plan with `usePlan()` and edits it with
 * `usePlanDispatch()`, and has no page layout of its own, so the Income &
 * expenses screen (and later the M16 inputs panel) can place it anywhere.
 *
 * There is deliberately no default: without living expenses nothing can be
 * calculated, so an empty field is what makes Results ask for it.
 */
export function LivingExpensesSection() {
  const plan = usePlan();
  const dispatch = usePlanDispatch();

  return (
    <Card title="Living expenses today">
      <MoneyField
        label="Per year, after tax"
        value={plan.expenses.livingAnnual}
        min={1}
        hint="What your household spends in a year, after tax. Leave out mortgage repayments and rent: they come later."
        onChange={(annual) => dispatch({ type: "setLivingExpenses", annual })}
      />
    </Card>
  );
}
