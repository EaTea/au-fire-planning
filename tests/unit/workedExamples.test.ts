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
  readonly scenarios: readonly WorkedScenario[];
}

interface WorkedScenario {
  readonly name: string;
  readonly checkedBy: string;
  readonly inputs: {
    readonly livingExpensesAnnual: number | null;
    readonly retirementSpending: RetirementSpending | null;
    readonly safeWithdrawalRate: number | null;
    readonly portfolioValue: number | null;
  };
  readonly expected: {
    readonly retirementSpendingAnnual: number;
    readonly fiNumber: number;
    readonly investable: number;
    readonly progressToFi: number;
  };
}

const fixtureFiles = import.meta.glob<WorkedExampleFile>("../worked-examples/*.json", {
  eager: true,
  import: "default",
});

/** Builds a plan from a fixture's inputs, where `null` means "left unset". */
function planFromScenario(inputs: WorkedScenario["inputs"]): Plan {
  let counter = 0;
  const blank = createNewPlan(() => `id-${++counter}`);

  return {
    ...blank,
    expenses: {
      livingAnnual: inputs.livingExpensesAnnual ?? undefined,
      retirementSpending: inputs.retirementSpending ?? undefined,
    },
    assumptions: { safeWithdrawalRate: inputs.safeWithdrawalRate ?? undefined },
    portfolios: [
      { id: "portfolio", name: "Share portfolio", value: inputs.portfolioValue ?? undefined },
    ],
  };
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

          const summary = summarisePlan(planFromScenario(scenario.inputs));

          expect(summary.status).toBe("complete");
          if (summary.status !== "complete") return;
          expectToTheCent(summary.fiNumber.value, scenario.expected.fiNumber);
          expectToTheCent(summary.investable.value, scenario.expected.investable);
          // Progress is a fraction, so compare it at the precision of a cent on $1 (0.00005 of a percent).
          expect(
            Math.abs(summary.progressToFi.value - scenario.expected.progressToFi),
          ).toBeLessThan(1e-9);
          expectToTheCent(
            summary.fiNumber.lines[0]?.value ?? Number.NaN,
            scenario.expected.retirementSpendingAnnual,
          );
        },
      );
    });
  }
});
