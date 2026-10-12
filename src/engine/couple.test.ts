import { describe, expect, it } from "vitest";

import { bundledRuleSet } from "../rules/bundledRuleSet";
import { assessBridge } from "./bridge";
import { calculateCoastFire } from "./coastFire";
import { calculateCoastSplit } from "./coastSplit";
import { findEarliestRetirementAge } from "./earliestRetirement";
import {
  findFiReached,
  formatAges,
  projectPortfolio,
  type ProjectionInputs,
  type ProjectionSuper,
} from "./projection";
import { assessSolvency } from "./solvency";

// Two-person engine tests. Worked examples D and D2 of PLAN.md (M7), with
// the interim amount at its default of $0 (the interim amount itself arrives
// in M7 step 5), every rate 0 so they can be checked on paper, and the values
// taken from an independent model:
//
//   Alex: 55, retires at 56, $150,000 super, access 65.
//   Sam:  53, retires at 58, $100,000 super, access 60 (D) or 65 (D2).
//   Plan until Sam is 66 (2039). Joint portfolio $200,000, no contributions,
//   no cash. Retirement spending $40,000. Start year 2026.
//
//   year:   2026 ─ 2027 ─ 2028 .. 2031 ─ 2032 ─ 2033 ... 2039
//   phase:  working  Alex     oneRetired   retired (both)
//                    retires   (Sam works)
//   Sam's super opens: 2033 (D) or 2038 (D2). Alex's: 2036.

const START_YEAR = 2026;

/** A super account with the given balance and access age, and no rates or contributions. */
function superAccount(opening: number, accessAge: number): ProjectionSuper {
  return {
    opening,
    returnRate: 0,
    employerRate: 0,
    earningsTaxRate: 0,
    salarySacrifice: { annual: 0 },
    nonConcessional: { annual: 0 },
    accessAge,
    ruleSet: bundledRuleSet,
  };
}

/** Example D (or D2 with `samAccessAge` 65), with any of the money changed. */
function exampleD(
  overrides: { samAccessAge?: number; retirementSpendingAnnual?: number } = {},
): ProjectionInputs {
  return {
    people: [
      {
        id: "alex",
        label: "Alex",
        currentAge: 55,
        retirementAge: 56,
        superAccount: superAccount(150_000, 65),
      },
      {
        id: "sam",
        label: "Sam",
        currentAge: 53,
        retirementAge: 58,
        superAccount: superAccount(100_000, overrides.samAccessAge ?? 60),
      },
    ],
    endAge: 66,
    expectedReturn: 0,
    interestRate: 0,
    inflationRate: 0,
    annualContribution: 0,
    contributionsStop: { kind: "whileWorking", personIds: ["alex", "sam"] },
    portfolioOpening: 200_000,
    cashOpening: 0,
    livingAnnual: 40_000,
    retirementSpendingAnnual: overrides.retirementSpendingAnnual ?? 40_000,
    datedExpenses: [],
    fiNumberToday: 1_000_000,
  };
}

/** Projects, then assesses the bridge. */
function bridgeFor(inputs: ProjectionInputs) {
  return assessBridge(projectPortfolio(inputs, START_YEAR), inputs);
}

describe("example D: Sam's super opens first (2033)", () => {
  it("runs the bridge 2028 to 2032 against the portfolio, which meets it", () => {
    const result = bridgeFor(exampleD());

    expect(result.effectiveAccess).toEqual({ personId: "sam", personIndex: 1, age: 60 });
    expect(result.bridge).toMatchObject({ firstYear: 2028, lastYear: 2032, status: "met" });
    expect(result.bridge?.need.value).toBe(40_000);
    expect(result.bridge?.projected.value).toBe(200_000);
  });

  it("runs after access 2033 to 2039 against everything left, which meets it", () => {
    const afterAccess = bridgeFor(exampleD()).afterAccess;

    expect(afterAccess).toMatchObject({ firstYear: 2033, lastYear: 2039, status: "met" });
    expect(afterAccess?.need.value).toBe(280_000);
    expect(afterAccess?.projected.value).toBe(410_000);
  });

  it("finds Sam's earliest retirement at 55 (2028), with Alex retiring at 56", () => {
    const result = findEarliestRetirementAge(exampleD(), START_YEAR, 1);

    expect(result).toMatchObject({ status: "feasible", age: 55, year: 2028 });
  });

  it("finds Alex's earliest retirement within the plan too", () => {
    const result = findEarliestRetirementAge(exampleD(), START_YEAR, 0);

    expect(result.status).toBe("feasible");
  });

  it("lasts, ending with the $130,000 left after eight years of $40,000", () => {
    const rows = projectPortfolio(exampleD(), START_YEAR);
    const result = assessSolvency(rows, 60);

    expect(result.status).toBe("lasts");
    expect(result.explanation.value).toBe(130_000);
  });
});

