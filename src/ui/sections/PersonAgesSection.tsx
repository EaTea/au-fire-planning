import { DEFAULT_INFLATION_RATE, DEFAULT_PROJECTION_END_AGE } from "../../plan/defaults";
import { displayName } from "../../plan/displayName";
import { usePlan, usePlanDispatch, usePlanStartYear } from "../../plan/PlanProvider";
import type { Person } from "../../plan/types";
import { bundledRuleSet } from "../../rules/bundledRuleSet";
import { rulesForYear } from "../../rules/ruleSet";
import { AgeField } from "../components/AgeField";
import { Card } from "../components/Card";
import { TextField } from "../components/TextField";

/** The longest name accepted, so a name still fits in a label and a card title. */
const MAXIMUM_NAME_LENGTH = 40;

/**
 * Form section for IN-2, IN-3, IN-4 and IN-5: each person's name, current
 * age, the age they plan to retire and the age they want super accessible
 * from (limits and default read from the rules for the start year, never
 * typed here), and the age the plan runs until (a household setting, shown
 * here because it is about the same timeline). Used by the Household screen.
 *
 *   one person:  one "About you" card (name, ages, plan until)
 *   a couple:    a card for each person, side by side on wide screens,
 *                then a "Planning horizon" card with the plan-until age
 *
 * The current and retirement ages have no default: without them the
 * year-by-year projection can't run, and the engine reports them as missing
 * inputs (see resolvePlanInputs). An unset "Plan until age" shows the default
 * of 95 in the dashed style.
 */
export function PersonAgesSection() {
  const plan = usePlan();
  const startYear = usePlanStartYear();

  const people = plan.household.people;
  const [firstPerson] = people;

  // Nothing to edit if the plan has no person (createNewPlan always makes one).
  if (firstPerson === undefined) {
    return null;
  }

  // One person keeps the single "About you" card, as it has always been.
  if (people.length === 1) {
    return (
      <Card title="About you">
        <PersonFields person={firstPerson} personIndex={0} isCouple={false} />
        <PlanUntilField />
      </Card>
    );
  }

  const youngest = youngestPerson(people);
  const endAge = plan.household.projectionEndAge ?? DEFAULT_PROJECTION_END_AGE;

  // "{younger} reaches this age" needs the younger person's age; without it there is no note.
  const youngestAge = youngest?.person.currentAge;
  const yearsToEnd = youngestAge === undefined ? undefined : endAge - youngestAge;

  return (
    <>
      <div className="person-cards">
        {people.map((person, personIndex) => (
          <Card key={person.id} title={displayName(person, personIndex, plan.household.people)}>
            <PersonFields person={person} personIndex={personIndex} isCouple />
          </Card>
        ))}
      </div>

      <Card title="Planning horizon">
        <PlanUntilField />

        {youngest !== undefined && yearsToEnd !== undefined && yearsToEnd > 0 && (
          <p className="horizon-note">
            The plan runs until {displayName(youngest.person, youngest.index, people)} reaches this
            age: {yearsToEnd} years, to {startYear + yearsToEnd}.
          </p>
        )}
      </Card>
    </>
  );
}

/**
 * The younger person with a known age (the first on a tie), and their
 * position, or `undefined` when nobody has an age yet. The plan runs until
 * this person reaches the plan-until age. Used by PersonAgesSection for the
 * couple note.
 */
function youngestPerson(
  people: readonly Person[],
): { readonly person: Person; readonly index: number } | undefined {
  let youngest: { person: Person; index: number } | undefined;

  for (const [index, person] of people.entries()) {
    if (person.currentAge === undefined) continue;

    if (youngest === undefined || person.currentAge < (youngest.person.currentAge ?? Infinity)) {
      youngest = { person, index };
    }
  }

  return youngest;
}

/** What PersonFields needs: the person, their position and whether the household is a couple. */
interface PersonFieldsProps {
  readonly person: Person;
  readonly personIndex: number;
  /** In a couple every label is prefixed with the person's name so it stays unique on the page. */
  readonly isCouple: boolean;
}

/**
 * One person's fields: name, current age, target retirement age and the age
 * super becomes accessible. With one person the labels are the plain ones;
 * with a couple each reads "Alex: Current age" (the name field uses the fixed
 * "Person 1" so its label doesn't change as the name is typed). Used by
 * PersonAgesSection for each person.
 */
function PersonFields({ person, personIndex, isCouple }: PersonFieldsProps) {
  const plan = usePlan();
  const dispatch = usePlanDispatch();
  const startYear = usePlanStartYear();

  // The preservation age and the unconditional release age bound the access age and give its default.
  const superRules = rulesForYear(
    bundledRuleSet,
    startYear,
    plan.assumptions.inflationRate ?? DEFAULT_INFLATION_RATE,
  ).superannuation;

  const fieldLabel = (label: string): string =>
    isCouple ? `${displayName(person, personIndex, plan.household.people)}: ${label}` : label;

  return (
    <>
      <TextField
        label={isCouple ? `Person ${personIndex + 1}: Name (optional)` : "Name (optional)"}
        value={person.name ?? ""}
        hint="Used for labels only."
        maxLength={MAXIMUM_NAME_LENGTH}
        onChange={(name) => dispatch({ type: "setPersonName", personId: person.id, name })}
      />

      <AgeField
        label={fieldLabel("Current age")}
        value={person.currentAge}
        min={15}
        max={99}
        hint={
          isCouple
            ? "Only age is stored, not date of birth."
            : "Only your age is stored, not your date of birth."
        }
        onChange={(age) => dispatch({ type: "setCurrentAge", personId: person.id, age })}
      />

      <AgeField
        label={fieldLabel("Target retirement age")}
        value={person.targetRetirementAge}
        min={18}
        max={100}
        onChange={(age) => dispatch({ type: "setTargetRetirementAge", personId: person.id, age })}
      />

      <AgeField
        label={fieldLabel("Super accessible at")}
        value={person.superAccessAge}
        defaultValue={superRules.unconditionalReleaseAgeYears}
        min={superRules.preservationAgeYears}
        max={superRules.unconditionalReleaseAgeYears}
        hint={
          isCouple
            ? "Usually 65. 60 to 64 is possible if they will have retired by then; super opens at retirement, or at 65 regardless."
            : "Usually 65. You can choose 60 to 64 if you'll have retired by then; super opens when you retire, or at 65 regardless."
        }
        onChange={(age) => dispatch({ type: "setSuperAccessAge", personId: person.id, age })}
      />
    </>
  );
}

/**
 * The household's "Plan until age" field: the projection runs to this age
 * (for a couple, until the younger person reaches it). Shown unset as the
 * default of 95. Used by PersonAgesSection, inside the one-person card or the
 * couple's "Planning horizon" card.
 */
function PlanUntilField() {
  const plan = usePlan();
  const dispatch = usePlanDispatch();

  return (
    <AgeField
      label="Plan until age"
      value={plan.household.projectionEndAge}
      defaultValue={DEFAULT_PROJECTION_END_AGE}
      min={50}
      max={110}
      hint="The projection runs to this age."
      onChange={(age) => dispatch({ type: "setProjectionEndAge", age })}
    />
  );
}
