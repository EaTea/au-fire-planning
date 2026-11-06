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
  /**
   * The preservation age in whole years: the earliest age super can be
   * accessed once retired (60 for anyone born after 30 June 1964).
   */
  readonly preservationAgeYears: number;
  /** The age at which super can be accessed whether or not retired (65). */
  readonly unconditionalReleaseAgeYears: number;
}

/** One resident tax bracket in internal form. */
export interface TaxBracket {
  /** Taxable income at which this bracket's rate starts, in dollars. */
  readonly fromDollars: number;
  /** Rate on income from `fromDollars` to the next bracket, as a fraction (0.16 = 16%). */
  readonly rate: number;
}

/** The low income tax offset (LITO): a maximum that falls away in two steps as income rises. */
export interface LowIncomeTaxOffsetRules {
  /** The offset at low incomes, in dollars. */
  readonly maximumDollars: number;
  /** Taxable income above which the offset starts to fall, in dollars. */
  readonly firstThresholdDollars: number;
  /** How fast it falls above the first threshold, per dollar of income (0.05 = 5 cents). */
  readonly firstReductionRate: number;
  /** Taxable income above which it falls at the second rate, in dollars. */
  readonly secondThresholdDollars: number;
  /** How fast it falls above the second threshold, per dollar of income. */
  readonly secondReductionRate: number;
}

/** The Medicare levy and its low-income reduction (shading in). */
export interface MedicareLevyRules {
  /** Levy on taxable income, as a fraction (0.02 = 2%). */
  readonly rate: number;
  /** No levy up to this taxable income, in dollars (single person). */
  readonly lowIncomeThresholdDollars: number;
  /** Above the threshold the levy is this fraction of the excess until it reaches the full rate. */
  readonly shadeInRate: number;
}

/** The personal income tax rates and thresholds that apply in one period (M8). */
export interface IncomeTaxRules {
  /** Resident brackets, lowest first; the first starts at $0. */
  readonly residentBrackets: readonly TaxBracket[];
  readonly lowIncomeTaxOffset: LowIncomeTaxOffsetRules;
  readonly medicareLevy: MedicareLevyRules;
}

/**
 * One rules file in internal form: the rules from `effectiveFrom` until the
 * next snapshot that has the same section. A section is absent when the file
 * doesn't change it.
 */
export interface RuleSnapshot {
  /** e.g. "2025-26". */
  readonly financialYear: string;
  /** First day the rules apply, as `YYYY-MM-DD`. */
  readonly effectiveFrom: string;
  readonly verificationStatus: RulesVerificationStatus;
  readonly verificationNote?: string;
  readonly superannuation?: SuperannuationRules;
  readonly incomeTax?: IncomeTaxRules;
  /** Where each value came from, keyed by its wire field name, for explanations. */
  readonly sourceUrls: Readonly<Record<string, string>>;
}

/** Every known snapshot, sorted by `effectiveFrom` (earliest first). Never empty. */
export interface RuleSet {
  readonly snapshots: readonly RuleSnapshot[];
}

/** The rules a single projection row uses. */
export interface YearRules {
  /** The financial year of the snapshot the superannuation rules come from. */
  readonly financialYear: string;
  /** True when the superannuation dollar thresholds are an inflation estimate beyond the latest file that has them. */
  readonly isEstimated: boolean;
  readonly superannuation: SuperannuationRules;
  /** The financial year of the snapshot the income tax rules come from. */
  readonly incomeTaxFinancialYear: string;
  /** True when the income tax dollar amounts are an inflation estimate beyond the latest file that has them. */
  readonly incomeTaxIsEstimated: boolean;
  readonly incomeTax: IncomeTaxRules;
}

/** Converts the wire superannuation section to internal form: percent → fraction, quarterly → annual. */
function superannuationFromWire(
  wireSuper: NonNullable<RulesFileV1["superannuation"]>,
): SuperannuationRules {
  return {
    guaranteeRate: wireSuper.guaranteeRatePercent / 100,
    maximumContributionBaseAnnualDollars: wireSuper.maximumContributionBaseQuarterlyDollars * 4,
    contributionsTaxRate: wireSuper.contributionsTaxPercent / 100,
    earningsTaxRate: wireSuper.earningsTaxPercent / 100,
    discountedCapitalGainsTaxRate: wireSuper.discountedCapitalGainsTaxPercent / 100,
    preservationAgeYears: wireSuper.preservationAgeYears,
    unconditionalReleaseAgeYears: wireSuper.unconditionalReleaseAgeYears,
  };
}

