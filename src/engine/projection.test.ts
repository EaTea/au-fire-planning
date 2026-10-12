import { describe, expect, it } from "vitest";

import type { SalaryGrowth } from "../plan/types";
import { bundledRuleSet } from "../rules/bundledRuleSet";
import {
  findFiReached,
  firstRetirementRowIndex,
  householdRetirementRowIndex,
  inputsWithRetirementAge,
  isShortfallWithSuperLocked,
  lastPortfolioContributionYear,
  salaryGrowthRate,
  projectPortfolio,
  youngestAgeAtRow,
  type ProjectionInputs,
  type ProjectionRow,
} from "./projection";
import { onePersonInputs, withFirstPerson } from "./testing/onePersonInputs";

/**
 * M2's example B: $100,000 at 10%, $10,000 a year until 41, no inflation. The
 * retirement age is set past the end age and there is no cash, so these rows
 * show only M2's growth rules (no spending is drawn).
 */
const exampleB: ProjectionInputs = onePersonInputs({
  currentAge: 40,
  endAge: 100,
  retirementAge: 100,
  expectedReturn: 0.1,
  interestRate: 0.04,
  inflationRate: 0,
  annualContribution: 10000,
  contributionsStopAge: 41,
  portfolioOpening: 100000,
  cashOpening: 0,
  livingAnnual: 20000,
  retirementSpendingAnnual: 20000,
  datedExpenses: [],
  fiNumberToday: 400000,
});

/** The plan's example B (by hand, runs out): $100,000 at 10%, $10,000 cash at 5%, spending $30,000, age 60 to 65. */
const runsOutExample: ProjectionInputs = onePersonInputs({
  currentAge: 60,
  endAge: 65,
  retirementAge: 60,
  expectedReturn: 0.1,
  interestRate: 0.05,
  inflationRate: 0,
  annualContribution: 0,
  contributionsStopAge: 60,
  portfolioOpening: 100000,
  cashOpening: 10000,
  livingAnnual: 30000,
  retirementSpendingAnnual: 30000,
  datedExpenses: [],
  fiNumberToday: 750000,
});

// Tests for the year-by-year projection and its timing rules.
describe("projectPortfolio", () => {
  // Row 0 is today: nothing grows or is contributed yet.
  it("starts with row 0 as today, with no growth or contribution", () => {
    const [today] = projectPortfolio(exampleB, 2026);

    expect(today).toMatchObject({
      yearIndex: 0,
      calendarYear: 2026,
      people: [{ age: 40 }],
      inflationIndex: 1,
      portfolioGrowth: 0,
      contribution: 0,
      portfolioClosing: 100000,
      livingExpenses: 20000,
      fiNumber: 400000,
    });
  });

  // Growth is on the opening balance; the contribution is added on top.
  it("adds growth and a contribution in row 1", () => {
    const row = projectPortfolio(exampleB, 2026)[1];

    expect(row).toMatchObject({
      calendarYear: 2027,
      people: [{ age: 41 }],
      portfolioOpening: 100000,
      portfolioGrowth: 10000,
      contribution: 10000,
      portfolioClosing: 120000,
    });
  });

  // The year you turn the stop age is the last with a contribution (age 42 > 41).
  it("stops contributing after the stop age but keeps growing", () => {
    const row = projectPortfolio(exampleB, 2026)[2];

    expect(row).toMatchObject({
      people: [{ age: 42 }],
      portfolioGrowth: 12000,
      contribution: 0,
      portfolioClosing: 132000,
    });
  });

  // Every value in a row shares one index, (1+i)^k.
  it("grows living expenses and the FI number by the same inflation index", () => {
    const rows = projectPortfolio({ ...exampleB, inflationRate: 0.025 }, 2026);
    const row = rows[3];

    expect(row?.inflationIndex).toBeCloseTo(1.025 ** 3, 12);
    expect(row?.livingExpenses).toBeCloseTo(20000 * 1.025 ** 3, 8);
    expect(row?.fiNumber).toBeCloseTo(400000 * 1.025 ** 3, 8);
  });

  // The projection ends at the end age, inclusive.
  it("runs up to and including the end age", () => {
    const rows = projectPortfolio({ ...exampleB, endAge: 95 }, 2026);

    expect(rows).toHaveLength(95 - 40 + 1);
    expect(rows[rows.length - 1]?.people[0].age).toBe(95);
  });

  // Someone already at or past the end age still gets today's row.
  it("returns only row 0 when the current age is past the end age", () => {
    expect(projectPortfolio(withFirstPerson(exampleB, { currentAge: 105 }), 2026)).toHaveLength(1);
  });

  // Row 0 is today: no flows, and cash plus portfolio is the investable total.
  it("starts cash and investable from today's balances", () => {
    const [today] = projectPortfolio({ ...exampleB, cashOpening: 5000 }, 2026);

    expect(today).toMatchObject({
      phase: "working",
      cashClosing: 5000,
      cashInterest: 0,
      spending: 0,
      shortfall: 0,
      investableClosing: 105000,
    });
  });
});

