import { describe, expect, it } from "vitest";

import { summarisePlan } from "../../src/engine/fiNumber";
import { bundledRuleSet } from "../../src/rules/bundledRuleSet";
import { createNewPlan } from "../../src/plan/createNewPlan";
import type {
  DatedExpense,
  Plan,
  RetirementSpending,
  SalaryGrowth,
  SuperAccount,
} from "../../src/plan/types";

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
    /** `null` or absent means "left unset" (defaults to the retirement age). */
    readonly contributionsStopAge?: number | null;
    readonly expectedReturn?: number;
    readonly annualContribution?: number;
    readonly inflationRate?: number;
    // M3 onwards; absent or null means "left unset".
    readonly projectionEndAge?: number | null;
    readonly cashBalance?: number | null;
    readonly interestRate?: number | null;
    readonly datedExpenses?: readonly FixtureDatedExpense[];
    // M5 onwards; absent means "left unset".
    readonly salaryAnnual?: number | null;
    readonly salaryGrowth?: SalaryGrowth | null;
    /** The super account as entered (M5 step 5 onwards); absent means none. */
    readonly superAccount?: SuperAccount | null;
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
    /** M3 figures: present in M3 fixtures only. */
    readonly solvency?: ExpectedSolvency;
    readonly earliestRetirement?: ExpectedEarliestRetirement;
    /** M4 figures: present in M4 fixtures only. */
    readonly coast?: ExpectedCoast;
    /** M5 figures: salary in the listed rows. */
    readonly salaryRows?: readonly { readonly yearIndex: number; readonly salary: number }[];
    /** M5 figures: super (and salary, shortfall, investable) in the listed rows. */
    readonly superRows?: readonly ExpectedSuperRow[];
  };
}

/** The super figures checked for one projection row; unlisted fields aren't checked. */
interface ExpectedSuperRow {
  readonly yearIndex: number;
  readonly salary?: number;
  readonly employerContribution?: number;
  readonly salarySacrifice?: number;
  readonly nonConcessional?: number;
  readonly superEarnings?: number;
  readonly superEarningsTax?: number;
  readonly contributionsTax?: number;
  readonly fromSuper?: number;
  readonly shortfall?: number;
  readonly superClosing?: number;
  readonly investableClosing?: number;
}

/** The expected Coast FIRE figures. Only the listed fields are checked. */
interface ExpectedCoast {
  /** The Coast FIRE number in today's dollars. */
  readonly number: number;
  /** The same amount in the retirement year's dollars. */
  readonly numberInRetirementYearDollars: number;
  /** `null` means Coast FIRE is not reached before retirement. */
  readonly reached: {
    readonly yearIndex: number;
    readonly calendarYear: number;
    readonly age: number;
    readonly investable: number;
    readonly coastNumber: number;
  } | null;
  /** Rows of the Coast FIRE path worth checking by hand. */
  readonly rows?: readonly {
    readonly yearIndex: number;
    readonly investable: number;
    readonly coastNumber: number;
  }[];
}

/** A dated expense as written in a fixture, in the user's own units. */
interface FixtureDatedExpense {
  readonly name: string;
  readonly annual: number;
  readonly fromYear: number;
  readonly toYear: number;
}

/** The expected answer to "does the money last?". Only the listed fields are checked. */
interface ExpectedSolvency {
  readonly status: "lasts" | "runsOut";
  /** For "lasts": investable net worth at the end age. */
  readonly investableClosing?: number;
  /** For "runsOut": the first shortfall year, its age, every shortfall year and the first year's shortfall. */
  readonly year?: number;
  readonly age?: number;
  readonly shortfallYears?: readonly number[];
  readonly shortfall?: number;
}

/** The expected earliest feasible retirement age, and the calendar year it falls in. */
interface ExpectedEarliestRetirement {
  readonly status: "feasible";
  readonly age: number;
  readonly year: number;
}

/** The figures checked for one projection row; unlisted fields aren't checked. */
interface ExpectedRow {
  readonly yearIndex: number;
  readonly portfolioGrowth?: number;
  readonly contribution?: number;
  readonly portfolioClosing: number;
  // M3 fields.
  readonly cashInterest?: number;
  readonly cashClosing?: number;
  readonly spending?: number;
  readonly fromCash?: number;
  readonly fromPortfolio?: number;
  readonly shortfall?: number;
}

