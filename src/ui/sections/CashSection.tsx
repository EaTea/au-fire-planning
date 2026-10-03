import { DEFAULT_CASH_BALANCE } from "../../plan/defaults";
import { usePlan, usePlanDispatch } from "../../plan/PlanProvider";
import { Card } from "../components/Card";
import { MoneyField } from "../components/MoneyField";

/**
 * Form section for IN-26: the household's cash savings today, as one balance.
 * It earns the general interest rate (Assumptions) and is spent before the
 * portfolio in retirement (the projection's drawdown order). Used by the
 * Assets screen. An unset balance shows the $0 default in the dashed style.
 */
export function CashSection() {
  const plan = usePlan();
  const dispatch = usePlanDispatch();

  return (
    <Card title="Cash">
      <MoneyField
        label="Cash savings"
        value={plan.cash?.balance}
        defaultValue={DEFAULT_CASH_BALANCE}
        min={0}
        hint="Earns the general interest rate (Assumptions). Spent before the portfolio in retirement."
        onChange={(balance) => dispatch({ type: "setCashBalance", balance })}
      />
    </Card>
  );
}
