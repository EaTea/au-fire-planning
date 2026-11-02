// Unit tests for the rules data: the bundled files, the wire schema, the
// wire → internal mapping and the year lookup.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { bundledRuleSet } from "./bundledRuleSet";
import { parseRulesFile, type RulesFileV1 } from "./rulesFile";
import { rulesForYear, ruleSetFromWire } from "./ruleSet";

const dataDirectory = join(__dirname, "data");

/** A valid income tax wire section with the given bottom rate, for tests that need one. */
function sampleIncomeTax(bottomRatePercent: number): NonNullable<RulesFileV1["incomeTax"]> {
  return {
    residentBrackets: [
      { fromDollars: 0, ratePercent: 0 },
      { fromDollars: 18200, ratePercent: bottomRatePercent },
      { fromDollars: 45000, ratePercent: 30 },
      { fromDollars: 135000, ratePercent: 37 },
      { fromDollars: 190000, ratePercent: 45 },
    ],
    lowIncomeTaxOffset: {
      maximumDollars: 700,
      firstThresholdDollars: 37500,
      firstReductionPercent: 5,
      secondThresholdDollars: 45000,
      secondReductionPercent: 1.5,
    },
    medicareLevy: { ratePercent: 2, lowIncomeThresholdDollars: 27222, shadeInPercent: 10 },
  };
}

/** A valid FY2025-26 wire file that tests copy and tweak. */
function sampleRulesFile(overrides: Partial<RulesFileV1> = {}): RulesFileV1 {
  const url = "https://example.gov.au/rule";

  return {
    schemaVersion: 1,
    financialYear: "2025-26",
    effectiveFrom: "2025-07-01",
    verification: { status: "verified" },
    superannuation: {
      guaranteeRatePercent: 12,
      maximumContributionBaseQuarterlyDollars: 62500,
      contributionsTaxPercent: 15,
      earningsTaxPercent: 15,
      discountedCapitalGainsTaxPercent: 10,
      preservationAgeYears: 60,
      unconditionalReleaseAgeYears: 65,
    },
    incomeTax: sampleIncomeTax(16),
    sources: {
      residentBrackets: url,
      lowIncomeTaxOffset: url,
      medicareLevy: url,
      guaranteeRatePercent: url,
      maximumContributionBaseQuarterlyDollars: url,
      contributionsTaxPercent: url,
      earningsTaxPercent: url,
      discountedCapitalGainsTaxPercent: url,
      preservationAgeYears: url,
      unconditionalReleaseAgeYears: url,
    },
    ...overrides,
  };
}

describe("bundled rules data", () => {
  it("parses every file in src/rules/data/", () => {
    const fileNames = readdirSync(dataDirectory).filter((name) => name.endsWith(".json"));
    expect(fileNames.length).toBeGreaterThan(0);

    for (const fileName of fileNames) {
      const json: unknown = JSON.parse(readFileSync(join(dataDirectory, fileName), "utf8"));
      expect(() => parseRulesFile(json), fileName).not.toThrow();
    }
  });

  it("builds the bundled rule set with the FY2025-26 values", () => {
    const rules = rulesForYear(bundledRuleSet, 2026, 0.025);

    expect(rules.financialYear).toBe("2025-26");
    expect(rules.superannuation.guaranteeRate).toBeCloseTo(0.12);
    expect(rules.superannuation.maximumContributionBaseAnnualDollars).toBe(250000);
    expect(rules.superannuation.contributionsTaxRate).toBeCloseTo(0.15);
    expect(rules.superannuation.earningsTaxRate).toBeCloseTo(0.15);
    expect(rules.superannuation.discountedCapitalGainsTaxRate).toBeCloseTo(0.1);
    expect(rules.superannuation.preservationAgeYears).toBe(60);
    expect(rules.superannuation.unconditionalReleaseAgeYears).toBe(65);
  });

  it("is marked unverified, with a note naming the two M6 values, until the owner checks them", () => {
    const [snapshot] = bundledRuleSet.snapshots;

    expect(snapshot?.verificationStatus).toBe("unverified");
    expect(snapshot?.verificationNote).toContain("preservationAgeYears");
    expect(snapshot?.verificationNote).toContain("unconditionalReleaseAgeYears");
    expect(snapshot?.sourceUrls.preservationAgeYears).toMatch(/\/preservation-age$/);
    expect(snapshot?.sourceUrls.unconditionalReleaseAgeYears).toMatch(/\/conditions-of-release$/);
  });
});

