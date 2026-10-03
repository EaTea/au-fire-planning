// The stored (wire) shape of one statutory rules file (NFR-3).
//
//   src/rules/data/fy2025-26.json ──parse (this schema)──► RulesFileV1
//                                                            │ ruleSetFromWire (ruleSet.ts)
//                                                            ▼
//                                                         RuleSet (internal)
//
// Units are spelled out in field names (`...Percent`, `...QuarterlyDollars`) so
// a data file can be read and checked against its source without the code.
// Nothing outside src/rules/ should use this type; it is mapped to the internal
// `RuleSet` immediately after parsing.

import { z } from "zod";

/** A percentage rate from 0 to 100. Negative or above-100 rates are always a data-entry mistake. */
const percentSchema = z.number().min(0).max(100);

/** A calendar date as `YYYY-MM-DD`, the form used for `effectiveFrom`. */
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected a date like 2025-07-01");

/**
 * Zod schema for version 1 of a rules file. `sources` has one entry per
 * superannuation value, so a value can't be added without saying where it came
 * from. `verification` records whether a person has actually opened those
 * sources and checked the values.
 */
export const rulesFileV1Schema = z.object({
  schemaVersion: z.literal(1),
  financialYear: z.string().regex(/^\d{4}-\d{2}$/, "expected a financial year like 2025-26"),
  effectiveFrom: isoDateSchema,
  verification: z.object({
    status: z.enum(["verified", "unverified"]),
    note: z.string().optional(),
  }),
  superannuation: z.object({
    guaranteeRatePercent: percentSchema,
    maximumContributionBaseQuarterlyDollars: z.number().nonnegative(),
    contributionsTaxPercent: percentSchema,
    earningsTaxPercent: percentSchema,
    discountedCapitalGainsTaxPercent: percentSchema,
  }),
  sources: z.object({
    guaranteeRatePercent: z.url(),
    maximumContributionBaseQuarterlyDollars: z.url(),
    contributionsTaxPercent: z.url(),
    earningsTaxPercent: z.url(),
    discountedCapitalGainsTaxPercent: z.url(),
  }),
});

/** The wire type of one rules file, inferred from the schema so the two can't drift apart. */
export type RulesFileV1 = z.infer<typeof rulesFileV1Schema>;

/**
 * Validates unknown data (a parsed JSON file) as a rules file. Throws a
 * `ZodError` naming the bad field; the unit test over every bundled file turns
 * that into a failing build rather than a runtime surprise.
 */
export function parseRulesFile(unknownData: unknown): RulesFileV1 {
  return rulesFileV1Schema.parse(unknownData);
}
