import { describe, expect, it } from "vitest";

import { summarisePlan } from "../../src/engine/fiNumber";
import { createNewPlan } from "../../src/plan/createNewPlan";
import type { Plan, RetirementSpending } from "../../src/plan/types";

// Checks the engine against the independently worked examples in
// tests/worked-examples/ (NFR-6). Every *.json file there is picked up, so a
// new milestone's fixture is tested just by adding the file.

/** The shape of a fixture file (see tests/worked-examples/README.md). */
interface WorkedExampleFile {
  readonly milestone: string;
  /** Calendar year of row 0 for the projection (M2 onwards); defaults to 2026. */
  readonly startYear?: number;
  readonly scenarios: readonly WorkedScenario[];
}

interface WorkedScenario {
  readonly name: string;
  readonly checkedBy: string;
  readonly inputs: {
    readonly livingExpensesAnnual: number | null;
    readonly retirementSpending?: RetirementSpending | null;
    readonly safeWithdrawalRate: number | null;
    readonly portfolioValue: number | null;
    // M2 onwards; absent means "left unset".
    readonly currentAge?: number;
    readonly targetRetirementAge?: number;
    readonly contributionsStopAge?: number;
    readonly expectedReturn?: number;
    readonly annualContribution?: number;
    readonly inflationRate?: number;
  };
  /** M1 figures: present in M1 fixtures only. */
  readonly expected: {
    readonly retirementSpendingAnnual?: number;
    readonly fiNumber?: number;
    readonly investable?: number;
    readonly progressToFi?: number;
    /** M2 figures: present in M2 fixtures only. */
    readonly rows?: readonly ExpectedRow[];
    /** `null` means FI is not reached by the end of the projection. */
    readonly fiReached?: ExpectedFiReached | null;
    readonly fiNumberAtRetirement?: number;
  };
}

/** The figures checked for one projection row; unlisted fields aren't checked. */
interface ExpectedRow {
  readonly yearIndex: number;
  readonly growth?: number;
  readonly contribution?: number;
  readonly closingBalance: number;
}

interface ExpectedFiReached {
  readonly yearIndex: number;
  readonly calendarYear: number;
  readonly age: number;
  readonly closingBalance: number;
  readonly fiNumber: number;
}

const fixtureFiles = import.meta.glob<WorkedExampleFile>("../worked-examples/*.json", {
  eager: true,
  import: "default",
});

/** Builds a plan from a fixture's inputs, where `null` means "left unset". */
function planFromScenario(inputs: WorkedScenario["inputs"]): Plan {
  let counter = 0;
  const blank = createNewPlan(() => `id-${++counter}`);

  const [person] = blank.household.people;
  const [portfolio] = blank.portfolios;
  if (person === undefined || portfolio === undefined) throw new Error("blank plan is empty");

  return {
    ...blank,
    household: {
      people: [
        {
          ...person,
          currentAge: inputs.currentAge,
          targetRetirementAge: inputs.targetRetirementAge,
        },
      ],
    },
    expenses: {
      livingAnnual: inputs.livingExpensesAnnual ?? undefined,
      retirementSpending: inputs.retirementSpending ?? undefined,
    },
    assumptions: {
      safeWithdrawalRate: inputs.safeWithdrawalRate ?? undefined,
      inflationRate: inputs.inflationRate,
    },
    portfolios: [
      {
        ...portfolio,
        value: inputs.portfolioValue ?? undefined,
        expectedReturn: inputs.expectedReturn,
        annualContribution: inputs.annualContribution,
        contributionsStopAge: inputs.contributionsStopAge,
      },
    ],
  };
}

/** Row 0's calendar year when a fixture doesn't say. */
const DEFAULT_START_YEAR = 2026;

/** The completed variant of the engine's summary. */
type CompleteSummary = Extract<ReturnType<typeof summarisePlan>, { status: "complete" }>;

/** Checks M1's figures, when the scenario lists them. */
function checkFiNumberFigures(summary: CompleteSummary, expected: WorkedScenario["expected"]) {
  if (expected.fiNumber === undefined) return;

  expectToTheCent(summary.fiNumber.value, expected.fiNumber);
  expectToTheCent(summary.investable.value, expected.investable ?? Number.NaN);
  // Progress is a fraction, so compare it at the precision of a cent on $1 (0.00005 of a percent).
  expect(Math.abs(summary.progressToFi.value - (expected.progressToFi ?? Number.NaN))).toBeLessThan(
    1e-9,
  );
  expectToTheCent(
    summary.fiNumber.lines[0]?.value ?? Number.NaN,
    expected.retirementSpendingAnnual ?? Number.NaN,
  );
}

/** Checks M2's figures (rows, FI year, FI number at retirement), when the scenario lists them. */
function checkProjectionFigures(summary: CompleteSummary, expected: WorkedScenario["expected"]) {
  if (expected.rows === undefined && expected.fiNumberAtRetirement === undefined) return;

  expect(summary.projection.status).toBe("complete");
  if (summary.projection.status !== "complete") return;
  const { projection } = summary;

  for (const expectedRow of expected.rows ?? []) {
    const row = projection.rows[expectedRow.yearIndex];
    expect(row).toBeDefined();
    if (row === undefined) continue;

    expectToTheCent(row.closingBalance, expectedRow.closingBalance);
    if (expectedRow.growth !== undefined) expectToTheCent(row.growth, expectedRow.growth);
    if (expectedRow.contribution !== undefined) {
      expectToTheCent(row.contribution, expectedRow.contribution);
    }
  }

  if (expected.fiReached === null) {
    expect(projection.fiReached).toBeUndefined();
  } else if (expected.fiReached !== undefined) {
    const { fiReached } = projection;
    expect(fiReached).toBeDefined();
    if (fiReached === undefined) return;

    expect(fiReached.yearIndex).toBe(expected.fiReached.yearIndex);
    expect(fiReached.calendarYear).toBe(expected.fiReached.calendarYear);
    expect(fiReached.age).toBe(expected.fiReached.age);

    const row = projection.rows[fiReached.yearIndex];
    expectToTheCent(row?.closingBalance ?? Number.NaN, expected.fiReached.closingBalance);
    expectToTheCent(row?.fiNumber ?? Number.NaN, expected.fiReached.fiNumber);
  }

  if (expected.fiNumberAtRetirement !== undefined) {
    expectToTheCent(projection.fiNumberAtRetirement.value, expected.fiNumberAtRetirement);
  }
}

/** Asserts two figures agree to the cent (within half a cent). */
function expectToTheCent(actual: number, expected: number) {
  expect(Math.abs(actual - expected)).toBeLessThan(0.005);
}

describe("worked examples", () => {
  it("finds at least one fixture file", () => {
    expect(Object.keys(fixtureFiles).length).toBeGreaterThan(0);
  });

  for (const [path, file] of Object.entries(fixtureFiles)) {
    describe(`${path} (${file.milestone})`, () => {
      it.each(file.scenarios.map((scenario) => [scenario.name, scenario] as const))(
        "%s",
        (_name, scenario) => {
          expect(scenario.checkedBy).not.toBe("");

          const summary = summarisePlan(
            planFromScenario(scenario.inputs),
            file.startYear ?? DEFAULT_START_YEAR,
          );

          expect(summary.status).toBe("complete");
          if (summary.status !== "complete") return;

          checkFiNumberFigures(summary, scenario.expected);
          checkProjectionFigures(summary, scenario.expected);
        },
      );
    });
  }
});
