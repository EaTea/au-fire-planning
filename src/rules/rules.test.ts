// Unit tests for the rules data: the bundled files, the wire schema, the
// wire → internal mapping and the year lookup.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { bundledRuleSet } from "./bundledRuleSet";
import { parseRulesFile, type RulesFileV1 } from "./rulesFile";
import { rulesForYear, ruleSetFromWire } from "./ruleSet";

const dataDirectory = join(__dirname, "data");

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
    },
    sources: {
      guaranteeRatePercent: url,
      maximumContributionBaseQuarterlyDollars: url,
      contributionsTaxPercent: url,
      earningsTaxPercent: url,
      discountedCapitalGainsTaxPercent: url,
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
  });
});

describe("rules file schema", () => {
  it("accepts a valid file", () => {
    expect(parseRulesFile(sampleRulesFile()).financialYear).toBe("2025-26");
  });

  it("rejects a file with a missing field", () => {
    const { superannuation, ...withoutSuper } = sampleRulesFile();
    void superannuation;
    expect(() => parseRulesFile(withoutSuper)).toThrow();

    const missingRate = sampleRulesFile();
    const brokenSuper: Record<string, unknown> = { ...missingRate.superannuation };
    delete brokenSuper.earningsTaxPercent;
    expect(() => parseRulesFile({ ...missingRate, superannuation: brokenSuper })).toThrow();
  });

  it("rejects a missing source link and a missing verification", () => {
    const withoutSource: Record<string, unknown> = { ...sampleRulesFile().sources };
    delete withoutSource.guaranteeRatePercent;
    expect(() => parseRulesFile({ ...sampleRulesFile(), sources: withoutSource })).toThrow();

    const { verification, ...withoutVerification } = sampleRulesFile();
    void verification;
    expect(() => parseRulesFile(withoutVerification)).toThrow();
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

    expect(snapshot?.superannuation.guaranteeRate).toBeCloseTo(0.12);
    expect(snapshot?.superannuation.contributionsTaxRate).toBeCloseTo(0.15);
    expect(snapshot?.superannuation.maximumContributionBaseAnnualDollars).toBe(250000);
    expect(snapshot?.verificationStatus).toBe("verified");
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
    // Rates are law, not indexed.
    expect(year2027.superannuation.guaranteeRate).toBeCloseTo(0.12);
  });

  it("lets a later snapshot replace the earlier one from its date", () => {
    const later = sampleRulesFile({
      financialYear: "2026-27",
      effectiveFrom: "2026-07-01",
      superannuation: {
        ...sampleRulesFile().superannuation,
        maximumContributionBaseQuarterlyDollars: 70000,
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
