import { DEFAULT_PORTFOLIO_VALUE } from "../../plan/defaults";
import { usePlan, usePlanDispatch } from "../../plan/PlanProvider";
import { Card } from "../components/Card";
import { MoneyField } from "../components/MoneyField";
import { TextField } from "../components/TextField";

/**
 * Form section for IN-14: the name and current value of the household's share
 * portfolio. M1 has exactly one portfolio, so this edits the first one;
 * several portfolios arrive in later milestones. Used by the Assets screen.
 * An unset value shows the $0 default in the dashed style.
 */
export function PortfolioSection() {
  const plan = usePlan();
  const dispatch = usePlanDispatch();

  const portfolio = plan.portfolios[0];

  // Nothing to edit if the plan has no portfolio (createNewPlan always makes one).
  if (portfolio === undefined) {
    return null;
  }

  return (
    <Card title="Share portfolio">
      <TextField
        label="Name"
        value={portfolio.name}
        onChange={(name) => dispatch({ type: "renamePortfolio", portfolioId: portfolio.id, name })}
      />

      <MoneyField
        label="Current value"
        value={portfolio.value}
        defaultValue={DEFAULT_PORTFOLIO_VALUE}
        onChange={(value) =>
          dispatch({ type: "setPortfolioValue", portfolioId: portfolio.id, value })
        }
      />
    </Card>
  );
}
