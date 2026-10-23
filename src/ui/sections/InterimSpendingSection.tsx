import { defaultInterimSpending } from "../../plan/interimDefault";
import { displayName } from "../../plan/displayName";
import { formatDollars } from "../format";
import { usePlan, usePlanDispatch } from "../../plan/PlanProvider";
import { Card } from "../components/Card";
import { MoneyField } from "../components/MoneyField";

/**
 * Form section for EXP-2, the rest of it: for a couple, how much is drawn from
 * savings each year (in today's dollars) while one of them has retired and
 * the other has not. Shown only for a couple, next to "Spending in
 * retirement" on Income & expenses; with one person there is no such period,
 * so it renders nothing. Unset it shows the default, which depends on the
 * partner who retires later: $0 if they have a salary (their pay is assumed
 * to cover spending, as in working years, until tax and take-home pay arrive
 * in M8), otherwise the retirement spending, because nothing else would pay
 * for it. The rule lives in `defaultInterimSpending`, shared with the engine
 * inputs so the text here always matches the figure used.
 */
export function InterimSpendingSection() {
  const plan = usePlan();
  const dispatch = usePlanDispatch();

  if (plan.household.people.length < 2) {
    return null;
  }

  const interimDefault = defaultInterimSpending(plan);
  const people = plan.household.people;

  // Only worded when the default follows retirement spending (the later partner has no salary).
  const laterName =
    interimDefault.laterPerson !== undefined && interimDefault.laterIndex !== undefined
      ? displayName(interimDefault.laterPerson, interimDefault.laterIndex, people)
      : undefined;
  const amountWords =
    interimDefault.amount === undefined
      ? "The same as retirement spending"
      : `${formatDollars(interimDefault.amount)}, the same as retirement spending`;
  const defaultText =
    interimDefault.followsRetirementSpending && laterName !== undefined
      ? `${amountWords}, because ${laterName} has no salary`
      : undefined;

  return (
    <Card title="Spending while one of you has retired">
      <MoneyField
        label="Drawn from savings while one of you is retired"
        value={plan.expenses.interimAnnual}
        defaultValue={interimDefault.amount ?? 0}
        defaultText={defaultText}
        min={0}
        hint="Per year, in today's dollars. The default is $0 when the partner still working has a salary: that pay is assumed to cover spending, as in working years, until tax and take-home pay arrive in a later version. If they have no salary, the default is the same as retirement spending."
        onChange={(annual) => dispatch({ type: "setInterimSpending", annual })}
      />
    </Card>
  );
}