describe("example D2: Sam's access at 65, so Alex's super opens first (2036)", () => {
  const inputs = exampleD({ samAccessAge: 65 });

  it("runs the bridge 2028 to 2035, which the portfolio meets", () => {
    const result = bridgeFor(inputs);

    expect(result.effectiveAccess).toEqual({ personId: "alex", personIndex: 0, age: 65 });
    expect(result.bridge).toMatchObject({ firstYear: 2028, lastYear: 2035, status: "met" });
    expect(result.bridge?.need.value).toBe(160_000);
    expect(result.bridge?.projected.value).toBe(200_000);
  });

  it("runs after access 2036 to 2039 against $290,000, which meets it", () => {
    const afterAccess = bridgeFor(inputs).afterAccess;

    expect(afterAccess).toMatchObject({ firstYear: 2036, lastYear: 2039, status: "met" });
    expect(afterAccess?.need.value).toBe(160_000);
    expect(afterAccess?.projected.value).toBe(290_000);
  });

  // Sam turns 65 in 2038: Alex holds $110,000 by then and Sam $100,000, so the $40,000 splits 110:100.
  it("draws 2038 from both in proportion to their balances, 110 to 100", () => {
    const row = projectPortfolio(inputs, START_YEAR).find(
      (candidate) => candidate.calendarYear === 2038,
    );
    const alex = row!.people[0];
    const sam = row!.people[1]!;

    expect(alex.superOpening).toBe(110_000);
    expect(sam.superOpening).toBe(100_000);
    expect(alex.fromSuper).toBeCloseTo((40_000 * 110) / 210, 6);
    expect(sam.fromSuper).toBeCloseTo((40_000 * 100) / 210, 6);
    expect(alex.fromSuper + sam.fromSuper).toBe(40_000);
  });
});

describe("a couple that runs short while one partner's super is locked", () => {
  // $100,000 a year: the portfolio pays 2032 and 2033, Sam's super 2034, then nothing is left to draw in 2035.
  const inputs = exampleD({ retirementSpendingAnnual: 100_000 });
  const rows = projectPortfolio(inputs, START_YEAR);

  it("runs out in 2035, quoting the first person's age", () => {
    const result = assessSolvency(rows, 65);

    expect(result).toMatchObject({ status: "runsOut", year: 2035, age: 64 });
    expect(result.status === "runsOut" && result.shortfallYears[0]).toBe(2035);
  });

  // Alex's $150,000 is still locked (until 2036), though Sam's is open and empty.
  it("notes the locked super of the partner who still has some", () => {
    const result = assessSolvency(rows, 65);
    if (result.status !== "runsOut") throw new Error("expected a shortfall");

    expect(result.explanation.lines.map((line) => [line.label, line.value])).toEqual([
      ["Spending to fund in 2035", 100_000],
      ["Cash and portfolio available", 0],
      ["Shortfall", 100_000],
      ["Alex's super (not accessible until 65)", 150_000],
    ]);
  });
});

describe("Coast FIRE for a couple", () => {
  /** D without super and with $100 of cash, a $1,000 FI number and $150 a year into the portfolio. */
  function coastInputs(annualContribution: number): ProjectionInputs {
    const [alex, sam] = exampleD().people;

    return {
      ...exampleD(),
      people: [
        { ...alex, superAccount: undefined },
        { ...sam!, superAccount: undefined },
      ],
      portfolioOpening: 200,
      cashOpening: 100,
      annualContribution,
      fiNumberToday: 1_000,
    };
  }

  function coastFor(inputs: ProjectionInputs) {
    return calculateCoastFire(projectPortfolio(inputs, START_YEAR), inputs);
  }

  // Sam works until 2031, so that is the household retirement row, and the label names both people's ages.
  it("coasts to the household retirement row, when the last of them stops working", () => {
    const coast = coastFor(coastInputs(0));

    expect(coast.path.map((point) => point.calendarYear)).toEqual([
      2026, 2027, 2028, 2029, 2030, 2031,
    ]);
    expect(coast.number.value).toBe(1_000);
    expect(coast.number.lines[0]?.label).toBe("FI number at Alex 60 · Sam 58 (2031)");
    expect(coast.reached).toBeUndefined();
  });

  // Contributions continue to 2031 (Sam still works): $300 + 5 × $150 = $1,050 reaches $1,000 only if all five are paid.
  it("keeps a joint portfolio's contributions going while either partner works", () => {
    const coast = coastFor(coastInputs(150));

    expect(coast.reached).toMatchObject({ yearIndex: 5, calendarYear: 2031 });
  });
});

