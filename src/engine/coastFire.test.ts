import { describe, expect, it } from "vitest";

import { bundledRuleSet } from "../rules/bundledRuleSet";
import { calculateCoastFire } from "./coastFire";
import { projectPortfolio, type ProjectionInputs } from "./projection";

// Small hand-checkable cases for `calculateCoastFire`. Rates are all 0% here
// so every figure can be checked on paper; the worked examples
// (tests/worked-examples/m4-coast.json) cover real-world rates.

/** Age 40, retiring at 42, no growth anywhere, $100 cash, $200 portfolio, FI number $1,000. */
const flatInputs: ProjectionInputs = {
  currentAge: 40,
  endAge: 50,
  retirementAge: 42,
  expectedReturn: 0,
  interestRate: 0,
  inflationRate: 0,
  annualContribution: 0,
  contributionsStopAge: 42,
  portfolioOpening: 200,
  cashOpening: 100,
  livingAnnual: 40,
  retirementSpendingAnnual: 40,
  datedExpenses: [],
  fiNumberToday: 1000,
};

/** Runs the real projection, then Coast FIRE on its rows, as `summariseProjection` does. */
function coastFor(inputs: ProjectionInputs) {
  return calculateCoastFire(projectPortfolio(inputs, 2026), inputs);
}

// Tests for the Coast FIRE number and its path.
describe("calculateCoastFire", () => {
  // With nothing growing, coasting needs the whole FI number, split between cash and portfolio.
  it("is the FI number when nothing grows and there are no dated expenses", () => {
    const coast = coastFor(flatInputs);

    expect(coast.number.value).toBe(1000);
    expect(coast.path.map((point) => point.coastNumber)).toEqual([1000, 1000, 1000]);
    expect(coast.path.map((point) => point.portfolioNeeded)).toEqual([900, 900, 900]);
  });

  // A $150 expense in 2027 uses the $100 of cash and spills $50 to the portfolio.
  it("adds the part of a dated expense that cash can't pay", () => {
    const coast = coastFor({
      ...flatInputs,
      datedExpenses: [{ annual: 150, fromYear: 2027, toYear: 2027 }],
    });

    // (FI $1,000 − cash left $0 + spill $50) ÷ 1, plus $100 cash today.
    expect(coast.number.value).toBe(1150);
    // Once the expense has been paid (row 1) it no longer raises the number.
    expect(coast.path[1]?.coastNumber).toBe(1000);
    expect(coast.path[2]?.coastNumber).toBe(1000);
  });

  // The explanation line appears only when there is a dated expense to explain.
  it("shows the dated-expense line only when there are dated expenses", () => {
    const without = coastFor(flatInputs).number.lines.map((line) => line.label);
    const withExpense = coastFor({
      ...flatInputs,
      datedExpenses: [{ annual: 150, fromYear: 2027, toYear: 2027 }],
    }).number.lines.map((line) => line.label);

    expect(without.some((label) => label.startsWith("Dated expenses"))).toBe(false);
    expect(withExpense.some((label) => label.startsWith("Dated expenses"))).toBe(true);
    expect(withExpense[1]).toContain("after paying the dated expenses it can");
  });

  // After retirement, dated expenses are part of "does the money last", not of coasting.
  it("ignores dated expenses after the retirement year", () => {
    const coast = coastFor({
      ...flatInputs,
      datedExpenses: [{ annual: 5000, fromYear: 2029, toYear: 2029 }],
    });

    expect(coast.number.value).toBe(1000);
  });

  // With no years to wait, you need the FI number now: cash plus whatever the portfolio must add.
  it("handles a retirement age equal to the current age", () => {
    const coast = coastFor({ ...flatInputs, retirementAge: 40, contributionsStopAge: 40 });

    expect(coast.path).toHaveLength(1);
    expect(coast.number.value).toBe(1000);
    expect(coast.reached).toBeUndefined();
  });

  // Savings above the FI number at retirement: only the cash counts, and nothing more is needed.
  it("is just the cash when cash alone exceeds the FI number", () => {
    const coast = coastFor({ ...flatInputs, cashOpening: 5000 });

    expect(coast.number.value).toBe(5000);
    expect(coast.path[0]?.portfolioNeeded).toBe(0);
    expect(coast.reached).toMatchObject({ yearIndex: 0 });
  });

  // Row 0 reached means "already coasting"; otherwise the first row at or above the number.
  it("finds the first row where investable reaches the Coast FIRE number", () => {
    const coast = coastFor({
      ...flatInputs,
      portfolioOpening: 600,
      annualContribution: 150,
      contributionsStopAge: 42,
    });

    // Investable: 700, 850, 1000 against a Coast FIRE number of 1000 each year.
    expect(coast.reached).toMatchObject({ yearIndex: 2, calendarYear: 2028, age: 42 });
    expect(coast.reached?.explanation.lines.map((line) => line.label)).toEqual([
      "Investable at end of 2028 (age 42)",
      "Coast FIRE number in 2028",
      "Coast FIRE reached",
      "If you stop voluntary contributions after 2028: investable at 2028",
      "FI number at 2028",
    ]);
  });

  // The chart's "today's savings" line comes from the real projection with $0 contributions.
  it("runs the no-contributions path through the real projection", () => {
    const inputs = { ...flatInputs, annualContribution: 150 };
    const coast = coastFor(inputs);
    const expected = projectPortfolio({ ...inputs, annualContribution: 0 }, 2026);

    expect(coast.path.map((point) => point.withoutContributions)).toEqual(
      expected.slice(0, 3).map((row) => row.investableClosing),
    );
    // The current path does include the contributions.
    expect(coast.path[2]?.investable).toBeGreaterThan(coast.path[2]?.withoutContributions ?? 0);
  });

  // The labels the plan specifies, for example A.
  it("labels the breakdown as in the plan for example A", () => {
    const coast = coastFor({
      currentAge: 34,
      endAge: 95,
      retirementAge: 50,
      expectedReturn: 0.07,
      interestRate: 0.04,
      inflationRate: 0.025,
      annualContribution: 30000,
      contributionsStopAge: 50,
      portfolioOpening: 720000,
      cashOpening: 20000,
      livingAnnual: 64000,
      retirementSpendingAnnual: 64000,
      datedExpenses: [],
      fiNumberToday: 1600000,
    });

    expect(coast.number.lines.map((line) => [line.operator, line.label, line.unit])).toEqual([
      [undefined, "FI number at age 50 (2042)", "dollars"],
      ["−", "Your cash, growing at 4% to 2042", "dollars"],
      ["÷", "Portfolio growth at 7% over 16 years", "factor"],
      ["=", "Portfolio needed today", "dollars"],
      ["+", "Your cash today", "dollars"],
      ["=", "Coast FIRE number", "dollars"],
    ]);
    expect(coast.number.lines[2]?.value).toBeCloseTo(2.9522, 4);
  });
});

