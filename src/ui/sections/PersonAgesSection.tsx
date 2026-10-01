import { usePlan, usePlanDispatch } from "../../plan/PlanProvider";
import { AgeField } from "../components/AgeField";
import { Card } from "../components/Card";

/**
 * Form section for IN-2 and IN-3: the person's current age and the age they
 * plan to retire. M2 has exactly one person, so this edits the first one;
 * couples arrive in M7. Used by the Household screen. Neither age has a
 * default: without them the year-by-year projection can't run, and the
 * engine reports them as missing inputs (see resolvePlanInputs).
 */
export function PersonAgesSection() {
  const plan = usePlan();
  const dispatch = usePlanDispatch();

  const person = plan.household.people[0];

  // Nothing to edit if the plan has no person (createNewPlan always makes one).
  if (person === undefined) {
    return null;
  }

  return (
    <Card title="About you">
      <AgeField
        label="Current age"
        value={person.currentAge}
        min={15}
        max={99}
        hint="Only your age is stored, not your date of birth."
        onChange={(age) => dispatch({ type: "setCurrentAge", personId: person.id, age })}
      />

      <AgeField
        label="Target retirement age"
        value={person.targetRetirementAge}
        min={18}
        max={100}
        onChange={(age) => dispatch({ type: "setTargetRetirementAge", personId: person.id, age })}
      />
    </Card>
  );
}
