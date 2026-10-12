import { DEFAULT_INFLATION_RATE, DEFAULT_PROJECTION_END_AGE } from "../../plan/defaults";
import { usePlan, usePlanDispatch, usePlanStartYear } from "../../plan/PlanProvider";
import { bundledRuleSet } from "../../rules/bundledRuleSet";
import { rulesForYear } from "../../rules/ruleSet";
import { AgeField } from "../components/AgeField";
import { Card } from "../components/Card";

/**
 * Form section for IN-2, IN-3, IN-4 and IN-5: the person's current age, the age they
 * plan to retire, the age they want super accessible from (limits and default
 * read from the rules for the start year, never typed here) and the age the plan runs until (a household setting, shown
 * here because it is about the same timeline). M2 has exactly one person, so this edits the first one;
 * couples arrive in M7. Used by the Household screen. The current and
 * retirement ages have no default: without them the year-by-year projection can't run, and the
 * engine reports them as missing inputs (see resolvePlanInputs). An unset
 * "Plan until age" shows the default of 95 in the dashed style.
 */
export function PersonAgesSection() {
  const plan = usePlan();
  const dispatch = usePlanDispatch();

  const person = plan.household.people[0];
  const startYear = usePlanStartYear();

  // The preservation age and the unconditional release age bound the access age and give its default.
  const superRules = rulesForYear(
    bundledRuleSet,
    startYear,
    plan.assumptions.inflationRate ?? DEFAULT_INFLATION_RATE,
  ).superannuation;

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

      <AgeField
        label="Super accessible at"
        value={person.superAccessAge}
        defaultValue={superRules.unconditionalReleaseAgeYears}
        min={superRules.preservationAgeYears}
        max={superRules.unconditionalReleaseAgeYears}
        hint="Usually 65. You can choose 60 to 64 if you'll have retired by then; super opens when you retire, or at 65 regardless."
        onChange={(age) => dispatch({ type: "setSuperAccessAge", personId: person.id, age })}
      />

      <AgeField
        label="Plan until age"
        value={plan.household.projectionEndAge}
        defaultValue={DEFAULT_PROJECTION_END_AGE}
        min={50}
        max={110}
        hint="The projection runs to this age."
        onChange={(age) => dispatch({ type: "setProjectionEndAge", age })}
      />
    </Card>
  );
}