// Coast FIRE with super (M5 step 6), at 0% growth with no salary tax effects to keep it checkable.
describe("calculateCoastFire with super", () => {
  const withSuper: ProjectionInputs = {
    ...flatInputs,
    salary: { annual: 1000, growth: { kind: "none" } },
    superAccount: {
      opening: 300,
      returnRate: 0,
      employerRate: 0.1,
      earningsTaxRate: 0,
      salarySacrifice: { annual: 500 },
      nonConcessional: { annual: 50 },
      ruleSet: bundledRuleSet,
    },
  };

  // Employer: 10% x 1,000 = 100, less 15% tax = 85 a year, for 2 years: 300 + 170 = 470 at retirement.
  // Coasting leaves out the sacrifice and non-concessional contributions.
  it("counts super with employer contributions only: 1,000 - 100 cash - 470 super = 430 portfolio", () => {
    const coast = coastFor(withSuper);

    expect(coast.path[0]?.portfolioNeeded).toBeCloseTo(430, 6);
    expect(coast.number.value).toBeCloseTo(100 + 300 + 430, 6);
  });

  it("adds the super line to the breakdown, naming the return and the year", () => {
    const labels = coastFor(withSuper).number.lines.map((line) => line.label);

    expect(labels).toContain(
      "Your super, growing at 0% net of fees and tax, with employer contributions, to 2028",
    );
    expect(labels).toContain("Your super today");
  });

  it("leaves the breakdown as before when there is no super", () => {
    const labels = coastFor(flatInputs).number.lines.map((line) => line.label);

    expect(labels.some((label) => label.includes("super"))).toBe(false);
  });

  // Super alone covers the FI number, but a dated expense still has to be paid from the portfolio.
  it("needs the portfolio to pay a dated expense when cash and super already cover the FI number", () => {
    const coast = coastFor({
      ...withSuper,
      cashOpening: 0,
      portfolioOpening: 0,
      superAccount: { ...withSuper.superAccount!, opening: 2000 },
      datedExpenses: [{ annual: 70, fromYear: 2027, toYear: 2027 }],
    });

    expect(coast.path[0]?.portfolioNeeded).toBeCloseTo(70, 6);
  });
});

// The exact "reached" test (M5 step 6): decided by re-running the projection, not by the formula.
describe("Coast FIRE reached, decided exactly", () => {
  // The review's edge case: retiring at 65 with exactly the FI number in super, and a $1 dated
  // expense in 2053 (age 65), which super pays because it is accessible from 65. The formula's
  // super path leaves out dated expenses, so it thinks super is still $1,000 at retirement.
  const superPaysAtRetirement: ProjectionInputs = {
    ...flatInputs,
    currentAge: 38,
    endAge: 70,
    retirementAge: 65,
    contributionsStopAge: 65,
    portfolioOpening: 0,
    cashOpening: 0,
    datedExpenses: [{ annual: 1, fromYear: 2053, toYear: 2053 }],
    superAccount: {
      opening: 1000,
      returnRate: 0,
      salarySacrifice: { annual: 0 },
      nonConcessional: { annual: 0 },
      ruleSet: bundledRuleSet,
    },
  };

  it("does not say reached when super pays a dated expense at 65 and ends a dollar short", () => {
    const coast = coastFor(superPaysAtRetirement);
    const lastPoint = coast.path[coast.path.length - 1];

    // The formula (the number and chart line) is a dollar optimistic here: at the retirement row
    // it asks for $999, the super left after the draw, instead of the $1,000 FI number...
    expect(lastPoint?.coastNumber).toBeCloseTo(999, 6);
    expect(lastPoint?.investable).toBeCloseTo(999, 6);
    // ...but the exact test sees that stopping at any row ends at $999, below $1,000.
    expect(coast.reached).toBeUndefined();
  });

  it("appends the exact test's two lines to the explanation", () => {
    const labels = coastFor({
      ...superPaysAtRetirement,
      superAccount: { ...superPaysAtRetirement.superAccount!, opening: 1001 },
    }).reached?.explanation.lines.map((line) => line.label);

    expect(labels?.slice(-2)).toEqual([
      expect.stringMatching(
        /^If you stop voluntary contributions after \d{4}: investable at 2053$/,
      ),
      "FI number at 2053",
    ]);
  });
});
