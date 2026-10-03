// The earliest feasible retirement age (FIRE-3): the first age at which, if
// you retired then, the money would last to the end age.
//
//   for each age from today up to the year before the end age:
//     projectPortfolio (retirement age = tried age) ─► assessSolvency
//        runs out ─► try the next age
//        lasts    ─► that is the answer
//
// It reuses `projectPortfolio` and `assessSolvency`, so every rule about
// spending, cash and shortfalls lives in one place. Retiring later never makes
// a plan less solvent (fewer years of withdrawals, and with the default stop
// age, more contributions), so the first solvent age is the earliest.
//
// Pure, like the rest of the engine. Called by `summariseProjection`
// (src/engine/fiNumber.ts).

import type { Explained, ExplanationLine } from "./explained";
import { projectPortfolio, type ProjectionInputs } from "./projection";
import { assessSolvency, type Solvency } from "./solvency";

/**
 * What the search needs: the projection inputs, plus whether the contribution
 * stop age follows the retirement age being tried. `inputs.retirementAge`
 * is ignored, because the search supplies each candidate age itself.
 */
export interface EarliestRetirementInputs extends ProjectionInputs {
  /**
   * True when the user left the stop age unset (its source is "default"), so
   * each tried retirement age also becomes the stop age. False keeps the stop
   * age the user entered.
   */
  readonly contributionsStopAgeFollowsRetirementAge: boolean;
}

/** The answer to "when could I retire?", with the working behind it. */
export type EarliestRetirement =
  | {
      readonly status: "feasible";
      readonly age: number;
      /** The calendar year that age is reached. */
      readonly year: number;
      /** The last failed age and why (if any), the first age that lasts, then the answer. */
      readonly explanation: Explained;
    }
  | {
      /** No age from today to the end age keeps the money lasting. */
      readonly status: "notFeasible";
      /** Why the last age tried, the end age, still runs short. */
      readonly explanation: Explained;
    };

/**
 * Tries each retirement age from the current age up to the end age, in order,
 * and returns the first one whose projection has no shortfall year.
 *
 * Runs at most about 80 short projections, which is instant. If no age works
 * (for example a dated expense bigger than everything you will ever have), it
 * returns `notFeasible`. Never throws on user data.
 */
export function findEarliestRetirementAge(
  inputs: EarliestRetirementInputs,
  startYear: number,
): EarliestRetirement {
  let lastFailure: { readonly age: number; readonly solvency: Solvency } | undefined;

  for (let candidateAge = inputs.currentAge; candidateAge < inputs.endAge; candidateAge++) {
    const solvency = solvencyWhenRetiringAt(inputs, candidateAge, startYear);

    if (solvency.status === "runsOut") {
      lastFailure = { age: candidateAge, solvency };
      continue;
    }

    const year = startYear + (candidateAge - inputs.currentAge);
    const lines: ExplanationLine[] = [];

    if (lastFailure !== undefined) {
      lines.push(describeFailure(lastFailure.age, lastFailure.solvency));
    }

    lines.push({
      label: `Retiring at ${candidateAge}: lasts to age ${inputs.endAge}`,
      value: solvency.explanation.value,
      unit: "dollars",
      source: "calculated",
    });
    lines.push({
      label: "Earliest feasible retirement age",
      value: candidateAge,
      unit: "years",
      operator: "=",
      source: "calculated",
    });

    return {
      status: "feasible",
      age: candidateAge,
      year,
      explanation: { value: candidateAge, unit: "years", lines },
    };
  }

  // Every age failed, so the loop recorded end age − 1 as the last failure.
  const failure = lastFailure?.solvency;

  return {
    status: "notFeasible",
    explanation: {
      value: failure?.explanation.value ?? 0,
      unit: "dollars",
      lines:
        lastFailure === undefined ? [] : [describeFailure(lastFailure.age, lastFailure.solvency)],
    },
  };
}

/**
 * Projects the plan as if retired at `retirementAge`, and assesses whether the
 * money lasts. The stop age follows the retirement age only when the user
 * didn't enter one.
 */
function solvencyWhenRetiringAt(
  inputs: EarliestRetirementInputs,
  retirementAge: number,
  startYear: number,
): Solvency {
  const rows = projectPortfolio(
    {
      ...inputs,
      retirementAge,
      contributionsStopAge: inputs.contributionsStopAgeFollowsRetirementAge
        ? retirementAge
        : inputs.contributionsStopAge,
    },
    startYear,
  );

  return assessSolvency(rows);
}

/**
 * One line saying a retirement age fails: "Retiring at 42: runs short in 2085
 * (age 93)", valued at that year's shortfall. A solvent result can't be
 * described this way, so it is shown as a zero shortfall defensively.
 */
function describeFailure(retirementAge: number, solvency: Solvency): ExplanationLine {
  if (solvency.status === "lasts") {
    return {
      label: `Retiring at ${retirementAge}: lasts`,
      value: 0,
      unit: "dollars",
      source: "calculated",
    };
  }

  return {
    label: `Retiring at ${retirementAge}: runs short in ${solvency.year} (age ${solvency.age})`,
    value: solvency.explanation.value,
    unit: "dollars",
    source: "calculated",
  };
}