// Cash earns interest on its opening balance; interest doesn't touch the portfolio.
describe("projectPortfolio: cash", () => {
  it("earns interest on the opening cash", () => {
    const row = projectPortfolio({ ...exampleB, cashOpening: 20000 }, 2026)[1];

    expect(row).toMatchObject({
      cashOpening: 20000,
      cashInterest: 800,
      cashClosing: 20800,
      portfolioClosing: 120000,
      investableClosing: 140800,
    });
  });
});

// Retired years are those after the retirement age; spending is drawn from
// the portfolio first and cash last, so cash stays as a buffer.
describe("projectPortfolio: retirement spending", () => {
  const rows = projectPortfolio(runsOutExample, 2026);

  // Age 60 is today and the retirement age itself, so the first retired row is age 61.
  it("starts drawing spending in the year after the retirement age, from the portfolio", () => {
    expect(rows[0]?.phase).toBe("working");
    expect(rows[1]).toMatchObject({
      phase: "retired",
      cashInterest: 500,
      portfolioGrowth: 10000,
      spending: 30000,
      fromPortfolio: 30000,
      fromCash: 0,
      shortfall: 0,
      cashClosing: 10500,
      portfolioClosing: 80000,
    });
  });

  // Cash keeps earning interest, untouched, while the portfolio can pay.
  it("leaves cash alone while the portfolio can pay", () => {
    expect(rows[2]).toMatchObject({ fromCash: 0, fromPortfolio: 30000, portfolioClosing: 58000 });
    expect(rows[2]?.cashClosing).toBeCloseTo(11025, 8);
    expect(rows[4]?.portfolioClosing).toBeCloseTo(7180, 8);
    expect(rows[4]?.cashClosing).toBeCloseTo(12155.0625, 8);
  });

  // Spending a few years later keeps growing with inflation, like living expenses.
  it("grows retirement spending by the inflation index", () => {
    const inflated = projectPortfolio({ ...runsOutExample, inflationRate: 0.02 }, 2026);

    expect(inflated[2]?.spending).toBeCloseTo(30000 * 1.02 ** 2, 8);
  });

  // 2031: the portfolio has $7,898, cash $12,762.82, and spending is $30,000.
  it("draws cash once the portfolio is empty, and records the rest as a shortfall", () => {
    expect(rows[5]).toMatchObject({
      calendarYear: 2031,
      people: [{ age: 65 }],
      cashClosing: 0,
      portfolioClosing: 0,
    });
    expect(rows[5]?.fromPortfolio).toBeCloseTo(7898, 8);
    expect(rows[5]?.fromCash).toBeCloseTo(12762.815625, 8);
    expect(rows[5]?.shortfall).toBeCloseTo(9339.184375, 8);
  });

  // The portfolio covering spending exactly leaves cash untouched and no shortfall.
  it("handles the portfolio exactly covering spending", () => {
    const [, row] = projectPortfolio(
      { ...runsOutExample, portfolioOpening: 30000 / 1.1, retirementSpendingAnnual: 30000 },
      2026,
    );

    expect(row?.fromPortfolio).toBeCloseTo(30000, 8);
    expect(row?.fromCash).toBeCloseTo(0, 8);
    expect(row?.shortfall).toBeCloseTo(0, 8);
    expect(row?.portfolioClosing).toBeCloseTo(0, 8);
    expect(row?.cashClosing).toBeCloseTo(10500, 8);
  });

  // After the money runs out, each later year is a full shortfall.
  it("keeps flagging shortfall years after the money has run out", () => {
    const longer = projectPortfolio({ ...runsOutExample, endAge: 68 }, 2026);

    expect(longer.filter((row) => row.shortfall > 0).map((row) => row.people[0].age)).toEqual([
      65, 66, 67, 68,
    ]);
    expect(longer[6]).toMatchObject({ spending: 30000, shortfall: 30000, investableClosing: 0 });
  });
});

