import {
  DEFAULT_ANNUAL_CONTRIBUTION,
  DEFAULT_EXPECTED_RETURN,
  DEFAULT_PORTFOLIO_VALUE,
} from "../../plan/defaults";
import { usePlan, usePlanDispatch } from "../../plan/PlanProvider";
import { AgeField } from "../components/AgeField";
import { Card } from "../components/Card";
import { MoneyField } from "../components/MoneyField";
import { PercentField } from "../components/PercentField";
import { TextField } from "../components/TextField";

/**
 * Form section for IN-14, IN-15 and IN-18: the name, current value, expected
 * return and regular contributions of the household's share portfolio. There
 * is exactly one portfolio so far, so this edits the first one; several
 * arrive in later milestones. Used by the Assets screen. Unset values show
 * their defaults in the dashed style; the age contributions stop defaults to
 * the person's target retirement age (the same fallback resolvePlanInputs
 * uses), and shows no default while that age isn't set.
 */
export function PortfolioSection() {
  const plan = usePlan();
  const dispatch = usePlanDispatch();

  const portfolio = plan.portfolios[0];
  const targetRetirementAge = plan.household.people[0]?.targetRetirementAge;

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

      <PercentField
        label="Expected return per year"
        value={portfolio.expectedReturn}
        defaultValue={DEFAULT_EXPECTED_RETURN}
        min={0}
        max={0.15}
        hint="Total return before inflation: growth plus dividends."
        onChange={(rate) =>
          dispatch({ type: "setExpectedReturn", portfolioId: portfolio.id, rate })
        }
      />

      <MoneyField
        label="Contributions per year"
        value={portfolio.annualContribution}
        defaultValue={DEFAULT_ANNUAL_CONTRIBUTION}
        min={0}
        hint="The same dollar amount every year, until the age below."
        onChange={(annual) =>
          dispatch({ type: "setAnnualContribution", portfolioId: portfolio.id, annual })
        }
      />

      <AgeField
        label="Contributions stop at age"
        value={portfolio.contributionsStopAge}
        defaultValue={targetRetirementAge}
        min={15}
        max={100}
        onChange={(age) =>
          dispatch({ type: "setContributionsStopAge", portfolioId: portfolio.id, age })
        }
      />
    </Card>
  );
}
