import {
  DEFAULT_ANNUAL_CONTRIBUTION,
  DEFAULT_EXPECTED_RETURN,
  DEFAULT_PORTFOLIO_VALUE,
} from "../../plan/defaults";
import { displayName } from "../../plan/displayName";
import { usePlan, usePlanDispatch } from "../../plan/PlanProvider";
import { resolveOwnerIds } from "../../plan/resolvePlanInputs";
import { AgeField } from "../components/AgeField";
import { Card } from "../components/Card";
import { MoneyField } from "../components/MoneyField";
import { OwnershipField } from "../components/OwnershipField";
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
 *
 * For a couple it adds who owns the portfolio (`OwnershipField`), and the stop
 * age says whose age it is measured on, the first owner's, with a default of
 * "when you've both retired" (joint) or "when {name} retires" (sole). With one
 * person the card is as it always was.
 */
export function PortfolioSection() {
  const plan = usePlan();
  const dispatch = usePlanDispatch();

  const portfolio = plan.portfolios[0];
  const people = plan.household.people;
  const isCouple = people.length > 1;

  // The stop age is measured on the first owner (Person 1 for a joint portfolio).
  const ownerIds = resolveOwnerIds(portfolio?.ownership, people);
  const firstOwnerIndex = Math.max(
    0,
    people.findIndex((person) => person.id === ownerIds[0]),
  );
  const firstOwner = people[firstOwnerIndex];
  const targetRetirementAge = firstOwner?.targetRetirementAge;

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

      {isCouple && (
        <OwnershipField
          label="Share portfolio owner"
          people={people}
          value={portfolio.ownership}
          onChange={(ownership) =>
            dispatch({ type: "setPortfolioOwnership", portfolioId: portfolio.id, ownership })
          }
        />
      )}

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
        label={
          isCouple && firstOwner !== undefined
            ? `Contributions stop at ${displayName(firstOwner, firstOwnerIndex)}'s age`
            : "Contributions stop at age"
        }
        value={portfolio.contributionsStopAge}
        defaultValue={targetRetirementAge}
        {...(isCouple && firstOwner !== undefined
          ? {
              defaultText:
                ownerIds.length > 1
                  ? "when you've both retired"
                  : `when ${displayName(firstOwner, firstOwnerIndex)} retires`,
            }
          : {})}
        min={15}
        max={100}
        onChange={(age) =>
          dispatch({ type: "setContributionsStopAge", portfolioId: portfolio.id, age })
        }
      />
    </Card>
  );
}