// Dated expenses are drawn from savings in any year they apply, working or retired.
describe("projectPortfolio: dated expenses", () => {
  // Plan example C, with its car in 2028 only and school fees 2029 to 2030.
  const exampleC: ProjectionInputs = onePersonInputs({
    currentAge: 40,
    endAge: 50,
    retirementAge: 45,
    expectedReturn: 0.05,
    interestRate: 0.04,
    inflationRate: 0.02,
    annualContribution: 20000,
    contributionsStopAge: 45,
    portfolioOpening: 200000,
    cashOpening: 0,
    livingAnnual: 40000,
    retirementSpendingAnnual: 40000,
    datedExpenses: [
      { annual: 30000, fromYear: 2028, toYear: 2028 },
      { annual: 10000, fromYear: 2029, toYear: 2030 },
    ],
    fiNumberToday: 1000000,
  });
  const rows = projectPortfolio(exampleC, 2026);

  // Before retirement the expense still comes out of savings: nothing else pays it until salary exists.
  it("draws an expense before retirement from savings", () => {
    expect(rows[2]).toMatchObject({
      calendarYear: 2028,
      people: [{ age: 42 }],
      phase: "working",
    });
    expect(rows[2]?.spending).toBeCloseTo(31212, 6);
    expect(rows[2]?.fromPortfolio).toBeCloseTo(31212, 6);
    expect(rows[2]?.portfolioClosing).toBeCloseTo(230288, 6);
  });

  // With cash on hand, a working-year expense still comes from the portfolio:
  // cash is the last thing drawn, so it keeps earning interest untouched.
  it("leaves cash alone when paying an expense before retirement", () => {
    const withCash = projectPortfolio({ ...exampleC, cashOpening: 50000 }, 2026);

    expect(withCash[2]?.fromCash).toBe(0);
    expect(withCash[2]?.fromPortfolio).toBeCloseTo(31212, 6);
    expect(withCash[2]?.cashClosing).toBeCloseTo(50000 * 1.04 ** 2, 6);
  });

  // The range is inclusive at both ends.
  it("applies an expense in every year from its From year to its To year", () => {
    expect(rows[1]?.spending).toBe(0);
    expect(rows[3]?.spending).toBeCloseTo(10612.08, 6);
    expect(rows[4]?.spending).toBeCloseTo(10000 * 1.02 ** 4, 6);
    expect(rows[5]?.spending).toBe(0);
  });

  // The first retired row is age 46 (2032); here only retirement spending applies.
  it("starts retirement spending the year after the retirement age", () => {
    expect(rows[6]).toMatchObject({
      calendarYear: 2032,
      people: [{ age: 46 }],
      phase: "retired",
    });
    expect(rows[6]?.spending).toBeCloseTo(45046.5, 2);
    expect(rows[6]?.portfolioClosing).toBeCloseTo(276853.88, 2);
    expect(rows[10]?.portfolioClosing).toBeCloseTo(132703.89, 2);
  });

  // An expense that spans the retirement year adds to retirement spending from then on.
  it("adds an expense that spans retirement to retirement spending", () => {
    const spanning = projectPortfolio(
      { ...exampleC, datedExpenses: [{ annual: 5000, fromYear: 2030, toYear: 2033 }] },
      2026,
    );

    // 2031 is age 45 (working): only the expense. 2032 is age 46 (retired): both.
    expect(spanning[5]?.spending).toBeCloseTo(5000 * 1.02 ** 5, 6);
    expect(spanning[6]?.spending).toBeCloseTo((40000 + 5000) * 1.02 ** 6, 6);
  });
});