describe("rules file schema", () => {
  it("accepts a valid file", () => {
    expect(parseRulesFile(sampleRulesFile()).financialYear).toBe("2025-26");
  });

  it("rejects a file with a missing field", () => {
    const { schemaVersion, ...withoutVersion } = sampleRulesFile();
    void schemaVersion;
    expect(() => parseRulesFile(withoutVersion)).toThrow();

    const missingRate = sampleRulesFile();
    const brokenSuper: Record<string, unknown> = { ...missingRate.superannuation };
    delete brokenSuper.earningsTaxPercent;
    expect(() => parseRulesFile({ ...missingRate, superannuation: brokenSuper })).toThrow();
  });

  it("rejects a file with neither section", () => {
    const { superannuation, incomeTax, ...withoutSections } = sampleRulesFile();
    void superannuation;
    void incomeTax;
    expect(() => parseRulesFile(withoutSections)).toThrow();
  });

  it("accepts a file with only the incomeTax section and its sources", () => {
    const { superannuation, ...incomeTaxOnly } = sampleRulesFile();
    void superannuation;

    expect(parseRulesFile(incomeTaxOnly).incomeTax?.medicareLevy.ratePercent).toBe(2);
  });

  it("accepts a file with only the superannuation section and its sources", () => {
    const { incomeTax, ...superOnly } = sampleRulesFile();
    void incomeTax;

    expect(parseRulesFile(superOnly).superannuation?.guaranteeRatePercent).toBe(12);
  });

  it("rejects a section whose sources are missing", () => {
    const file = sampleRulesFile();

    const withoutTaxSource: Record<string, unknown> = { ...file.sources };
    delete withoutTaxSource.medicareLevy;
    expect(() => parseRulesFile({ ...file, sources: withoutTaxSource })).toThrow();

    // Super's sources don't count for an incomeTax-only file, and vice versa.
    const { superannuation, ...incomeTaxOnly } = file;
    void superannuation;
    const onlySuperSources: Record<string, unknown> = {};
    for (const [key, url] of Object.entries(file.sources)) {
      if (!["residentBrackets", "lowIncomeTaxOffset", "medicareLevy"].includes(key)) {
        onlySuperSources[key] = url;
      }
    }
    expect(() => parseRulesFile({ ...incomeTaxOnly, sources: onlySuperSources })).toThrow();
  });

  it("rejects an offset whose first threshold is above its second", () => {
    const file = sampleRulesFile();
    const offset = file.incomeTax?.lowIncomeTaxOffset;
    const backwards = {
      ...file.incomeTax,
      lowIncomeTaxOffset: {
        ...offset,
        firstThresholdDollars: 50_000,
        secondThresholdDollars: 45_000,
      },
    };

    expect(() => parseRulesFile({ ...file, incomeTax: backwards })).toThrow();
  });

  it("rejects brackets that don't start at $0 or don't increase", () => {
    const file = sampleRulesFile();
    const brackets = file.incomeTax?.residentBrackets ?? [];

    const notFromZero = { ...file.incomeTax, residentBrackets: brackets.slice(1) };
    expect(() => parseRulesFile({ ...file, incomeTax: notFromZero })).toThrow();

    const outOfOrder = { ...file.incomeTax, residentBrackets: [...brackets].reverse() };
    expect(() => parseRulesFile({ ...file, incomeTax: outOfOrder })).toThrow();
  });

  it("rejects a missing source link and a missing verification", () => {
    const withoutSource: Record<string, unknown> = { ...sampleRulesFile().sources };
    delete withoutSource.guaranteeRatePercent;
    expect(() => parseRulesFile({ ...sampleRulesFile(), sources: withoutSource })).toThrow();

    const { verification, ...withoutVerification } = sampleRulesFile();
    void verification;
    expect(() => parseRulesFile(withoutVerification)).toThrow();
  });

  it("rejects a missing or non-whole age and a missing age source", () => {
    const file = sampleRulesFile();

    const withoutPreservation: Record<string, unknown> = { ...file.superannuation };
    delete withoutPreservation.preservationAgeYears;
    expect(() => parseRulesFile({ ...file, superannuation: withoutPreservation })).toThrow();

    const fractional = {
      ...file,
      superannuation: { ...file.superannuation, unconditionalReleaseAgeYears: 65.5 },
    };
    expect(() => parseRulesFile(fractional)).toThrow();

    const withoutSource: Record<string, unknown> = { ...file.sources };
    delete withoutSource.unconditionalReleaseAgeYears;
    expect(() => parseRulesFile({ ...file, sources: withoutSource })).toThrow();
  });

  it("rejects a negative rate", () => {
    const file = sampleRulesFile();
    const negative = {
      ...file,
      superannuation: { ...file.superannuation, guaranteeRatePercent: -1 },
    };
    expect(() => parseRulesFile(negative)).toThrow();
  });

  it("accepts verified and unverified statuses only", () => {
    const unverified = sampleRulesFile({ verification: { status: "unverified", note: "x" } });
    expect(parseRulesFile(unverified).verification.status).toBe("unverified");

    const bogus = { ...sampleRulesFile(), verification: { status: "maybe" } };
    expect(() => parseRulesFile(bogus)).toThrow();
  });
});

