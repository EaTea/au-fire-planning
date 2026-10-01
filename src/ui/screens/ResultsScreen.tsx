import { Link } from "react-router";

import { usePlanSummary } from "../../plan/PlanProvider";
import { Banner } from "../components/Banner";
import { MetricTile } from "../components/MetricTile";
import { StepPage } from "../components/StepPage";
import { formatDollars, formatPercent } from "../format";
import { steps } from "../navigation/steps";
import { missingInputSteps } from "./missingInputSteps";

const step = steps.find((candidate) => candidate.id === "results")!;

/**
 * The Results step (FIRE-1, FIRE-2): the FI number and progress to FI, each
 * with its breakdown, or a list of what's still missing, linked to the steps
 * where it is entered. Always shows what isn't modelled yet so the figures
 * aren't over-trusted. Reads the engine's summary via usePlanSummary(); routed
 * from App.
 */
export function ResultsScreen() {
  const summary = usePlanSummary();

  return (
    <StepPage
      step={step}
      intro="Your FI number: how much you need invested to fund your retirement, and how far along you are."
    >
      <div className="results-stack">
        {summary.status === "complete" ? (
          <>
            <MetricTile
              label="FI number"
              value={formatDollars(summary.fiNumber.value)}
              subLine={`${formatDollars(summary.retirementSpending.value)}/yr ÷ ${formatPercent(summary.safeWithdrawalRate)}`}
              explanation={summary.fiNumber}
            />

            <MetricTile
              label="Progress to FI"
              value={formatPercent(summary.progressToFi.value)}
              subLine={`${formatDollars(summary.investable.value)} invested of ${formatDollars(summary.fiNumber.value)}`}
              explanation={summary.progressToFi}
            />
          </>
        ) : (
          <Banner tone="warning">
            <div>
              <p className="banner-heading">Enter these to see your results:</p>
              <ul className="banner-list">
                {summary.missing.map((missingInput) => {
                  const targetStep = steps.find(
                    (candidate) => candidate.id === missingInputSteps[missingInput.field],
                  )!;

                  return (
                    <li key={missingInput.field}>
                      <Link to={targetStep.path}>
                        {missingInput.label} → {targetStep.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </Banner>
        )}

        <Banner tone="info">
          Not yet modelled: growth over time and retirement age (M2), super (M5), tax (M8), property
          (M12) and more. These figures use today&apos;s spending and today&apos;s portfolio only.
        </Banner>
      </div>
    </StepPage>
  );
}
