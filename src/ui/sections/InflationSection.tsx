import { DEFAULT_INFLATION_RATE } from "../../plan/defaults";
import { usePlan, usePlanDispatch } from "../../plan/PlanProvider";
import { Card } from "../components/Card";
import { PercentField } from "../components/PercentField";

/**
 * Form section for IN-11: the yearly inflation rate. It grows spending and
 * the FI number over time (EXP-3) and converts results to today's dollars
 * (OUT-2). Used by the Assumptions screen. An unset rate shows the 2.5%
 * default in the dashed style.
 */
export function InflationSection() {
  const plan = usePlan();
  const dispatch = usePlanDispatch();

  return (
    <Card title="Inflation">
      <PercentField
        label="Inflation per year"
        value={plan.assumptions.inflationRate}
        defaultValue={DEFAULT_INFLATION_RATE}
        min={0}
        max={0.15}
        hint="Grows your spending and FI number, and converts results to today's dollars."
        onChange={(rate) => dispatch({ type: "setInflationRate", rate })}
      />
    </Card>
  );
}
