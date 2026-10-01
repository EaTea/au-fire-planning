import { Link } from "react-router";

import type { MissingInput } from "../../plan/resolvePlanInputs";
import { Banner } from "../components/Banner";
import { steps } from "../navigation/steps";
import { missingInputSteps } from "./missingInputSteps";

/**
 * Lists inputs the user still has to enter, each linked to the step where it
 * is entered. Used by ResultsScreen and YearByYearScreen for both the M1
 * inputs (living expenses) and the projection's ages.
 */
export function MissingInputsBanner({ missing }: { readonly missing: readonly MissingInput[] }) {
  return (
    <Banner tone="warning">
      <div>
        <p className="banner-heading">Enter these to see your results:</p>
        <ul className="banner-list">
          {missing.map((missingInput) => {
            const targetStep = steps.find(
              (candidate) => candidate.id === missingInputSteps[missingInput.field],
            )!;

            return (
              <li key={missingInput.label}>
                <Link to={targetStep.path}>
                  {missingInput.label} → {targetStep.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </Banner>
  );
}