// Tests for salary (IN-7): one index per row, working years only.
describe("salary in the projection", () => {
  /** Age 40, retiring at 42, 2.5% inflation, $100,000 salary today. */
  const withSalary = (growth: SalaryGrowth): ProjectionInputs => ({
    ...withFirstPerson(exampleB, {
      currentAge: 40,
      retirementAge: 42,
      salary: { annual: 100000, growth },
    }),
    endAge: 45,
    inflationRate: 0.025,
  });

  it("grows with inflation plus the margin", () => {
    const rows = projectPortfolio(withSalary({ kind: "inflationPlus", margin: 0.01 }), 2026);

    expect(rows[0]?.salary).toBeCloseTo(100000, 6);
    expect(rows[1]?.salary).toBeCloseTo(103500, 6);
    expect(rows[2]?.salary).toBeCloseTo(100000 * 1.035 ** 2, 6);
  });

  it("grows with inflation alone for a margin of 0, and slower for a negative margin", () => {
    const flatMargin = projectPortfolio(withSalary({ kind: "inflationPlus", margin: 0 }), 2026);
    const negativeMargin = projectPortfolio(
      withSalary({ kind: "inflationPlus", margin: -0.01 }),
      2026,
    );

    expect(flatMargin[1]?.salary).toBeCloseTo(102500, 6);
    expect(negativeMargin[1]?.salary).toBeCloseTo(101500, 6);
  });

  it("grows at a fixed rate whatever inflation is", () => {
    const rows = projectPortfolio(withSalary({ kind: "fixed", rate: 0.04 }), 2026);

    expect(rows[2]?.salary).toBeCloseTo(100000 * 1.04 ** 2, 6);
  });

  it("stays flat with no growth", () => {
    const rows = projectPortfolio(withSalary({ kind: "none" }), 2026);

    expect(rows[1]?.salary).toBe(100000);
    expect(rows[2]?.salary).toBe(100000);
  });

  it("pays nothing after the retirement age, including the year after", () => {
    const rows = projectPortfolio(withSalary({ kind: "none" }), 2026);

    // Age 42 is the last working year; age 43 is retired.
    expect(rows[2]?.salary).toBe(100000);
    expect(rows[3]?.salary).toBe(0);
    expect(rows[5]?.salary).toBe(0);
  });

  it("is 0 when there is no salary", () => {
    expect(projectPortfolio(exampleB, 2026).every((candidate) => candidate.salary === 0)).toBe(
      true,
    );
  });

  it("does not change anything else in the rows", () => {
    const withPay = projectPortfolio(withSalary({ kind: "fixed", rate: 0.05 }), 2026);
    const withoutPay = projectPortfolio(
      withFirstPerson(withSalary({ kind: "none" }), { salary: undefined }),
      2026,
    );

    /** The row with the salary (the household's and the person's) set to 0, so only the pay differs. */
    const ignoringSalary = (candidate: ProjectionRow | undefined) => ({
      ...candidate,
      salary: 0,
      people: candidate?.people.map((personYear) => ({ ...personYear, salary: 0 })),
    });

    for (const [index, payRow] of withPay.entries()) {
      expect(ignoringSalary(payRow)).toEqual(ignoringSalary(withoutPay[index]));
    }
  });

  it("salaryGrowthRate maps each kind to a yearly rate", () => {
    expect(salaryGrowthRate({ kind: "inflationPlus", margin: 0.01 }, 0.025)).toBeCloseTo(0.035);
    expect(salaryGrowthRate({ kind: "fixed", rate: 0.03 }, 0.025)).toBe(0.03);
    expect(salaryGrowthRate({ kind: "none" }, 0.025)).toBe(0);
  });
});