describe("Coast FIRE split for a couple", () => {
  const inputs = exampleD();
  const rows = projectPortfolio(inputs, START_YEAR);
  const split = calculateCoastSplit(rows, inputs, assessBridge(rows, inputs));

  // The bridge need is $40,000 against a $200,000 portfolio, so there is nothing more to save for it.
  it("needs $40,000 outside super today for the bridge and already has it", () => {
    expect(split.outside?.needToday.value).toBe(40_000);
    expect(split.outside?.hasToday).toBe(200_000);
    expect(split.outside?.reached).toMatchObject({ yearIndex: 0, calendarYear: 2026 });
  });

  // After access needs $280,000 at 0% growth and no employer contributions, and the $250,000 never grows.
  it("needs the whole after-access $280,000 in super, which they never reach", () => {
    expect(split.super?.needToday.value).toBe(280_000);
    expect(split.super?.hasToday).toBe(250_000);
    expect(split.super?.reached).toBeUndefined();
  });
});

describe("the interim amount", () => {
  // Alex retires in 2027, Sam in 2031: 2028 to 2031 draw the interim amount, indexed like all spending.
  it("is drawn in the years only one has retired, grown by inflation, and by nothing else", () => {
    const inputs: ProjectionInputs = {
      ...exampleD(),
      inflationRate: 0.025,
      interimSpendingAnnual: 20_000,
    };
    const rows = projectPortfolio(inputs, START_YEAR);

    expect(rows.map((row) => row.phase).slice(0, 8)).toEqual([
      "working",
      "working",
      "oneRetired",
      "oneRetired",
      "oneRetired",
      "oneRetired",
      "retired",
      "retired",
    ]);
    expect(rows[1]?.spending).toBe(0);
    expect(rows[2]?.spending).toBeCloseTo(20_000 * 1.025 ** 2, 6);
    expect(rows[5]?.spending).toBeCloseTo(20_000 * 1.025 ** 5, 6);
    expect(rows[6]?.spending).toBeCloseTo(40_000 * 1.025 ** 6, 6);
  });

  it("adds to dated expenses in the same years, and defaults to nothing", () => {
    const withExpense: ProjectionInputs = {
      ...exampleD(),
      datedExpenses: [{ annual: 1_000, fromYear: 2028, toYear: 2028 }],
    };

    expect(projectPortfolio(withExpense, START_YEAR)[2]?.spending).toBe(1_000);
    expect(
      projectPortfolio({ ...withExpense, interimSpendingAnnual: 20_000 }, START_YEAR)[2]?.spending,
    ).toBe(21_000);
  });
});

