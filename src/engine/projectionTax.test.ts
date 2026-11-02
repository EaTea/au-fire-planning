import { describe, expect, it } from "vitest";

import { bundledRuleSet } from "../rules/bundledRuleSet";
import { projectPortfolio, type ProjectionInputs, type ProjectionPerson } from "./projection";
import { onePersonInputs } from "./testing/onePersonInputs";

// Unit tests for the income tax fields of each projection row (M8 step 3).
// The independent figures (examples F, G, H and A) are in
// tests/worked-examples/m8-tax.json; these tests cover the mechanics:
// row 0, the sum over people, the equal split of cash interest, and that
// tax does not (yet) change any balance.

const START_YEAR = 2026;

/** One person, aged 40, retiring at 42, on a flat $100,000 salary, with cash earning interest. */
function workingPersonInputs(interestRate: number, cashOpening: number): ProjectionInputs {
  return onePersonInputs({
    currentAge: 40,
    endAge: 45,
    retirementAge: 42,
    expectedReturn: 0,
    interestRate,
    inflationRate: 0,
    annualContribution: 0,
    portfolioOpening: 100_000,
    cashOpening,
    livingAnnual: 60_000,
    retirementSpendingAnnual: 60_000,
    datedExpenses: [],
    fiNumberToday: 1_000_000,
    salary: { annual: 100_000, growth: { kind: "none" } },
  });
}

describe("tax in the projection rows", () => {
  it("is zero in row 0, which has no flows", () => {
    const [today] = projectPortfolio(workingPersonInputs(0.04, 20_000), START_YEAR);

    expect(today?.tax).toBe(0);
    expect(today?.people[0].taxableIncome).toBe(0);
    expect(today?.people[0].incomeTax).toBe(0);
    expect(today?.people[0].medicareLevy).toBe(0);
    expect(today?.people[0].tax).toBe(0);
  });

  it("taxes salary less salary sacrifice, plus the cash interest", () => {
    const inputs = workingPersonInputs(0.04, 20_000);
    const [person] = inputs.people;
    const withSacrifice: ProjectionInputs = {
      ...inputs,
      people: [
        {
          ...(person as ProjectionPerson),
          superAccount: {
            opening: 0,
            returnRate: 0,
            salarySacrifice: { annual: 10_000 },
            nonConcessional: { annual: 0 },
            ruleSet: bundledRuleSet,
          },
        },
      ],
    };

    const row = projectPortfolio(withSacrifice, START_YEAR)[1];

    // $100,000 − $10,000 + 4% of $20,000.
    expect(row?.people[0].taxableIncome).toBeCloseTo(90_800);
  });

  it("splits incomeTax and medicareLevy, which add up to the person's tax and the row's tax", () => {
    const row = projectPortfolio(workingPersonInputs(0, 0), START_YEAR)[1];

    // Example F, 2027: income tax $20,520 and Medicare levy $2,000.
    expect(row?.people[0].incomeTax).toBeCloseTo(20_520);
    expect(row?.people[0].medicareLevy).toBeCloseTo(2_000);
    expect(row?.people[0].tax).toBeCloseTo(22_520);
    expect(row?.tax).toBeCloseTo(22_520);
  });

  it("uses each row's own year rules: 15% in 2027, 14% in 2028", () => {
    const rows = projectPortfolio(workingPersonInputs(0, 0), START_YEAR);

    expect(rows[1]?.tax).toBeCloseTo(22_520);
    expect(rows[2]?.tax).toBeCloseTo(22_252);
  });

  it("has no tax once retired with no cash interest", () => {
    const rows = projectPortfolio(workingPersonInputs(0, 0), START_YEAR);

    expect(rows[3]?.tax).toBe(0);
    expect(rows[3]?.people[0].taxableIncome).toBe(0);
  });

  it("splits cash interest equally between two people and sums their tax", () => {
    const people: ProjectionInputs["people"] = [
      { id: "a", label: "A", currentAge: 60, retirementAge: 60 },
      { id: "b", label: "B", currentAge: 60, retirementAge: 60 },
    ];
    const inputs: ProjectionInputs = {
      ...workingPersonInputs(0.04, 600_000),
      people,
      endAge: 63,
      retirementSpendingAnnual: 40_000,
    };

    const row = projectPortfolio(inputs, START_YEAR)[1];

    // $24,000 of interest, $12,000 each: under the tax-free threshold.
    expect(row?.people[0].taxableIncome).toBeCloseTo(12_000);
    expect(row?.people[1]?.taxableIncome).toBeCloseTo(12_000);
    expect(row?.tax).toBe(0);
  });

  it("does not change any balance in this step", () => {
    const row = projectPortfolio(workingPersonInputs(0, 0), START_YEAR)[1];

    // Pay is assumed to cover living costs and nothing is drawn: the portfolio and
    // cash are untouched by the $22,520 of tax until PR B funds it.
    expect(row?.portfolioClosing).toBe(100_000);
    expect(row?.cashClosing).toBe(0);
    expect(row?.fromPortfolio).toBe(0);
  });
});