/** A minimal row for exercising `findFiReached`. */
function row(yearIndex: number, investableClosing: number, fiNumber: number): ProjectionRow {
  return {
    yearIndex,
    calendarYear: 2026 + yearIndex,
    people: [
      {
        personId: "person-1",
        age: 40 + yearIndex,
        phase: "working",
        salary: 0,
        employerContribution: 0,
        salarySacrifice: 0,
        nonConcessional: 0,
        contributionsTax: 0,
        superOpening: 0,
        superEarnings: 0,
        superEarningsTax: 0,
        fromSuper: 0,
        superClosing: 0,
        superAccessible: false,
      },
    ],
    phase: "working",
    inflationIndex: 1,
    cashOpening: 0,
    cashInterest: 0,
    cashClosing: 0,
    portfolioOpening: 0,
    portfolioGrowth: 0,
    contribution: 0,
    portfolioClosing: investableClosing,
    spending: 0,
    fromCash: 0,
    fromPortfolio: 0,
    shortfall: 0,
    fromSuper: 0,
    superAccessible: false,
    investableClosing,
    livingExpenses: 0,
    fiNumber,
    salary: 0,
    employerContribution: 0,
    salarySacrifice: 0,
    nonConcessional: 0,
    contributionsTax: 0,
    superOpening: 0,
    superEarnings: 0,
    superEarningsTax: 0,
    superClosing: 0,
  };
}

// Tests for finding the year FI is reached.
describe("findFiReached", () => {
  // Today can already be FI.
  it("can be row 0", () => {
    expect(findFiReached([row(0, 500, 400), row(1, 600, 410)])?.yearIndex).toBe(0);
  });

  // The balance equalling the FI number counts as reaching it.
  it("counts a balance equal to the FI number", () => {
    expect(findFiReached([row(0, 100, 400), row(1, 410, 410)])?.yearIndex).toBe(1);
  });

  // Only the first qualifying row is returned.
  it("returns the first qualifying row", () => {
    expect(findFiReached([row(0, 100, 400), row(1, 450, 410), row(2, 500, 420)])?.yearIndex).toBe(
      1,
    );
  });

  // No row qualifies, so FI isn't reached.
  it("returns undefined when no row reaches the FI number", () => {
    expect(findFiReached([row(0, 100, 400), row(1, 200, 410)])).toBeUndefined();
  });

  // The explanation names the year and age, as the plan specifies.
  it("explains with the balance, the FI number and the result", () => {
    const milestone = findFiReached([row(0, 100, 400), row(1, 450, 410)]);

    expect(milestone).toMatchObject({ calendarYear: 2027, age: 41 });
    expect(milestone?.explanation.lines.map((line) => line.label)).toEqual([
      "Balance at end of 2027 (age 41)",
      "FI number in 2027",
      "FI reached",
    ]);
    expect(milestone?.explanation.lines.map((line) => line.value)).toEqual([450, 410, 40]);
  });
});