describe("the bridge for a couple", () => {
  // Contributions go on while Sam works (to 2031), so they pay part of the 2028 to 2031 spending.
  it("nets portfolio contributions still paid in the bridge years off the need", () => {
    const inputs: ProjectionInputs = {
      ...exampleD(),
      interimSpendingAnnual: 20_000,
      annualContribution: 10_000,
    };
    const bridge = bridgeFor(inputs).bridge;

    // Spending 4 × $20,000 + $40,000 = $120,000, less 4 × $10,000 contributed (2028 to 2031).
    expect(bridge?.need.value).toBe(80_000);
    expect(bridge?.need.lines.map((line) => line.label)).toEqual([
      "Spending in 2028 – 2032",
      "Less discounting to 2027 at 0% (the portfolio's return)",
      "Less portfolio contributions paid in those years, discounted to 2027",
      "Need for the bridge at 2027",
    ]);
    expect(bridge?.need.lines[2]?.value).toBe(40_000);
  });

  it("leaves the need as before, with no extra line, when no contributions are paid in those years", () => {
    const bridge = bridgeFor(exampleD()).bridge;

    expect(bridge?.need.lines).toHaveLength(3);
  });

  // Alex's $150,000 is locked until 2036 when after access begins in 2033.
  it("shows a partner's still-locked super on its own line", () => {
    const afterAccess = bridgeFor(exampleD()).afterAccess;
    const labelsAndValues = afterAccess?.projected.lines.map((line) => [line.label, line.value]);

    expect(labelsAndValues).toEqual([
      ["Alex's super at end of 2032, locked until 65 (2036)", 150_000],
      ["Sam's super at end of 2032", 100_000],
      ["Portfolio at end of 2032", 160_000],
      ["Cash at end of 2032", 0],
      ["Projected after super is accessible", 410_000],
      ["Withdrawals are tax-free from age", 60],
    ]);
  });

  // Alex's 10% on $300,000 and Sam's 4% on $100,000 are weighted 3:1 by their balances at 2032.
  it("discounts the need after access at the partners' returns, weighted by balance", () => {
    const [alex, sam] = exampleD().people;
    const inputs: ProjectionInputs = {
      ...exampleD(),
      people: [
        { ...alex, superAccount: { ...alex.superAccount!, opening: 300_000, returnRate: 0.1 } },
        { ...sam!, superAccount: { ...sam!.superAccount!, opening: 100_000, returnRate: 0.04 } },
      ],
    };
    const rows = projectPortfolio(inputs, START_YEAR);
    const base = rows[6];
    const alexBalance = base!.people[0].superClosing;
    const samBalance = base!.people[1]!.superClosing;
    const expectedRate = (alexBalance * 0.1 + samBalance * 0.04) / (alexBalance + samBalance);

    const needLabel = assessBridge(rows, inputs).afterAccess?.need.lines[1]?.label;
    const percent = `${Number((expectedRate * 100).toPrecision(12))}%`;

    expect(needLabel).toContain(`at ${percent} (super's return after earnings tax)`);
  });
});

describe("ages in explanation lines", () => {
  it("reads 'age N' for one person and names everyone for a couple", () => {
    expect(formatAges([{ label: "Person 1", age: 52 }])).toBe("age 52");
    expect(
      formatAges([
        { label: "Alex", age: 52 },
        { label: "Sam", age: 50 },
      ]),
    ).toBe("Alex 52 · Sam 50");
  });

  it("names both people in the FI-reached line of a couple", () => {
    const rows = projectPortfolio({ ...exampleD(), fiNumberToday: 100_000 }, START_YEAR);
    const labels = findFiReached(rows)?.explanation.lines.map((line) => line.label);

    expect(labels?.[0]).toBe("Balance at end of 2026 (Alex 55 · Sam 53)");
  });

  it("names the person whose age is moved, and both ages when it fails", () => {
    const result = findEarliestRetirementAge(
      exampleD({ retirementSpendingAnnual: 100_000 }),
      START_YEAR,
      1,
    );
    if (result.status !== "feasible") throw new Error("expected a feasible age");

    const labels = result.explanation.lines.map((line) => line.label);

    expect(labels[0]).toMatch(/^Sam retiring at \d+: runs short in \d{4} \(Alex \d+ · Sam \d+\)$/);
    expect(labels.at(-1)).toBe("Earliest feasible retirement age");
  });
});

describe("Coast FIRE's super run with an interim amount", () => {
  // The older partner's super is open (past 65). Interim spending must not draw on it on the coast path.
  it("leaves out interim spending, so the older partner's super isn't drawn on the way", () => {
    const [alex, sam] = exampleD().people;
    const inputs: ProjectionInputs = {
      ...exampleD(),
      people: [
        { ...alex, currentAge: 66, retirementAge: 66 },
        { ...sam!, currentAge: 60, retirementAge: 63 },
      ],
      endAge: 70,
      portfolioOpening: 0,
      cashOpening: 0,
      interimSpendingAnnual: 30_000,
      fiNumberToday: 1_000,
    };
    const rows = projectPortfolio(inputs, START_YEAR);
    const withInterim = calculateCoastFire(rows, inputs);
    const withoutInterim = calculateCoastFire(
      projectPortfolio({ ...inputs, interimSpendingAnnual: 0 }, START_YEAR),
      { ...inputs, interimSpendingAnnual: 0 },
    );

    // The coast path's super at retirement is the same whatever the interim amount is.
    const superNeed = (coast: typeof withInterim) =>
      coast.number.lines.find((line) => line.label.startsWith("Your super, growing"))?.value;

    expect(superNeed(withInterim)).toBe(superNeed(withoutInterim));
  });
});
