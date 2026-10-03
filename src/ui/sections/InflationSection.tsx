import { DEFAULT_INFLATION_RATE, DEFAULT_INTEREST_RATE } from "../../plan/defaults";
import { usePlan, usePlanDispatch } from "../../plan/PlanProvider";
import { Card } from "../components/Card";
import { PercentField } from "../components/PercentField";

/**
 * Form section for IN-11 and IN-12: the yearly inflation rate and the general
 * interest rate. Inflation grows spending and the FI number over time (EXP-3)
 * and converts results to today's dollars (OUT-2); the interest rate is paid
 * on cash savings. Used by the Assumptions screen. Unset rates show their
 * defaults (2.5% and 4%) in the dashed style.
 */
export function InflationSection() {
  const plan = usePlan();
  const dispatch = usePlanDispatch();

  return (
    <Card title="Economy">
      <PercentField
        label="Inflation per year"
        value={plan.assumptions.inflationRate}
        defaultValue={DEFAULT_INFLATION_RATE}
        min={0}
        max={0.15}
        hint="Grows your spending and FI number, and converts results to today's dollars."
        onChange={(rate) => dispatch({ type: "setInflationRate", rate })}
      />

      <PercentField
        label="General interest rate"
        value={plan.assumptions.interestRate}
        defaultValue={DEFAULT_INTEREST_RATE}
        min={0}
        max={0.15}
        hint="Paid on cash savings."
        onChange={(rate) => dispatch({ type: "setInterestRate", rate })}
      />
    </Card>
  );
}
