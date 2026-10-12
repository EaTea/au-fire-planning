import { usePlan, usePlanDispatch, usePlanIdGenerator } from "../../plan/PlanProvider";
import { Card } from "../components/Card";
import { SegmentedToggle } from "../components/SegmentedToggle";

/** The two choices of the toggle: you on your own, or you and a partner. */
type HouseholdChoice = "single" | "couple";

/**
 * The "Household" card (IN-1): a "Just me / A couple" toggle at the top of the
 * Household screen. Choosing "A couple" adds Person 2 with nothing set, so
 * their ages become required inputs; choosing "Just me" removes Person 2 and
 * everything entered for them, which the hint says because there is no undo
 * until M16. Used by HouseholdScreen. The new partner's id comes from the
 * plan provider's generator, like every id the plan creates.
 */
export function HouseholdSection() {
  const plan = usePlan();
  const dispatch = usePlanDispatch();
  const generateId = usePlanIdGenerator();

  const isCouple = plan.household.people.length > 1;

  /** Adds or removes the partner so the plan matches the chosen option; choosing the current option does nothing. */
  function chooseHousehold(choice: HouseholdChoice) {
    if (choice === "couple" && !isCouple) {
      dispatch({ type: "addPartner", id: generateId() });
    }
    if (choice === "single" && isCouple) {
      dispatch({ type: "removePartner" });
    }
  }

  return (
    <Card title="Household">
      <div className="household-toggle-row">
        <SegmentedToggle<HouseholdChoice>
          label="Who is this plan for"
          options={[
            { value: "single", label: "Just me" },
            { value: "couple", label: "A couple" },
          ]}
          value={isCouple ? "couple" : "single"}
          onChange={chooseHousehold}
        />

        <span className="hint">
          {isCouple
            ? "Choosing Just me removes Person 2 and everything entered for them. A shared portfolio goes back to Person 1. There is no undo yet."
            : "A couple adds a second person with their own salary and super."}
        </span>
      </div>
    </Card>
  );
}
