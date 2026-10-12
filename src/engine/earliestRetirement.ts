// The earliest feasible retirement age (FIRE-3): the first age at which, if
// you retired then, the money would last to the end age.
//
//   for each age of one person, from today up to the year before their end age:
//     projectPortfolio (that person's retirement age = tried age,
//                       everyone else keeps their target) ─► assessSolvency
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
import {
  effectiveSuperAccessAge,
  inputsWithRetirementAge,
  projectPortfolio,
  youngestAgeAtRow,
  type ProjectionInputs,
} from "./projection";
import { assessSolvency, type Solvency } from "./solvency";

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
 * Tries each retirement age of one person (the first by default) from their
 * current age up to their end age, in order, and returns the first one whose
 * projection has no shortfall year. Everyone else keeps their target
 * retirement age. The portfolio's contributions follow the age being tried
 * when the stop rule is `whileWorking`, and stay put when it is `throughYear`.
 *
 * Runs at most about 80 short projections, which is instant. If no age works
 * (for example a dated expense bigger than everything you will ever have), it
 * returns `notFeasible`. Never throws on user data. Called by
 * `summariseProjection` (src/engine/fiNumber.ts).
 */
export function findEarliestRetirementAge(
  inputs: ProjectionInputs,
  startYear: number,
  personIndex: number = 0,
): EarliestRetirement {
  const person = inputs.people[personIndex] ?? inputs.people[0];
  const currentAge = person.currentAge;

  // The end age is measured on the youngest person; this person's own last age is the same row.
  const endAge = currentAge + (inputs.endAge - youngestAgeAtRow(inputs, 0));

  let lastFailure: { readonly age: number; readonly solvency: Solvency } | undefined;

  for (let candidateAge = currentAge; candidateAge < endAge; candidateAge++) {
    const solvency = solvencyWhenRetiringAt(inputs, personIndex, candidateAge, startYear);

    if (solvency.status === "runsOut") {
      lastFailure = { age: candidateAge, solvency };
      continue;
    }

    const year = startYear + (candidateAge - currentAge);
    const lines: ExplanationLine[] = [];

    if (lastFailure !== undefined) {
      lines.push(describeFailure(lastFailure.age, lastFailure.solvency));
    }

    lines.push({
      label: `Retiring at ${candidateAge}: lasts to age ${endAge}`,
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
 * Projects the plan as if the person retired at `retirementAge`, and assesses
 * whether the money lasts. Called by `findEarliestRetirementAge` for each
 * candidate age.
 */
function solvencyWhenRetiringAt(
  inputs: ProjectionInputs,
  personIndex: number,
  retirementAge: number,
  startYear: number,
): Solvency {
  const triedInputs = inputsWithRetirementAge(inputs, personIndex, retirementAge);
  const rows = projectPortfolio(triedInputs, startYear);

  // The access age depends on when the person retires, so it is worked out for the age being tried.
  const triedPerson = triedInputs.people[personIndex] ?? triedInputs.people[0];

  return assessSolvency(rows, effectiveSuperAccessAge(triedPerson, triedInputs, startYear));
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