/** Converts the wire income tax section to internal form: every `…Percent` becomes a fraction. */
function incomeTaxFromWire(wireTax: NonNullable<RulesFileV1["incomeTax"]>): IncomeTaxRules {
  const wireOffset = wireTax.lowIncomeTaxOffset;
  const wireLevy = wireTax.medicareLevy;

  return {
    residentBrackets: wireTax.residentBrackets.map((wireBracket) => ({
      fromDollars: wireBracket.fromDollars,
      rate: wireBracket.ratePercent / 100,
    })),
    lowIncomeTaxOffset: {
      maximumDollars: wireOffset.maximumDollars,
      firstThresholdDollars: wireOffset.firstThresholdDollars,
      firstReductionRate: wireOffset.firstReductionPercent / 100,
      secondThresholdDollars: wireOffset.secondThresholdDollars,
      secondReductionRate: wireOffset.secondReductionPercent / 100,
    },
    medicareLevy: {
      rate: wireLevy.ratePercent / 100,
      lowIncomeThresholdDollars: wireLevy.lowIncomeThresholdDollars,
      shadeInRate: wireLevy.shadeInPercent / 100,
    },
  };
}

/**
 * Converts one validated wire file to the internal snapshot. Only the sections
 * the file has appear in the snapshot; `sourceUrls` merges every section's links.
 */
