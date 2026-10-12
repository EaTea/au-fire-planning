import { describe, expect, it } from "vitest";

import { bundledRuleSet } from "../rules/bundledRuleSet";
import {
  effectiveSuperAccessAge,
  projectPortfolio,
  type ProjectionInputs,
  type ProjectionSuper,
} from "./projection";

// Unit tests for super accumulation and access (M5 step 5), one rule at a
// time. The whole-plan figures are in tests/worked-examples/m5-super.json.

/** The default super account: nothing in it, no return, no voluntary contributions. */
const emptySuper: ProjectionSuper = {
  opening: 0,
  returnRate: 0,
  salarySacrifice: { annual: 0 },
  nonConcessional: { annual: 0 },
  ruleSet: bundledRuleSet,
};

/** A person aged 40 who retires at 42 with no inflation and no money outside super. */
function inputsWith(overrides: Partial<ProjectionInputs>): ProjectionInputs {
  return {
    currentAge: 40,
    endAge: 44,
    retirementAge: 42,
    expectedReturn: 0,
    interestRate: 0,
    inflationRate: 0,
    annualContribution: 0,
    contributionsStopAge: 42,
    portfolioOpening: 0,
    cashOpening: 0,
    livingAnnual: 0,
    retirementSpendingAnnual: 0,
    datedExpenses: [],
    fiNumberToday: 1_000_000,
    ...overrides,
  };
}

describe("super contributions", () => {
  it("pays employer contributions at the legislated rate when no rate is set", () => {
    const rows = projectPortfolio(
      inputsWith({
        salary: { annual: 100_000, growth: { kind: "none" } },
        superAccount: emptySuper,
      }),
      2026,
    );

    expect(rows[1]?.employerContribution).toBeCloseTo(12_000, 6);
  });

  it("uses the user's employer rate instead of the legislated one", () => {
    const rows = projectPortfolio(
      inputsWith({
        salary: { annual: 100_000, growth: { kind: "none" } },
        superAccount: { ...emptySuper, employerRate: 0.1 },
      }),
      2026,
    );

    expect(rows[1]?.employerContribution).toBeCloseTo(10_000, 6);
  });

  it("caps employer contributions at the rate times the maximum contribution base", () => {
    const rows = projectPortfolio(
      inputsWith({
        salary: { annual: 300_000, growth: { kind: "none" } },
        superAccount: emptySuper,
      }),
      2026,
    );

    // Row 1 is 2027: the FY2025-26 base of $250,000 grown one year at 0% inflation.
    expect(rows[1]?.employerContribution).toBeCloseTo(30_000, 6);
    expect(rows[1]?.contributionsTax).toBeCloseTo(4_500, 6);
    expect(rows[1]?.superClosing).toBeCloseTo(25_500, 6);
  });

  it("works employer contributions out on salary before salary sacrifice", () => {
    const rows = projectPortfolio(
      inputsWith({
        salary: { annual: 100_000, growth: { kind: "none" } },
        superAccount: { ...emptySuper, salarySacrifice: { annual: 20_000 } },
      }),
      2026,
    );

    expect(rows[1]?.employerContribution).toBeCloseTo(12_000, 6);
    expect(rows[1]?.salarySacrifice).toBe(20_000);
    expect(rows[1]?.contributionsTax).toBeCloseTo(4_800, 6);
  });

  it("pays salary sacrifice only while working and within its years", () => {
    const rows = projectPortfolio(
      inputsWith({
        salary: { annual: 100_000, growth: { kind: "none" } },
        superAccount: {
          ...emptySuper,
          salarySacrifice: { annual: 10_000, fromYear: 2028, toYear: 2030 },
        },
      }),
      2026,
    );

    // 2027 is before its years, 2028 is in them, 2029 and 2030 are retired.
    expect(rows.map((row) => row.salarySacrifice)).toEqual([0, 0, 10_000, 0, 0]);
  });

  it("pays no salary sacrifice after retirement, even when its years say so", () => {
    const rows = projectPortfolio(
      inputsWith({
        salary: { annual: 100_000, growth: { kind: "none" } },
        superAccount: { ...emptySuper, salarySacrifice: { annual: 10_000, toYear: 2040 } },
      }),
      2026,
    );

    expect(rows[3]?.salarySacrifice).toBe(0);
  });

  it("pays non-concessional contributions after retirement, untaxed, in their years", () => {
    const rows = projectPortfolio(
      inputsWith({
        superAccount: {
          ...emptySuper,
          nonConcessional: { annual: 20_000, fromYear: 2029, toYear: 2030 },
        },
      }),
      2026,
    );

    expect(rows.map((row) => row.nonConcessional)).toEqual([0, 0, 0, 20_000, 20_000]);
    expect(rows[3]?.contributionsTax).toBe(0);
    expect(rows[4]?.superClosing).toBe(40_000);
  });

  it("defaults voluntary contributions to the retirement year when no end year is set", () => {
    const rows = projectPortfolio(
      inputsWith({
        superAccount: { ...emptySuper, nonConcessional: { annual: 1_000 } },
      }),
      2026,
    );

    expect(rows.map((row) => row.nonConcessional)).toEqual([0, 1_000, 1_000, 0, 0]);
  });

  it("pays nothing without salary or voluntary contributions", () => {
    const rows = projectPortfolio(inputsWith({ superAccount: emptySuper }), 2026);

    expect(rows.every((row) => row.employerContribution === 0)).toBe(true);
  });

  it("grows the contribution base with inflation beyond the latest rules file", () => {
    const rows = projectPortfolio(
      inputsWith({
        currentAge: 40,
        endAge: 60,
        retirementAge: 60,
        inflationRate: 0.1,
        salary: { annual: 10_000_000, growth: { kind: "none" } },
        superAccount: emptySuper,
      }),
      2026,
    );

    // 2027 is one year beyond the FY2025-26 file's 2026, so $250,000 × 1.1.
    expect(rows[1]?.employerContribution).toBeCloseTo(0.12 * 250_000 * 1.1, 4);
    expect(rows[2]?.employerContribution).toBeCloseTo(0.12 * 250_000 * 1.21, 4);
  });
});

