import { DEFAULT_INTERIM_SPENDING } from "../../plan/defaults";
import { usePlan, usePlanDispatch } from "../../plan/PlanProvider";
import { Card } from "../components/Card";
import { MoneyField } from "../components/MoneyField";

/**
 * Form section for EXP-2, the rest of it: for a couple, how much is drawn from
 * savings each year (in today's dollars) while one of them has retired and
 * the other has not. Shown only for a couple, next to "Spending in
 * retirement" on Income & expenses; with one person there is no such period,
 * so it renders nothing. Unset it shows the default, $0, and the hint says why
 * that is the default: the working partner's pay is assumed to cover spending,
 * as in working years, until tax and take-home pay arrive (M8).
 */
export function InterimSpendingSection() {
  const plan = usePlan();
  const dispatch = usePlanDispatch();

  if (plan.household.people.length < 2) {
    return null;
  }

  return (
    <Card title="Spending while one of you has retired">
      <MoneyField
        label="Drawn from savings while one of you is retired"
        value={plan.expenses.interimAnnual}
        defaultValue={DEFAULT_INTERIM_SPENDING}
        min={0}
        hint="Per year, in today's dollars. The default of $0 assumes the partner still working covers spending, as in working years, until tax and take-home pay arrive in a later version."
        onChange={(annual) => dispatch({ type: "setInterimSpending", annual })}
      />
    </Card>
  );
}