function snapshotFromWire(rulesFile: RulesFileV1): RuleSnapshot {
  // Optional sources are only ever absent for sections the file doesn't have
  // (the schema enforces that), so dropping undefined entries loses nothing.
  const sourceUrls: Record<string, string> = {};
  for (const [sourceKey, url] of Object.entries(rulesFile.sources)) {
    if (url !== undefined) {
      sourceUrls[sourceKey] = url;
    }
  }

  return {
    financialYear: rulesFile.financialYear,
    effectiveFrom: rulesFile.effectiveFrom,
    verificationStatus: rulesFile.verification.status,
    ...(rulesFile.verification.note !== undefined
      ? { verificationNote: rulesFile.verification.note }
      : {}),
    ...(rulesFile.superannuation !== undefined
      ? { superannuation: superannuationFromWire(rulesFile.superannuation) }
      : {}),
    ...(rulesFile.incomeTax !== undefined
      ? { incomeTax: incomeTaxFromWire(rulesFile.incomeTax) }
      : {}),
    sourceUrls,
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
 * Finds the rules of one section for a calendar year, and says how far the year
 * is beyond the latest snapshot that holds the section.
 *
 *   - Only snapshots that have the section are considered.
 *   - The last of those that started on or before 1 January is used; years
 *     before the earliest use the earliest.
 *   - `yearsBeyondLatest` counts the years after the calendar year the
 *     snapshot in effect covers, which is how many times its dollar amounts
 *     are indexed (0 in range). It is counted from the snapshot in effect, not
 *     only the latest one, so a section is still indexed in the years before a
 *     later file for that section starts.
 *
 * Used by `rulesForYear` once per section, so each section is indexed from its
 * own latest file (the FY2025-26 super rules and the FY2027-28 tax rules age
 * separately).
 */
function sectionInEffect<Section>(
  ruleSet: RuleSet,
  calendarYear: number,
  sectionName: string,
  readSection: (snapshot: RuleSnapshot) => Section | undefined,
): { snapshot: RuleSnapshot; section: Section; yearsBeyondLatest: number } {
  const firstOfJanuary = `${calendarYear}-01-01`;
  const snapshotsWithSection = ruleSet.snapshots.filter(
    (snapshot) => readSection(snapshot) !== undefined,
  );
  const earliestSnapshot = snapshotsWithSection[0];

  if (earliestSnapshot === undefined) {
    const article = /^[aeiou]/i.test(sectionName) ? "an" : "a";
    throw new Error(`No rules file has ${article} ${sectionName} section`);
  }

  const snapshotInEffect =
    [...snapshotsWithSection]
      .reverse()
      .find((snapshot) => snapshot.effectiveFrom <= firstOfJanuary) ?? earliestSnapshot;

  const yearsBeyondLatest = Math.max(0, calendarYear - firstCoveredCalendarYear(snapshotInEffect));

  return {
    snapshot: snapshotInEffect,
    section: readSection(snapshotInEffect) as Section,
    yearsBeyondLatest,
  };
}

/** Grows the superannuation dollar threshold (the contribution base) by `thresholdGrowth`; rates and ages stay. */
function indexSuperannuationRules(
  rules: SuperannuationRules,
  thresholdGrowth: number,
): SuperannuationRules {
  return {
    ...rules,
    maximumContributionBaseAnnualDollars:
      rules.maximumContributionBaseAnnualDollars * thresholdGrowth,
  };
}

/**
 * Grows every dollar amount in the income tax rules by `thresholdGrowth`:
 * bracket thresholds, the offset's maximum and thresholds, and the levy
 * threshold. Tax rates and the offset/levy reduction rates are law, not
 * indexed, so they are copied unchanged.
 */
function indexIncomeTaxRules(rules: IncomeTaxRules, thresholdGrowth: number): IncomeTaxRules {
  const offset = rules.lowIncomeTaxOffset;

  return {
    residentBrackets: rules.residentBrackets.map((bracket) => ({
      ...bracket,
      fromDollars: bracket.fromDollars * thresholdGrowth,
    })),
    lowIncomeTaxOffset: {
      ...offset,
      maximumDollars: offset.maximumDollars * thresholdGrowth,
      firstThresholdDollars: offset.firstThresholdDollars * thresholdGrowth,
      secondThresholdDollars: offset.secondThresholdDollars * thresholdGrowth,
    },
    medicareLevy: {
      ...rules.medicareLevy,
      lowIncomeThresholdDollars: rules.medicareLevy.lowIncomeThresholdDollars * thresholdGrowth,
    },
  };
}

/**
 * Picks the rules for one projection row (calendar year `calendarYear`).
 *
 * Each section is chosen on its own (see `sectionInEffect`):
 *   - the latest snapshot in effect on 1 January that has the section;
 *   - years before the earliest such snapshot use the earliest one;
 *   - years after the latest such snapshot use its rates, with dollar amounts
 *     grown by `inflationRate` once per year since the year it covers
 *     (e.g. $250,000 → $256,250 for 2027 at 2.5%, the FY2025–26 file covering 2026),
 *     and the section is flagged estimated.
 *
 * Called by the engine once per row (from M5 step 2 onwards) and by the
 * super and age screens; the engine never reads the data files itself. Throws
 * if no snapshot has a section, since the app can't run without it. Answers
 * are cached per rule set, year and inflation rate, so the same object comes
 * back each time: treat it as read-only.
 */
export function rulesForYear(
  ruleSet: RuleSet,
  calendarYear: number,
  inflationRate: number,
): YearRules {
  let cacheForRuleSet = rulesForYearCache.get(ruleSet);
  if (cacheForRuleSet === undefined) {
    cacheForRuleSet = new Map();
    rulesForYearCache.set(ruleSet, cacheForRuleSet);
  }

  const cacheKey = `${calendarYear}|${inflationRate}`;
  let yearRules = cacheForRuleSet.get(cacheKey);
  if (yearRules === undefined) {
    yearRules = workOutRulesForYear(ruleSet, calendarYear, inflationRate);
    cacheForRuleSet.set(cacheKey, yearRules);
  }

  return yearRules;
}

/**
 * Remembers each rule set's `rulesForYear` answers by calendar year and
 * inflation rate. The projection asks for the same year's rules once per
 * person per row, and the earliest-age and Coast FIRE searches re-run the
 * projection many times, so recomputing (and re-indexing) every call roughly
 * doubled the time `summarisePlan` takes. A WeakMap lets a rule set (and its
 * answers) be garbage-collected with it.
 */
const rulesForYearCache = new WeakMap<RuleSet, Map<string, YearRules>>();

/**
 * The uncached work of `rulesForYear`: picks each section's snapshot and
 * indexes its dollar amounts. The result is shared between callers by the
 * cache, so callers must treat it as read-only.
 */
function workOutRulesForYear(
  ruleSet: RuleSet,
  calendarYear: number,
  inflationRate: number,
): YearRules {
  const superannuation = sectionInEffect(
    ruleSet,
    calendarYear,
    "superannuation",
    (snapshot) => snapshot.superannuation,
  );
  const incomeTax = sectionInEffect(
    ruleSet,
    calendarYear,
    "incomeTax",
    (snapshot) => snapshot.incomeTax,
  );

  // One compounding step per year after the year the section's latest file covers.
  const superannuationGrowth = Math.pow(1 + inflationRate, superannuation.yearsBeyondLatest);
  const incomeTaxGrowth = Math.pow(1 + inflationRate, incomeTax.yearsBeyondLatest);

  return {
    financialYear: superannuation.snapshot.financialYear,
    isEstimated: superannuation.yearsBeyondLatest > 0,
    superannuation:
      superannuation.yearsBeyondLatest > 0
        ? indexSuperannuationRules(superannuation.section, superannuationGrowth)
        : superannuation.section,
    incomeTaxFinancialYear: incomeTax.snapshot.financialYear,
    incomeTaxIsEstimated: incomeTax.yearsBeyondLatest > 0,
    incomeTax:
      incomeTax.yearsBeyondLatest > 0
        ? indexIncomeTaxRules(incomeTax.section, incomeTaxGrowth)
        : incomeTax.section,
  };
}