describe("super earnings", () => {
  it("taxes earnings at the legislated 15% by default", () => {
    const rows = projectPortfolio(
      inputsWith({ superAccount: { ...emptySuper, opening: 50_000, returnRate: 0.08 } }),
      2026,
    );

    expect(rows[1]?.superEarnings).toBeCloseTo(4_000, 6);
    expect(rows[1]?.superEarningsTax).toBeCloseTo(600, 6);
    expect(rows[1]?.superClosing).toBeCloseTo(53_400, 6);
  });

  it("uses the account's own earnings tax rate when set", () => {
    const rows = projectPortfolio(
      inputsWith({
        superAccount: { ...emptySuper, opening: 50_000, returnRate: 0.08, earningsTaxRate: 0.1 },
      }),
      2026,
    );

    expect(rows[1]?.superEarningsTax).toBeCloseTo(400, 6);
  });
});

describe("drawing on super", () => {
  /** Aged 60, retired, only super ($500,000 at 0%), spending $20,000 a year until 67. */
  const lockedSuper = inputsWith({
    currentAge: 60,
    endAge: 67,
    retirementAge: 60,
    retirementSpendingAnnual: 20_000,
    superAccount: { ...emptySuper, opening: 500_000 },
  });

  it("does not draw before 65: those years are shortfalls", () => {
    const rows = projectPortfolio(lockedSuper, 2026);

    for (const row of rows.filter((candidate) => candidate.age >= 61 && candidate.age <= 64)) {
      expect(row.fromSuper).toBe(0);
      expect(row.shortfall).toBe(20_000);
      expect(row.superClosing).toBe(500_000);
    }
  });

  it("draws from 65, once the portfolio is empty", () => {
    const rows = projectPortfolio(
      { ...lockedSuper, cashOpening: 5_000, portfolioOpening: 10_000 },
      2026,
    );
    const age65 = rows.find((row) => row.age === 65);

    // The portfolio, then cash, paid what they could before 65, so by 65 both are empty.
    expect(age65?.fromCash).toBe(0);
    expect(age65?.fromPortfolio).toBe(0);
    expect(age65?.fromSuper).toBe(20_000);
    expect(age65?.shortfall).toBe(0);
  });

  it("draws the portfolio first, then super, and leaves cash until last (cash drawn last)", () => {
    const rows = projectPortfolio(
      { ...lockedSuper, currentAge: 64, cashOpening: 5_000, portfolioOpening: 8_000 },
      2026,
    );

    // Age 65: $8,000 from the portfolio, the other $12,000 from super, and cash untouched.
    expect(rows[1]?.fromPortfolio).toBe(8_000);
    expect(rows[1]?.fromSuper).toBe(12_000);
    expect(rows[1]?.fromCash).toBe(0);
    expect(rows[1]?.superClosing).toBe(488_000);
    expect(rows[1]?.cashClosing).toBe(5_000);
  });

  it("draws cash only when the portfolio and super can't fund the year", () => {
    const rows = projectPortfolio(
      {
        ...lockedSuper,
        currentAge: 64,
        cashOpening: 5_000,
        superAccount: { ...emptySuper, opening: 16_000 },
      },
      2026,
    );

    // Age 65: all $16,000 of super, then $4,000 of the $5,000 cash.
    expect(rows[1]?.fromSuper).toBe(16_000);
    expect(rows[1]?.fromCash).toBe(4_000);
    expect(rows[1]?.cashClosing).toBe(1_000);
    expect(rows[1]?.shortfall).toBe(0);
  });

  it("counts super in investable net worth", () => {
    const rows = projectPortfolio(
      { ...lockedSuper, cashOpening: 1_000, portfolioOpening: 2_000 },
      2026,
    );

    expect(rows[0]?.investableClosing).toBe(503_000);
  });
});