// Tests for a household of more than one person: the loop runs super for each
// person, and the row's household fields are the sums over `people`.
describe("projectPortfolio: a household of several people", () => {
  /** A super account with no rates or voluntary contributions, so only what a test sets moves. */
  const plainSuper = {
    opening: 0,
    returnRate: 0,
    employerRate: 0,
    earningsTaxRate: 0,
    salarySacrifice: { annual: 0 },
    nonConcessional: { annual: 0 },
    ruleSet: bundledRuleSet,
  } as const;

  /**
   * Alex is 50 and retires at 52; Sam is 48 and retires at 55. Both earn,
   * both have super (with growth, employer contributions and, for Alex,
   * salary sacrifice), and the plan runs until Sam is 70.
   */
  const alexAndSam: ProjectionInputs = {
    people: [
      {
        id: "alex",
        label: "Alex",
        currentAge: 50,
        retirementAge: 52,
        salary: { annual: 100_000, growth: { kind: "inflationPlus", margin: 0.01 } },
        superAccount: {
          ...plainSuper,
          opening: 50_000,
          returnRate: 0.07,
          employerRate: 0.12,
          earningsTaxRate: 0.15,
          salarySacrifice: { annual: 5_000 },
        },
      },
      {
        id: "sam",
        label: "Sam",
        currentAge: 48,
        retirementAge: 55,
        salary: { annual: 80_000, growth: { kind: "none" } },
        superAccount: {
          ...plainSuper,
          opening: 20_000,
          returnRate: 0.06,
          employerRate: 0.12,
          earningsTaxRate: 0.15,
          nonConcessional: { annual: 2_000, fromYear: 2030, toYear: 2032 },
        },
      },
    ],
    endAge: 70,
    expectedReturn: 0.07,
    interestRate: 0.04,
    inflationRate: 0.025,
    annualContribution: 10_000,
    contributionsStop: { kind: "whileWorking", personIds: ["alex", "sam"] },
    portfolioOpening: 200_000,
    cashOpening: 20_000,
    livingAnnual: 60_000,
    retirementSpendingAnnual: 60_000,
    datedExpenses: [],
    fiNumberToday: 1_500_000,
  };

  // The row's household figures must be exactly what the people add up to.
  it("makes every household super and salary field the sum over people", () => {
    const sumOf = (row: ProjectionRow, pick: (personYear: ProjectionRow["people"][0]) => number) =>
      row.people.reduce((total, personYear) => total + pick(personYear), 0);

    for (const row of projectPortfolio(alexAndSam, 2026)) {
      expect(row.salary).toBeCloseTo(
        sumOf(row, (p) => p.salary),
        6,
      );
      expect(row.employerContribution).toBeCloseTo(
        sumOf(row, (p) => p.employerContribution),
        6,
      );
      expect(row.salarySacrifice).toBeCloseTo(
        sumOf(row, (p) => p.salarySacrifice),
        6,
      );
      expect(row.nonConcessional).toBeCloseTo(
        sumOf(row, (p) => p.nonConcessional),
        6,
      );
      expect(row.contributionsTax).toBeCloseTo(
        sumOf(row, (p) => p.contributionsTax),
        6,
      );
      expect(row.superOpening).toBeCloseTo(
        sumOf(row, (p) => p.superOpening),
        6,
      );
      expect(row.superEarnings).toBeCloseTo(
        sumOf(row, (p) => p.superEarnings),
        6,
      );
      expect(row.superEarningsTax).toBeCloseTo(
        sumOf(row, (p) => p.superEarningsTax),
        6,
      );
      expect(row.fromSuper).toBeCloseTo(
        sumOf(row, (p) => p.fromSuper),
        6,
      );
      expect(row.superClosing).toBeCloseTo(
        sumOf(row, (p) => p.superClosing),
        6,
      );
      expect(row.superAccessible).toBe(row.people.some((p) => p.superAccessible));
      expect(row.investableClosing).toBeCloseTo(
        row.cashClosing + row.portfolioClosing + row.superClosing,
        6,
      );
    }
  });

  // The same holds with one person, where the sums must be exact, not just close.
  it("makes the household fields exactly the person's own with one person", () => {
    const onlyAlex: ProjectionInputs = { ...alexAndSam, people: [alexAndSam.people[0]] };

    for (const row of projectPortfolio(onlyAlex, 2026)) {
      expect(row.people).toHaveLength(1);
      expect(row.salary).toBe(row.people[0].salary);
      expect(row.employerContribution).toBe(row.people[0].employerContribution);
      expect(row.superClosing).toBe(row.people[0].superClosing);
      expect(row.fromSuper).toBe(row.people[0].fromSuper);
    }
  });

  // Each person ages one year per row, and the rows end when the youngest reaches the end age.
  it("runs until the youngest person reaches the end age, each person a year older per row", () => {
    const rows = projectPortfolio(alexAndSam, 2026);

    expect(rows).toHaveLength(70 - 48 + 1);
    expect(rows[0]?.people.map((personYear) => personYear.age)).toEqual([50, 48]);
    expect(rows[3]?.people.map((personYear) => personYear.age)).toEqual([53, 51]);
    expect(rows[rows.length - 1]?.people.map((personYear) => personYear.age)).toEqual([72, 70]);
    expect(rows[3]?.people.map((personYear) => personYear.personId)).toEqual(["alex", "sam"]);
  });

  // Alex's last working row is 2 and Sam's is 7: working, then one retired, then retired.
  it("moves from working, to one retired, to retired, and starts retirement spending last", () => {
    const rows = projectPortfolio(alexAndSam, 2026);

    expect(rows.slice(0, 3).map((row) => row.phase)).toEqual(["working", "working", "working"]);
    expect(rows.slice(3, 8).every((row) => row.phase === "oneRetired")).toBe(true);
    expect(rows.slice(8).every((row) => row.phase === "retired")).toBe(true);

    expect(rows[3]?.people.map((personYear) => personYear.phase)).toEqual(["retired", "working"]);
    expect(rows[3]?.spending).toBe(0);
    expect(rows[8]?.spending).toBeCloseTo(60_000 * 1.025 ** 8, 6);
    // Each person's salary stops in their own retirement year.
    expect(rows[3]?.people.map((personYear) => personYear.salary > 0)).toEqual([false, true]);
  });

  // The portfolio is paid into while any of its owners works, so a joint portfolio outlasts Alex's retirement.
  it("pays into the portfolio while any of its owners works", () => {
    const contributionRows = (personIds: string[]) =>
      projectPortfolio(
        { ...alexAndSam, contributionsStop: { kind: "whileWorking", personIds } },
        2026,
      )
        .map((row) => row.contribution)
        .slice(0, 10);

    // Alex works through row 2 (age 52), Sam through row 7 (age 55).
    expect(contributionRows(["alex"])).toEqual([0, 10_000, 10_000, 0, 0, 0, 0, 0, 0, 0]);
    expect(contributionRows(["alex", "sam"])).toEqual([
      0, 10_000, 10_000, 10_000, 10_000, 10_000, 10_000, 10_000, 0, 0,
    ]);
    expect(contributionRows(["sam"])).toEqual(contributionRows(["alex", "sam"]));
  });

  // Decision 2: with both partners' super drawable, each pays in proportion to their balance.
  it("draws accessible super from each person in proportion to their balance", () => {
    const bothRetiredAndPast65: ProjectionInputs = {
      ...alexAndSam,
      people: [
        {
          id: "alex",
          label: "Alex",
          currentAge: 65,
          retirementAge: 60,
          superAccount: { ...plainSuper, opening: 300_000 },
        },
        {
          id: "sam",
          label: "Sam",
          currentAge: 66,
          retirementAge: 60,
          superAccount: { ...plainSuper, opening: 100_000 },
        },
      ],
      endAge: 70,
      expectedReturn: 0,
      interestRate: 0,
      inflationRate: 0,
      portfolioOpening: 0,
      cashOpening: 0,
      retirementSpendingAnnual: 40_000,
      contributionsStop: { kind: "whileWorking", personIds: [] },
    };

    const firstYear = projectPortfolio(bothRetiredAndPast65, 2026)[1];

    expect(firstYear?.fromSuper).toBe(40_000);
    expect(firstYear?.people.map((personYear) => personYear.fromSuper)).toEqual([30_000, 10_000]);
    expect(firstYear?.people.map((personYear) => personYear.superClosing)).toEqual([
      270_000, 90_000,
    ]);
    expect(firstYear?.shortfall).toBe(0);
  });

  // A locked partner pays nothing, while the other's accessible super is drawn in full if need be.
  it("leaves a locked person's super alone", () => {
    const alexOpenSamLocked: ProjectionInputs = {
      ...alexAndSam,
      people: [
        {
          id: "alex",
          label: "Alex",
          currentAge: 65,
          retirementAge: 60,
          superAccount: { ...plainSuper, opening: 30_000 },
        },
        {
          id: "sam",
          label: "Sam",
          currentAge: 50,
          retirementAge: 50,
          superAccount: { ...plainSuper, opening: 100_000 },
        },
      ],
      endAge: 52,
      expectedReturn: 0,
      interestRate: 0,
      inflationRate: 0,
      portfolioOpening: 0,
      cashOpening: 0,
      retirementSpendingAnnual: 40_000,
      contributionsStop: { kind: "whileWorking", personIds: [] },
    };

    const firstYear = projectPortfolio(alexOpenSamLocked, 2026)[1];

    // Alex's $30,000 is all there is to draw; Sam's $100,000 is locked until 60.
    expect(firstYear?.people.map((personYear) => personYear.fromSuper)).toEqual([30_000, 0]);
    expect(firstYear?.shortfall).toBe(10_000);
    expect(firstYear?.people.map((personYear) => personYear.superAccessible)).toEqual([
      true,
      false,
    ]);
  });
});

