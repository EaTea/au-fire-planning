import { describe, expect, it } from "vitest";

import { calculateIncomeTax } from "../../src/engine/incomeTax";
import { bundledRuleSet } from "../../src/rules/bundledRuleSet";
import { rulesForYear } from "../../src/rules/ruleSet";

// Checks calculateIncomeTax against the independently worked tax cases (T1 to
// T14) in tests/worked-examples/m8-tax.json (NFR-6). Each case goes through
// rulesForYear with the bundled rule set, so the choice of file for the year
// (16%, 15%, 14% bottom rate) and indexation after the latest file are tested too.

/** One tax case in the fixture (see tests/worked-examples/README.md). */
interface TaxCase {
  readonly name: string;
  readonly checkedBy: string;
  readonly year: number;
  readonly inflationRate: number;
  readonly taxableIncome: number;
  readonly expected: {
    readonly bracketTax: number;
    readonly lowIncomeTaxOffset: number;
    readonly incomeTax: number;
    readonly medicareLevy: number;
    readonly total: number;
  };
}

const fixtureFiles = import.meta.glob<{ readonly taxCases: readonly TaxCase[] }>(
  "../worked-examples/m8-tax.json",
  { eager: true, import: "default" },
);
const fixture = Object.values(fixtureFiles)[0] ?? { taxCases: [] };

/** Asserts two figures agree to the cent (within half a cent). */
function expectToTheCent(actual: number, expected: number, label: string) {
  expect(Math.abs(actual - expected), label).toBeLessThan(0.005);
}

describe("M8 tax worked examples", () => {
  it("has the fourteen cases T1 to T14", () => {
    expect(fixture.taxCases.map((taxCase) => taxCase.name)).toEqual(
      Array.from({ length: 14 }, (_unused, index) => `T${index + 1}`),
    );
  });

  it.each(fixture.taxCases.map((taxCase) => [taxCase.name, taxCase] as const))(
    "%s",
    (_name, taxCase) => {
      expect(taxCase.checkedBy).not.toBe("");

      const rules = rulesForYear(bundledRuleSet, taxCase.year, taxCase.inflationRate).incomeTax;
      const result = calculateIncomeTax(taxCase.taxableIncome, rules);

      expectToTheCent(result.bracketTax, taxCase.expected.bracketTax, "bracket tax");
      expectToTheCent(
        result.lowIncomeTaxOffsetApplied,
        taxCase.expected.lowIncomeTaxOffset,
        "offset",
      );
      expectToTheCent(result.incomeTax, taxCase.expected.incomeTax, "income tax");
      expectToTheCent(result.medicareLevy, taxCase.expected.medicareLevy, "Medicare levy");
      expectToTheCent(result.value, taxCase.expected.total, "total");
    },
  );
});