describe("ruleSetFromWire", () => {
  it("converts percent to fraction and quarterly to annual", () => {
    const [snapshot] = ruleSetFromWire([sampleRulesFile()]).snapshots;

    expect(snapshot?.superannuation?.guaranteeRate).toBeCloseTo(0.12);
    expect(snapshot?.superannuation?.contributionsTaxRate).toBeCloseTo(0.15);
    expect(snapshot?.superannuation?.maximumContributionBaseAnnualDollars).toBe(250000);
    expect(snapshot?.verificationStatus).toBe("verified");
    expect(snapshot?.superannuation?.preservationAgeYears).toBe(60);
    expect(snapshot?.superannuation?.unconditionalReleaseAgeYears).toBe(65);
  });

  it("converts the income tax percentages to fractions and keeps dollar amounts", () => {
    const [snapshot] = ruleSetFromWire([sampleRulesFile()]).snapshots;
    const incomeTax = snapshot?.incomeTax;

    expect(incomeTax?.residentBrackets[1]).toEqual({ fromDollars: 18200, rate: 0.16 });
    expect(incomeTax?.lowIncomeTaxOffset.firstReductionRate).toBeCloseTo(0.05);
    expect(incomeTax?.lowIncomeTaxOffset.secondReductionRate).toBeCloseTo(0.015);
    expect(incomeTax?.lowIncomeTaxOffset.maximumDollars).toBe(700);
    expect(incomeTax?.medicareLevy.rate).toBeCloseTo(0.02);
    expect(incomeTax?.medicareLevy.shadeInRate).toBeCloseTo(0.1);
    expect(incomeTax?.medicareLevy.lowIncomeThresholdDollars).toBe(27222);
  });

  it("leaves out a section the file doesn't have, and keeps its sources", () => {
    const { superannuation, ...incomeTaxOnly } = sampleRulesFile();
    void superannuation;
    const [snapshot] = ruleSetFromWire([parseRulesFile(incomeTaxOnly)]).snapshots;

    expect(snapshot?.superannuation).toBeUndefined();
    expect(snapshot?.incomeTax).toBeDefined();
    expect(snapshot?.sourceUrls.medicareLevy).toBeDefined();
  });

  it("sorts snapshots by start date", () => {
    const later = sampleRulesFile({ financialYear: "2026-27", effectiveFrom: "2026-07-01" });
    const ruleSet = ruleSetFromWire([later, sampleRulesFile()]);

    expect(ruleSet.snapshots.map((snapshot) => snapshot.financialYear)).toEqual([
      "2025-26",
      "2026-27",
    ]);
  });

  it("rejects an empty list and duplicate start dates", () => {
    expect(() => ruleSetFromWire([])).toThrow();
    expect(() => ruleSetFromWire([sampleRulesFile(), sampleRulesFile()])).toThrow();
  });
});

