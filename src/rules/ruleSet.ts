// Internal (in-memory) form of the statutory rules, and the lookup the engine
// uses to get the rules for one projection row.
//
//   RulesFileV1 (wire, rulesFile.ts) ──ruleSetFromWire──► RuleSet
//                                                           │ rulesForYear(ruleSet, year, inflation)
//                                                           ▼
//                                                        YearRules
//
// Internally, rates are fractions (0.12, not 12) and the contribution base is
// an annual amount, so calculation code never converts units.

import type { RulesFileV1 } from "./rulesFile";

/** Whether a person has checked a snapshot's values against its sources. */
export type RulesVerificationStatus = "verified" | "unverified";

/** The superannuation rates and thresholds that apply in one period. */
export interface SuperannuationRules {
  /** Employer super guarantee rate, as a fraction (0.12 = 12%). */
  readonly guaranteeRate: number;
  /** Maximum earnings per year that attract the guarantee (quarterly base × 4). */
  readonly maximumContributionBaseAnnualDollars: number;
  /** Tax on concessional contributions going into the fund, as a fraction. */
  readonly contributionsTaxRate: number;
  /** Tax on earnings in the accumulation phase, as a fraction. */
  readonly earningsTaxRate: number;
  /** Tax rate on discounted capital gains inside super, as a fraction. */
  readonly discountedCapitalGainsTaxRate: number;
}

/** One rules file in internal form: the rules from `effectiveFrom` until the next snapshot. */
export interface RuleSnapshot {
  /** e.g. "2025-26". */
  readonly financialYear: string;
  /** First day the rules apply, as `YYYY-MM-DD`. */
  readonly effectiveFrom: string;
  readonly verificationStatus: RulesVerificationStatus;
  readonly verificationNote?: string;
  readonly superannuation: SuperannuationRules;
  /** Where each value came from, keyed by its wire field name, for explanations. */
  readonly sourceUrls: Readonly<Record<string, string>>;
}

/** Every known snapshot, sorted by `effectiveFrom` (earliest first). Never empty. */
export interface RuleSet {
  readonly snapshots: readonly RuleSnapshot[];
}

/** The rules a single projection row uses. */
export interface YearRules {
  /** The financial year of the snapshot this row's rules come from. */
  readonly financialYear: string;
  /** True when the dollar thresholds are an inflation estimate beyond the latest file. */
  readonly isEstimated: boolean;
  readonly superannuation: SuperannuationRules;
}

/** Converts one validated wire file to the internal snapshot: percent → fraction, quarterly → annual. */
function snapshotFromWire(rulesFile: RulesFileV1): RuleSnapshot {
  const wireSuper = rulesFile.superannuation;

  return {
    financialYear: rulesFile.financialYear,
    effectiveFrom: rulesFile.effectiveFrom,
    verificationStatus: rulesFile.verification.status,
    ...(rulesFile.verification.note !== undefined
      ? { verificationNote: rulesFile.verification.note }
      : {}),
    superannuation: {
      guaranteeRate: wireSuper.guaranteeRatePercent / 100,
      maximumContributionBaseAnnualDollars: wireSuper.maximumContributionBaseQuarterlyDollars * 4,
      contributionsTaxRate: wireSuper.contributionsTaxPercent / 100,
      earningsTaxRate: wireSuper.earningsTaxPercent / 100,
      discountedCapitalGainsTaxRate: wireSuper.discountedCapitalGainsTaxPercent / 100,
    },
    sourceUrls: { ...rulesFile.sources },
  };
}

/**
 * Builds the internal rule set from validated wire files. Called once at
 * start-up by bundledRuleSet.ts, and by tests with their own files. Throws if
 * there are no files or two files start on the same date, since "which applies?"
 * would then have no answer.
 */
export function ruleSetFromWire(rulesFiles: readonly RulesFileV1[]): RuleSet {
  if (rulesFiles.length === 0) {
    throw new Error("A rule set needs at least one rules file");
  }

  // ISO dates sort correctly as plain strings.
  const snapshots = rulesFiles
    .map(snapshotFromWire)
    .sort((first, second) => first.effectiveFrom.localeCompare(second.effectiveFrom));

  for (let index = 1; index < snapshots.length; index += 1) {
    if (snapshots[index]?.effectiveFrom === snapshots[index - 1]?.effectiveFrom) {
      throw new Error(`Two rules files take effect on ${snapshots[index]?.effectiveFrom}`);
    }
  }

  return { snapshots };
}

/**
 * The calendar year whose 1 January is the first one on or after the
 * snapshot's start. A 2025-07-01 snapshot is first "in effect on 1 January"
 * in 2026, which is why the FY2025–26 file covers calendar year 2026.
 */
function firstCoveredCalendarYear(snapshot: RuleSnapshot): number {
  const startYear = Number(snapshot.effectiveFrom.slice(0, 4));
  const startsOnFirstOfJanuary = snapshot.effectiveFrom.slice(5) === "01-01";

  return startsOnFirstOfJanuary ? startYear : startYear + 1;
}

/**
 * Picks the rules for one projection row (calendar year `calendarYear`).
 *
 *   - The snapshot in effect on 1 January of that year is used.
 *   - Years before the earliest snapshot use the earliest one.
 *   - Years after the latest snapshot use its rates, with dollar thresholds
 *     grown by `inflationRate` once per year since the year it covers
 *     (e.g. $250,000 → $256,250 for 2027 at 2.5%, the FY2025–26 file covering 2026).
 *
 * Called by the engine once per row (from M5 step 2 onwards); the engine never
 * reads the data files itself.
 */
export function rulesForYear(
  ruleSet: RuleSet,
  calendarYear: number,
  inflationRate: number,
): YearRules {
  const firstOfJanuary = `${calendarYear}-01-01`;
  const earliestSnapshot = ruleSet.snapshots[0] as RuleSnapshot;
  const latestSnapshot = ruleSet.snapshots[ruleSet.snapshots.length - 1] as RuleSnapshot;

  // The last snapshot that started on or before 1 January, else the earliest.
  const snapshotInEffect =
    [...ruleSet.snapshots].reverse().find((snapshot) => snapshot.effectiveFrom <= firstOfJanuary) ??
    earliestSnapshot;

  const yearsBeyondLatest =
    snapshotInEffect === latestSnapshot
      ? Math.max(0, calendarYear - firstCoveredCalendarYear(latestSnapshot))
      : 0;

  if (yearsBeyondLatest === 0) {
    return {
      financialYear: snapshotInEffect.financialYear,
      isEstimated: false,
      superannuation: snapshotInEffect.superannuation,
    };
  }

  // One compounding step per year after the year the latest file covers.
  const thresholdGrowth = Math.pow(1 + inflationRate, yearsBeyondLatest);

  return {
    financialYear: snapshotInEffect.financialYear,
    isEstimated: true,
    superannuation: {
      ...snapshotInEffect.superannuation,
      maximumContributionBaseAnnualDollars:
        snapshotInEffect.superannuation.maximumContributionBaseAnnualDollars * thresholdGrowth,
    },
  };
}