interface ExpectedFiReached {
  readonly yearIndex: number;
  readonly calendarYear: number;
  readonly age: number;
  /** The portfolio alone (M2 fixtures, which have no cash). */
  readonly portfolioClosing?: number;
  /** Cash plus portfolio (M3 fixtures). */
  readonly investableClosing?: number;
  /** The FI number in that year; checked only when listed. */
  readonly fiNumber?: number;
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
          salary: {
            annual: inputs.salaryAnnual ?? undefined,
            growth: inputs.salaryGrowth ?? undefined,
          },
          superAccount: inputs.superAccount ?? undefined,
        },
      ],
      projectionEndAge: inputs.projectionEndAge ?? undefined,
    },
    cash: { balance: inputs.cashBalance ?? undefined },
    expenses: {
      livingAnnual: inputs.livingExpensesAnnual ?? undefined,
      retirementSpending: inputs.retirementSpending ?? undefined,
      datedExpenses: (inputs.datedExpenses ?? []).map((expense, index): DatedExpense => ({
        id: `expense-${index}`,
        ...expense,
      })),
    },
    assumptions: {
      safeWithdrawalRate: inputs.safeWithdrawalRate ?? undefined,
      inflationRate: inputs.inflationRate,
      interestRate: inputs.interestRate ?? undefined,
    },
    portfolios: [
      {
        ...portfolio,
        value: inputs.portfolioValue ?? undefined,
        expectedReturn: inputs.expectedReturn,
        annualContribution: inputs.annualContribution,
        contributionsStopAge: inputs.contributionsStopAge ?? undefined,
      },
    ],
  };
}

/** Row 0's calendar year when a fixture doesn't say. */
const DEFAULT_START_YEAR = 2026;

/** The completed variant of the engine's summary. */
type CompleteSummary = Extract<ReturnType<typeof summarisePlan>, { status: "complete" }>;

/** The completed projection part of the summary. */
type CompleteProjection = Extract<CompleteSummary["projection"], { status: "complete" }>;

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

