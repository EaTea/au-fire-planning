import { describe, expect, it } from "vitest";

import { calculateIncomeTax } from "./incomeTax";
import { bundledRuleSet } from "../rules/bundledRuleSet";
import { rulesForYear } from "../rules/ruleSet";

// Unit tests for the shape of calculateIncomeTax's working. The figures
// themselves are checked against the worked examples (tests/unit/taxExamples.test.ts).

const rules2026 = rulesForYear(bundledRuleSet, 2026, 0).incomeTax;

describe("calculateIncomeTax", () => {
  it("shows one line per bracket reached, then the offset, the levy and the total", () => {
    const result = calculateIncomeTax(100_000, rules2026);

    expect(result.lines.map((line) => line.label)).toEqual([
      "Tax on income from $0 to $18,200 at 0%",
      "Tax on income from $18,200 to $45,000 at 16%",
      "Tax on income above $45,000 at 30%",
      "Low income tax offset",
      "Medicare levy (2%, shaded in at low incomes)",
      "Tax payable",
    ]);
    expect(result.lines.map((line) => line.operator)).toEqual([undefined, "+", "+", "−", "+", "="]);
    expect(result.lines.at(-1)?.value).toBeCloseTo(22_788);
  });

  it("leaves out brackets the income doesn't reach", () => {
    const result = calculateIncomeTax(30_000, rules2026);

    expect(result.lines).toHaveLength(2 + 3);
    expect(result.lines[0]?.label).toBe("Tax on income from $0 to $18,200 at 0%");
    expect(result.lines[1]?.label).toBe("Tax on income above $18,200 at 16%");
  });

  it("caps the offset at the bracket tax", () => {
    const result = calculateIncomeTax(27_222, rules2026);

    expect(result.bracketTax).toBeCloseTo(1_443.52);
    expect(result.lowIncomeTaxOffsetApplied).toBe(700);

    const smallIncome = calculateIncomeTax(20_000, rules2026);
    // 16% of $1,800 is $288, so only $288 of the $700 offset is used.
    expect(smallIncome.lowIncomeTaxOffsetApplied).toBeCloseTo(288);
    expect(smallIncome.incomeTax).toBe(0);
  });

  it("treats negative and non-finite income as $0 without throwing", () => {
    for (const badIncome of [-1, -50_000, Number.NaN, Infinity, -Infinity]) {
      const result = calculateIncomeTax(badIncome, rules2026);

      expect(result.value, String(badIncome)).toBe(0);
      expect(result.lines.length).toBeGreaterThan(0);
      expect(result.lines.at(-1)?.operator).toBe("=");
    }
  });
});