// The helpers every engine module reads the household through.
describe("household helpers", () => {
  const alexAndSam: ProjectionInputs = {
    ...exampleB,
    people: [
      { id: "alex", label: "Alex", currentAge: 50, retirementAge: 52 },
      { id: "sam", label: "Sam", currentAge: 48, retirementAge: 55 },
    ],
    contributionsStop: { kind: "whileWorking", personIds: ["alex"] },
  };

  // The first retirement row is where the bridge starts; the household one is where everyone has stopped.
  it("finds the first and the household retirement rows", () => {
    expect(firstRetirementRowIndex(alexAndSam)).toBe(2);
    expect(householdRetirementRowIndex(alexAndSam)).toBe(7);
  });

  it("makes both rows the retirement row for one person", () => {
    expect(firstRetirementRowIndex(exampleB)).toBe(60);
    expect(householdRetirementRowIndex(exampleB)).toBe(60);
  });

  it("measures the end age on the youngest person", () => {
    expect(youngestAgeAtRow(alexAndSam, 0)).toBe(48);
    expect(youngestAgeAtRow(alexAndSam, 5)).toBe(53);
  });

  // `whileWorking` ends in its owners' last working year; `throughYear` is simply the year.
  it("finds the last year the portfolio is paid into, for both forms of the rule", () => {
    expect(lastPortfolioContributionYear(alexAndSam, 2026)).toBe(2028);
    expect(
      lastPortfolioContributionYear(
        { ...alexAndSam, contributionsStop: { kind: "whileWorking", personIds: ["alex", "sam"] } },
        2026,
      ),
    ).toBe(2033);
    expect(
      lastPortfolioContributionYear(
        { ...alexAndSam, contributionsStop: { kind: "throughYear", year: 2040 } },
        2026,
      ),
    ).toBe(2040);
  });

  it("changes one person's retirement age and leaves the others alone", () => {
    const changed = inputsWithRetirementAge(alexAndSam, 1, 60);

    expect(changed.people.map((person) => person.retirementAge)).toEqual([52, 60]);
    expect(alexAndSam.people[1]?.retirementAge).toBe(55);
  });

  // A shortfall is "with super locked" if anybody's balance is still locked, even when another's is open.
  it("flags a shortfall while somebody's super is locked and has a balance", () => {
    const personYear = (superAccessible: boolean, superClosing: number) => ({
      ...row(1, 0, 0).people[0],
      superAccessible,
      superClosing,
    });
    const shortRow = (people: ProjectionRow["people"]): ProjectionRow => ({
      ...row(1, 0, 0),
      shortfall: 100,
      people,
    });

    expect(isShortfallWithSuperLocked(shortRow([personYear(false, 500)]))).toBe(true);
    expect(
      isShortfallWithSuperLocked(shortRow([personYear(true, 0), personYear(false, 500)])),
    ).toBe(true);
    expect(isShortfallWithSuperLocked(shortRow([personYear(true, 500)]))).toBe(false);
    expect(isShortfallWithSuperLocked(shortRow([personYear(false, 0)]))).toBe(false);
  });
});