describe("rulesForYear", () => {
  const ruleSet = ruleSetFromWire([sampleRulesFile()]);

  it("uses the snapshot in effect on 1 January", () => {
    const rules = rulesForYear(ruleSet, 2026, 0.025);

    expect(rules.financialYear).toBe("2025-26");
    expect(rules.isEstimated).toBe(false);
    expect(rules.superannuation.maximumContributionBaseAnnualDollars).toBe(250000);
    expect(rules.superannuation.preservationAgeYears).toBe(60);
    expect(rules.superannuation.unconditionalReleaseAgeYears).toBe(65);
  });

  it("uses the earliest file for earlier years, without adjusting", () => {
    const rules = rulesForYear(ruleSet, 2020, 0.025);

    expect(rules.financialYear).toBe("2025-26");
    expect(rules.isEstimated).toBe(false);
    expect(rules.superannuation.maximumContributionBaseAnnualDollars).toBe(250000);
  });

  it("grows dollar thresholds with inflation after the latest file", () => {
    const year2027 = rulesForYear(ruleSet, 2027, 0.025);
    const year2028 = rulesForYear(ruleSet, 2028, 0.025);

    expect(year2027.isEstimated).toBe(true);
    expect(year2027.superannuation.maximumContributionBaseAnnualDollars).toBeCloseTo(256250);
    expect(year2028.superannuation.maximumContributionBaseAnnualDollars).toBeCloseTo(
      250000 * 1.025 * 1.025,
    );
    // Rates are law, not indexed, and the ages aren't dollar thresholds.
    expect(year2027.superannuation.guaranteeRate).toBeCloseTo(0.12);
    expect(year2027.superannuation.preservationAgeYears).toBe(60);
    expect(year2027.superannuation.unconditionalReleaseAgeYears).toBe(65);
  });

  it("lets a later snapshot replace the earlier one from its date", () => {
    const later = sampleRulesFile({
      financialYear: "2026-27",
      effectiveFrom: "2026-07-01",
      superannuation: {
        guaranteeRatePercent: 12,
        maximumContributionBaseQuarterlyDollars: 70000,
        contributionsTaxPercent: 15,
        earningsTaxPercent: 15,
        discountedCapitalGainsTaxPercent: 10,
        preservationAgeYears: 60,
        unconditionalReleaseAgeYears: 65,
      },
    });
    const twoSnapshots = ruleSetFromWire([sampleRulesFile(), later]);

    // 1 Jan 2026 is before 1 Jul 2026, so FY2025-26 still applies.
    expect(rulesForYear(twoSnapshots, 2026, 0.025).financialYear).toBe("2025-26");
    // 1 Jan 2027 is after it, so the later file applies, unadjusted.
    const year2027 = rulesForYear(twoSnapshots, 2027, 0.025);
    expect(year2027.financialYear).toBe("2026-27");
    expect(year2027.isEstimated).toBe(false);
    expect(year2027.superannuation.maximumContributionBaseAnnualDollars).toBe(280000);
  });
});

describe("rulesForYear with sections in separate files", () => {
  /** A file carrying only the income tax section, as fy2026-27.json does. */
  function incomeTaxOnlyFile(
    financialYear: string,
    effectiveFrom: string,
    bottomRatePercent: number,
  ): RulesFileV1 {
    const { superannuation, ...withoutSuper } = sampleRulesFile({ financialYear, effectiveFrom });
    void superannuation;

    return { ...withoutSuper, incomeTax: sampleIncomeTax(bottomRatePercent) };
  }

  it("takes each section from the latest snapshot that has it", () => {
    const ruleSet = ruleSetFromWire([
      sampleRulesFile(),
      incomeTaxOnlyFile("2026-27", "2026-07-01", 15),
    ]);

    const year2027 = rulesForYear(ruleSet, 2027, 0.025);

    // Income tax comes from the newer file, unadjusted...
    expect(year2027.incomeTaxFinancialYear).toBe("2026-27");
    expect(year2027.incomeTax.residentBrackets[1]?.rate).toBeCloseTo(0.15);
    expect(year2027.incomeTaxIsEstimated).toBe(false);

    // ...while superannuation still comes from the older file, indexed from 2026.
    expect(year2027.financialYear).toBe("2025-26");
    expect(year2027.isEstimated).toBe(true);
    expect(year2027.superannuation.maximumContributionBaseAnnualDollars).toBeCloseTo(256250);
  });

  it("throws when no file has a section the engine needs", () => {
    const { incomeTax, ...superOnly } = sampleRulesFile();
    void incomeTax;

    expect(() => rulesForYear(ruleSetFromWire([superOnly]), 2026, 0.025)).toThrow(
      "No rules file has an incomeTax section",
    );
  });
});

