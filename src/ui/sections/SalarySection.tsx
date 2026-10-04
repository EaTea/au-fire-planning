import { DEFAULT_SALARY_GROWTH } from "../../plan/defaults";
import { usePlan, usePlanDispatch } from "../../plan/PlanProvider";
import { Card } from "../components/Card";
import { GrowthRateField, type GrowthRateOption } from "../components/GrowthRateField";
import { MoneyField } from "../components/MoneyField";
import { PerPersonFields } from "../components/PerPersonFields";

/** Every way a salary can grow (IN-7), in the order the dropdown lists them. */
const SALARY_GROWTH_OPTIONS: readonly GrowthRateOption[] = [
  "inflation",
  "inflationPlus",
  "inflationMinus",
  "fixed",
  "none",
];

/**
 * Form section for IN-7: each person's gross (pre-tax) salary and how it
 * grows. Shown first on Income & expenses, as in mockup 02. The salary sets
 * employer super contributions (from M5 step 5) and appears in Year by year;
 * it doesn't pay for living expenses until tax arrives in M8, which the hint
 * says. Built with `PerPersonFields`, so a second person (M7) gets their own
 * named fields with no change here. Reads the plan with `usePlan()` and edits
 * it with `usePlanDispatch()`.
 */
export function SalarySection() {
  const plan = usePlan();
  const dispatch = usePlanDispatch();

  return (
    <Card title="Salary">
      <PerPersonFields people={plan.household.people}>
        {(person, fieldLabel) => (
          <>
            <MoneyField
              label={fieldLabel("Gross salary per year")}
              value={person.salary?.annual}
              hint="Before tax. Sets your employer super contributions; tax and take-home pay come in a later version."
              onChange={(annual) => dispatch({ type: "setSalary", personId: person.id, annual })}
            />

            <GrowthRateField
              label={fieldLabel("Grows at")}
              options={SALARY_GROWTH_OPTIONS}
              value={person.salary?.growth}
              defaultValue={DEFAULT_SALARY_GROWTH}
              numberLabel={fieldLabel}
              onChange={(growth) =>
                dispatch({ type: "setSalaryGrowth", personId: person.id, growth })
              }
            />
          </>
        )}
      </PerPersonFields>
    </Card>
  );
}
