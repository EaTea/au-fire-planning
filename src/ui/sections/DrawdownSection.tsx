import { DEFAULT_SAFE_WITHDRAWAL_RATE } from "../../plan/defaults";
import { usePlan, usePlanDispatch } from "../../plan/PlanProvider";
import { Card } from "../components/Card";
import { PercentField } from "../components/PercentField";

/**
 * Form section for IN-10: the safe withdrawal rate used to turn retirement
 * spending into an FI number. Used by the Assumptions screen. An unset rate
 * shows the 4% default in the dashed style.
 */
export function DrawdownSection() {
  const plan = usePlan();
  const dispatch = usePlanDispatch();

  return (
    <Card title="Drawdown">
      <PercentField
        label="Safe withdrawal rate"
        value={plan.assumptions.safeWithdrawalRate}
        defaultValue={DEFAULT_SAFE_WITHDRAWAL_RATE}
        min={0.005}
        max={0.1}
        hint="FI number = retirement spending ÷ this rate"
        onChange={(rate) => dispatch({ type: "setSafeWithdrawalRate", rate })}
      />
    </Card>
  );
}