describe("bundled income tax rules", () => {
  const inflation = 0.025;

  it("uses 16% in 2026, 15% in 2027 and 14% from 2028, none of them estimated", () => {
    const bottomRates = [2026, 2027, 2028].map((calendarYear) => {
      const rules = rulesForYear(bundledRuleSet, calendarYear, inflation);

      expect(rules.incomeTaxIsEstimated, String(calendarYear)).toBe(false);
      // The amounts are the file's own, not indexed.
      expect(rules.incomeTax.residentBrackets[2]?.fromDollars).toBe(45000);
      expect(rules.incomeTax.lowIncomeTaxOffset.maximumDollars).toBe(700);
      expect(rules.incomeTax.medicareLevy.lowIncomeThresholdDollars).toBe(27222);

      return rules.incomeTax.residentBrackets[1]?.rate;
    });

    expect(bottomRates[0]).toBeCloseTo(0.16);
    expect(bottomRates[1]).toBeCloseTo(0.15);
    expect(bottomRates[2]).toBeCloseTo(0.14);
  });

  it("names the financial year each calendar year's tax rules come from", () => {
    expect(rulesForYear(bundledRuleSet, 2026, inflation).incomeTaxFinancialYear).toBe("2025-26");
    expect(rulesForYear(bundledRuleSet, 2027, inflation).incomeTaxFinancialYear).toBe("2026-27");
    expect(rulesForYear(bundledRuleSet, 2028, inflation).incomeTaxFinancialYear).toBe("2027-28");
  });

  it("grows every dollar amount by 1.025^3 in 2031 and flags it estimated, leaving rates alone", () => {
    const rules = rulesForYear(bundledRuleSet, 2031, inflation).incomeTax;
    const growth = Math.pow(1.025, 3);

    expect(rulesForYear(bundledRuleSet, 2031, inflation).incomeTaxIsEstimated).toBe(true);
    expect(rules.residentBrackets.map((bracket) => bracket.fromDollars)).toEqual(
      [0, 18200, 45000, 135000, 190000].map((dollars) => expect.closeTo(dollars * growth, 6)),
    );
    expect(rules.residentBrackets.map((bracket) => bracket.rate)).toEqual([
      0, 0.14, 0.3, 0.37, 0.45,
    ]);
    expect(rules.lowIncomeTaxOffset.maximumDollars).toBeCloseTo(700 * growth, 6);
    expect(rules.lowIncomeTaxOffset.firstThresholdDollars).toBeCloseTo(37500 * growth, 6);
    expect(rules.lowIncomeTaxOffset.secondThresholdDollars).toBeCloseTo(45000 * growth, 6);
    expect(rules.lowIncomeTaxOffset.firstReductionRate).toBeCloseTo(0.05);
    expect(rules.lowIncomeTaxOffset.secondReductionRate).toBeCloseTo(0.015);
    expect(rules.medicareLevy.lowIncomeThresholdDollars).toBeCloseTo(27222 * growth, 6);
    expect(rules.medicareLevy.rate).toBeCloseTo(0.02);
    expect(rules.medicareLevy.shadeInRate).toBeCloseTo(0.1);
  });

  it("implies a Medicare upper threshold within $1 of the ATO's $34,027", () => {
    const levy = rulesForYear(bundledRuleSet, 2026, inflation).incomeTax.medicareLevy;

    // The shaded-in levy, shadeInRate × (income − threshold), reaches
    // rate × income at income = shadeInRate × threshold / (shadeInRate − rate).
    const impliedUpperThreshold =
      (levy.shadeInRate * levy.lowIncomeThresholdDollars) / (levy.shadeInRate - levy.rate);

    expect(Math.abs(impliedUpperThreshold - 34027)).toBeLessThan(1);
  });

  it("holds the three source URLs the plan names, on unverified files with an honest note", () => {
    const incomeTaxSnapshots = bundledRuleSet.snapshots.filter((snapshot) => snapshot.incomeTax);

    expect(incomeTaxSnapshots.map((snapshot) => snapshot.financialYear)).toEqual([
      "2025-26",
      "2026-27",
      "2027-28",
    ]);

    for (const snapshot of incomeTaxSnapshots) {
      expect(snapshot.verificationStatus).toBe("unverified");
      expect(snapshot.verificationNote).toContain("from memory");
      expect(snapshot.sourceUrls.residentBrackets).toBe(
        "https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents",
      );
      expect(snapshot.sourceUrls.lowIncomeTaxOffset).toMatch(/\/low-income-tax-offset$/);
      expect(snapshot.sourceUrls.medicareLevy).toMatch(
        /\/medicare-levy-reduction-for-low-income-earners$/,
      );
    }
  });

  it("holds only incomeTax in the two legislated-rate files", () => {
    const [, fy2026, fy2027] = bundledRuleSet.snapshots;

    expect(fy2026?.superannuation).toBeUndefined();
    expect(fy2027?.superannuation).toBeUndefined();
  });

  it("leaves the M5 and M6 superannuation results unchanged", () => {
    // Pinned values from before sections existed: the contribution base is
    // $250,000 in 2026 and grows 2.5% a year after it; rates and ages are law.
    for (const [calendarYear, expectedBase] of [
      [2026, 250000],
      [2027, 256250],
      [2030, 250000 * Math.pow(1.025, 4)],
      [2060, 250000 * Math.pow(1.025, 34)],
    ] as const) {
      const rules = rulesForYear(bundledRuleSet, calendarYear, 0.025);

      expect(rules.financialYear, String(calendarYear)).toBe("2025-26");
      expect(rules.isEstimated).toBe(calendarYear > 2026);
      expect(rules.superannuation.maximumContributionBaseAnnualDollars).toBeCloseTo(
        expectedBase,
        6,
      );
      expect(rules.superannuation.guaranteeRate).toBeCloseTo(0.12);
      expect(rules.superannuation.contributionsTaxRate).toBeCloseTo(0.15);
      expect(rules.superannuation.earningsTaxRate).toBeCloseTo(0.15);
      expect(rules.superannuation.discountedCapitalGainsTaxRate).toBeCloseTo(0.1);
      expect(rules.superannuation.preservationAgeYears).toBe(60);
      expect(rules.superannuation.unconditionalReleaseAgeYears).toBe(65);
    }
  });
});