/** Checks the projection's figures (rows, FI year, FI number at retirement, solvency), when the scenario lists them. */
function checkProjectionFigures(summary: CompleteSummary, expected: WorkedScenario["expected"]) {
  if (
    expected.rows === undefined &&
    expected.fiReached === undefined &&
    expected.fiNumberAtRetirement === undefined &&
    expected.solvency === undefined &&
    expected.earliestRetirement === undefined
  ) {
    return;
  }

  expect(summary.projection.status).toBe("complete");
  if (summary.projection.status !== "complete") return;
  const { projection } = summary;

  for (const expectedRow of expected.rows ?? []) {
    const row = projection.rows[expectedRow.yearIndex];
    expect(row).toBeDefined();
    if (row === undefined) continue;

    expectToTheCent(row.portfolioClosing, expectedRow.portfolioClosing);
    if (expectedRow.portfolioGrowth !== undefined)
      expectToTheCent(row.portfolioGrowth, expectedRow.portfolioGrowth);
    if (expectedRow.contribution !== undefined) {
      expectToTheCent(row.contribution, expectedRow.contribution);
    }

    // M3 fields: each is checked only when the fixture lists it.
    const m3Checks = [
      ["cashInterest", row.cashInterest, expectedRow.cashInterest],
      ["cashClosing", row.cashClosing, expectedRow.cashClosing],
      ["spending", row.spending, expectedRow.spending],
      ["fromCash", row.fromCash, expectedRow.fromCash],
      ["fromPortfolio", row.fromPortfolio, expectedRow.fromPortfolio],
      ["shortfall", row.shortfall, expectedRow.shortfall],
    ] as const;
    for (const [, actual, expectedValue] of m3Checks) {
      if (expectedValue !== undefined) expectToTheCent(actual, expectedValue);
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
    if (expected.fiReached.portfolioClosing !== undefined) {
      expectToTheCent(row?.portfolioClosing ?? Number.NaN, expected.fiReached.portfolioClosing);
    }
    if (expected.fiReached.investableClosing !== undefined) {
      expectToTheCent(row?.investableClosing ?? Number.NaN, expected.fiReached.investableClosing);
    }
    if (expected.fiReached.fiNumber !== undefined) {
      expectToTheCent(row?.fiNumber ?? Number.NaN, expected.fiReached.fiNumber);
    }
  }

  if (expected.fiNumberAtRetirement !== undefined) {
    expectToTheCent(projection.fiNumberAtRetirement.value, expected.fiNumberAtRetirement);
  }

  if (expected.solvency !== undefined) {
    checkSolvency(projection.solvency, expected.solvency);
  }

  if (expected.earliestRetirement !== undefined) {
    const { earliestRetirement } = projection;
    expect(earliestRetirement.status).toBe(expected.earliestRetirement.status);
    if (earliestRetirement.status === "feasible") {
      expect(earliestRetirement.age).toBe(expected.earliestRetirement.age);
      expect(earliestRetirement.year).toBe(expected.earliestRetirement.year);
    }
  }
}

/** Checks the Coast FIRE number, the retirement-year figure, the reached row and any listed path rows. */
function checkCoastFigures(summary: CompleteSummary, expected: WorkedScenario["expected"]) {
  if (expected.coast === undefined) return;

  expect(summary.projection.status).toBe("complete");
  if (summary.projection.status !== "complete") return;
  const { coast } = summary.projection;

  expectToTheCent(coast.number.value, expected.coast.number);
  expectToTheCent(
    coast.numberInRetirementYearDollars,
    expected.coast.numberInRetirementYearDollars,
  );

  if (expected.coast.reached === null) {
    expect(coast.reached).toBeUndefined();
  } else {
    expect(coast.reached).toBeDefined();
    if (coast.reached === undefined) return;

    expect(coast.reached.yearIndex).toBe(expected.coast.reached.yearIndex);
    expect(coast.reached.calendarYear).toBe(expected.coast.reached.calendarYear);
    expect(coast.reached.age).toBe(expected.coast.reached.age);

    const point = coast.path[coast.reached.yearIndex];
    expectToTheCent(point?.investable ?? Number.NaN, expected.coast.reached.investable);
    expectToTheCent(point?.coastNumber ?? Number.NaN, expected.coast.reached.coastNumber);
  }

  for (const expectedRow of expected.coast.rows ?? []) {
    const point = coast.path[expectedRow.yearIndex];
    expectToTheCent(point?.investable ?? Number.NaN, expectedRow.investable);
    expectToTheCent(point?.coastNumber ?? Number.NaN, expectedRow.coastNumber);
  }
}

/** Checks salary in the listed rows (M5). */
function checkSalaryFigures(summary: CompleteSummary, expected: WorkedScenario["expected"]) {
  if (expected.salaryRows === undefined) return;

  expect(summary.projection.status).toBe("complete");
  if (summary.projection.status !== "complete") return;

  for (const expectedRow of expected.salaryRows) {
    const row = summary.projection.rows[expectedRow.yearIndex];
    expectToTheCent(row?.salary ?? Number.NaN, expectedRow.salary);
  }
}

/** Checks the listed super figures in the listed rows (M5 step 5). */
function checkSuperFigures(summary: CompleteSummary, expected: WorkedScenario["expected"]) {
  if (expected.superRows === undefined) return;

  expect(summary.projection.status).toBe("complete");
  if (summary.projection.status !== "complete") return;

  for (const expectedRow of expected.superRows) {
    const row = summary.projection.rows[expectedRow.yearIndex];
    expect(row).toBeDefined();
    if (row === undefined) continue;

    const checks = [
      ["salary", row.salary, expectedRow.salary],
      ["employerContribution", row.employerContribution, expectedRow.employerContribution],
      ["salarySacrifice", row.salarySacrifice, expectedRow.salarySacrifice],
      ["nonConcessional", row.nonConcessional, expectedRow.nonConcessional],
      ["superEarnings", row.superEarnings, expectedRow.superEarnings],
      ["superEarningsTax", row.superEarningsTax, expectedRow.superEarningsTax],
      ["contributionsTax", row.contributionsTax, expectedRow.contributionsTax],
      ["fromSuper", row.fromSuper, expectedRow.fromSuper],
      ["shortfall", row.shortfall, expectedRow.shortfall],
      ["superClosing", row.superClosing, expectedRow.superClosing],
      ["investableClosing", row.investableClosing, expectedRow.investableClosing],
    ] as const;

    for (const [field, actual, expectedValue] of checks) {
      if (expectedValue === undefined) continue;

      // Name the field and year in a failure, since a bare number difference doesn't say which.
      expect(
        Math.abs(actual - expectedValue),
        `${field} in row ${expectedRow.yearIndex}: got ${actual}, expected ${expectedValue}`,
      ).toBeLessThan(0.005);
    }
  }
}

/** Checks the "does the money last?" answer against a fixture, field by field. */
function checkSolvency(actual: CompleteProjection["solvency"], expected: ExpectedSolvency) {
  expect(actual.status).toBe(expected.status);

  if (actual.status === "lasts") {
    if (expected.investableClosing !== undefined) {
      expectToTheCent(actual.explanation.value, expected.investableClosing);
    }
    return;
  }

  if (expected.year !== undefined) expect(actual.year).toBe(expected.year);
  if (expected.age !== undefined) expect(actual.age).toBe(expected.age);
  if (expected.shortfallYears !== undefined) {
    expect(actual.shortfallYears).toEqual(expected.shortfallYears);
  }
  if (expected.shortfall !== undefined)
    expectToTheCent(actual.explanation.value, expected.shortfall);
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
            bundledRuleSet,
          );

          expect(summary.status).toBe("complete");
          if (summary.status !== "complete") return;

          checkFiNumberFigures(summary, scenario.expected);
          checkProjectionFigures(summary, scenario.expected);
          checkCoastFigures(summary, scenario.expected);
          checkSalaryFigures(summary, scenario.expected);
          checkSuperFigures(summary, scenario.expected);
        },
      );
    });
  }
});