// M6 step 2: the condition of release, branch by branch. Aged 55 with $100,000
// of super and nothing outside it, spending $20,000 a year from retirement.
// The B1 to B3 worked examples are in tests/worked-examples/m6-bridge.json.
describe("the condition of release", () => {
  /** Aged 55 with only super, retiring at `retirementAge` with the given access age. */
  function onlySuper(retirementAge: number, accessAge?: number): ProjectionInputs {
    return inputsWith({
      currentAge: 55,
      endAge: 70,
      retirementAge,
      retirementSpendingAnnual: 20_000,
      superAccount: {
        ...emptySuper,
        opening: 100_000,
        ...(accessAge === undefined ? {} : { accessAge }),
      },
    });
  }

  /** The ages at which the rows say super is accessible. */
  function accessibleAges(inputs: ProjectionInputs): number[] {
    return projectPortfolio(inputs, 2026)
      .filter((row) => row.superAccessible)
      .map((row) => row.age);
  }

  it("opens at the access age when retiring before it", () => {
    expect(accessibleAges(onlySuper(56, 60))[0]).toBe(60);
  });

  it("opens in the first retired year when retiring after the access age but before 65", () => {
    expect(accessibleAges(onlySuper(61, 60))[0]).toBe(62);
  });

  it("opens in the first retired year when retiring at the access age", () => {
    expect(accessibleAges(onlySuper(60, 60))[0]).toBe(61);
  });

  it("opens at 65 regardless of retirement and the access age", () => {
    // Still working at 65, and the access age is 65 anyway: accessible from 65 on.
    expect(accessibleAges(onlySuper(68, 63))[0]).toBe(65);
    expect(accessibleAges(onlySuper(56))[0]).toBe(65);
  });

  it("never opens before the preservation age, even with a lower access age asked for", () => {
    expect(accessibleAges(onlySuper(56, 55))[0]).toBe(60);
  });

  it("clamps an access age above 65 to 65", () => {
    expect(accessibleAges(onlySuper(56, 70))[0]).toBe(65);
  });

  it("is never accessible when there is no super account", () => {
    const rows = projectPortfolio(inputsWith({ currentAge: 55, endAge: 70 }), 2026);

    expect(rows.some((row) => row.superAccessible)).toBe(false);
  });

  it("draws super only in accessible years", () => {
    const rows = projectPortfolio(onlySuper(56, 60), 2026);

    for (const row of rows) {
      if (!row.superAccessible) expect(row.fromSuper).toBe(0);
    }
    expect(rows.find((row) => row.age === 60)?.fromSuper).toBe(20_000);
  });
});

describe("effectiveSuperAccessAge", () => {
  const withSuper = (retirementAge: number, accessAge?: number) =>
    inputsWith({
      currentAge: 55,
      endAge: 70,
      retirementAge,
      superAccount: { ...emptySuper, ...(accessAge === undefined ? {} : { accessAge }) },
    });

  it("is the access age when retiring before it", () => {
    expect(effectiveSuperAccessAge(withSuper(56, 60), 2026)).toBe(60);
    expect(effectiveSuperAccessAge(withSuper(56), 2026)).toBe(65);
  });

  it("is the year after retirement when retiring at or after the access age", () => {
    expect(effectiveSuperAccessAge(withSuper(61, 60), 2026)).toBe(62);
    expect(effectiveSuperAccessAge(withSuper(60, 60), 2026)).toBe(61);
  });

  it("is capped at 65 and clamped to the preservation age", () => {
    expect(effectiveSuperAccessAge(withSuper(70, 60), 2026)).toBe(65);
    expect(effectiveSuperAccessAge(withSuper(56, 50), 2026)).toBe(60);
  });

  it("agrees with the first row where super is accessible after retiring", () => {
    for (const [retirementAge, accessAge] of [
      [56, 60],
      [61, 60],
      [60, 62],
      [56, undefined],
    ] as const) {
      const inputs = withSuper(retirementAge, accessAge);
      const firstRetiredAccessibleAge = projectPortfolio(inputs, 2026).find(
        (row) => row.superAccessible && row.phase === "retired",
      )?.age;

      expect(effectiveSuperAccessAge(inputs, 2026)).toBe(firstRetiredAccessibleAge);
    }
  });

  it("is undefined when there is no super account", () => {
    expect(effectiveSuperAccessAge(inputsWith({}), 2026)).toBeUndefined();
  });
});