describe("rulesForYear indexation before a later file", () => {
  /** A file with only the superannuation section, starting 2028-07-01 with a $280,000 base. */
  function laterSuperOnlyFile(): RulesFileV1 {
    const { incomeTax, ...withoutTax } = sampleRulesFile({
      financialYear: "2028-29",
      effectiveFrom: "2028-07-01",
    });
    void incomeTax;

    return {
      ...withoutTax,
      superannuation: {
        ...(sampleRulesFile().superannuation as NonNullable<RulesFileV1["superannuation"]>),
        maximumContributionBaseQuarterlyDollars: 70000,
      },
    };
  }

  it("keeps indexing the years before a later file starts, from the earlier file", () => {
    const ruleSet = ruleSetFromWire([sampleRulesFile(), laterSuperOnlyFile()]);

    // The 2025-26 file covers 2026 ($250,000); 2027 and 2028 are estimated from it.
    expect(
      rulesForYear(ruleSet, 2027, 0.025).superannuation.maximumContributionBaseAnnualDollars,
    ).toBeCloseTo(256_250);
    expect(
      rulesForYear(ruleSet, 2028, 0.025).superannuation.maximumContributionBaseAnnualDollars,
    ).toBeCloseTo(262_656.25);
    expect(rulesForYear(ruleSet, 2027, 0.025).isEstimated).toBe(true);

    // The later file's own first year (1 Jan 2029) is its own, unindexed figure.
    const year2029 = rulesForYear(ruleSet, 2029, 0.025);
    expect(year2029.financialYear).toBe("2028-29");
    expect(year2029.superannuation.maximumContributionBaseAnnualDollars).toBe(280_000);
    expect(year2029.isEstimated).toBe(false);
  });
});

describe("rulesForYear caching", () => {
  it("gives the same object for the same rule set, year and inflation", () => {
    expect(rulesForYear(bundledRuleSet, 2031, 0.025)).toBe(
      rulesForYear(bundledRuleSet, 2031, 0.025),
    );
  });

  it("gives different results for a different inflation rate, year or rule set", () => {
    const base = rulesForYear(bundledRuleSet, 2031, 0.025);

    expect(rulesForYear(bundledRuleSet, 2031, 0.03)).not.toBe(base);
    expect(
      rulesForYear(bundledRuleSet, 2031, 0.03).incomeTax.medicareLevy.lowIncomeThresholdDollars,
    ).toBeGreaterThan(base.incomeTax.medicareLevy.lowIncomeThresholdDollars);
    expect(rulesForYear(bundledRuleSet, 2032, 0.025)).not.toBe(base);

    const otherRuleSet = ruleSetFromWire([sampleRulesFile()]);
    expect(rulesForYear(otherRuleSet, 2026, 0.025)).not.toBe(
      rulesForYear(bundledRuleSet, 2026, 0.025),
    );
  });
});
