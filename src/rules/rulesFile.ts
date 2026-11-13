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

/** An age in whole years. The same 0 to 120 limit as the ages stored in a plan. */
const ageSchema = z.number().int().min(0).max(120);

/** A calendar date as `YYYY-MM-DD`, the form used for `effectiveFrom`. */
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected a date like 2025-07-01");

/** A dollar amount that cannot be negative (thresholds, offsets). */
const dollarsSchema = z.number().nonnegative();

/** The superannuation section of a rules file. */
const superannuationWireSchema = z.object({
  guaranteeRatePercent: percentSchema,
  maximumContributionBaseQuarterlyDollars: dollarsSchema,
  contributionsTaxPercent: percentSchema,
  earningsTaxPercent: percentSchema,
  discountedCapitalGainsTaxPercent: percentSchema,
  preservationAgeYears: ageSchema,
  noConditionsAgeYears: ageSchema,
});

/**
 * One resident tax bracket: the rate applies to taxable income from
 * `fromDollars` up to the next bracket's start (or without limit, for the last).
 */
const taxBracketWireSchema = z.object({
  fromDollars: dollarsSchema,
  ratePercent: percentSchema,
});

/**
 * The income tax section of a rules file (M8): resident brackets, the low
 * income tax offset (LITO) and the Medicare levy.
 */
const incomeTaxWireSchema = z.object({
  residentBrackets: z
    .array(taxBracketWireSchema)
    .min(1)
    .refine((brackets) => brackets[0]?.fromDollars === 0, {
      message: "the first bracket must start at $0",
    })
    .refine(
      (brackets) =>
        brackets.every(
          (bracket, index) =>
            index === 0 || bracket.fromDollars > (brackets[index - 1]?.fromDollars ?? 0),
        ),
      { message: "bracket start amounts must increase" },
    ),
  lowIncomeTaxOffset: z
    .object({
      maximumDollars: dollarsSchema,
      firstThresholdDollars: dollarsSchema,
      firstReductionPercent: percentSchema,
      secondThresholdDollars: dollarsSchema,
      secondReductionPercent: percentSchema,
    })
    .refine((offset) => offset.firstThresholdDollars <= offset.secondThresholdDollars, {
      message: "the offset's first threshold must not be above its second",
    }),
  medicareLevy: z.object({
    ratePercent: percentSchema,
    lowIncomeThresholdDollars: dollarsSchema,
    shadeInPercent: percentSchema,
  }),
});

/** The source-link keys each section needs: one URL per superannuation value. */
const superannuationSourceKeys = [
  "guaranteeRatePercent",
  "maximumContributionBaseQuarterlyDollars",
  "contributionsTaxPercent",
  "earningsTaxPercent",
  "discountedCapitalGainsTaxPercent",
  "preservationAgeYears",
  "noConditionsAgeYears",
] as const;

/** The source-link keys the income tax section needs: one URL per group of values. */
const incomeTaxSourceKeys = ["residentBrackets", "lowIncomeTaxOffset", "medicareLevy"] as const;

/** Every source key a file may carry; which are required depends on the sections present. */
const sourcesWireSchema = z.object({
  guaranteeRatePercent: z.url().optional(),
  maximumContributionBaseQuarterlyDollars: z.url().optional(),
  contributionsTaxPercent: z.url().optional(),
  earningsTaxPercent: z.url().optional(),
  discountedCapitalGainsTaxPercent: z.url().optional(),
  preservationAgeYears: z.url().optional(),
  noConditionsAgeYears: z.url().optional(),
  residentBrackets: z.url().optional(),
  lowIncomeTaxOffset: z.url().optional(),
  medicareLevy: z.url().optional(),
});

/**
 * Zod schema for version 1 of a rules file. Each section (`superannuation`,
 * `incomeTax`) is optional, because a file holds only the sections it changes
 * (the FY2026-27 file carries only `incomeTax`). A file must have at least one
 * section, and a section must come with its `sources` entries, so a value can't
 * be added without saying where it came from. `verification` records whether a
 * person has actually opened those sources and checked the values.
 */
export const rulesFileV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    financialYear: z.string().regex(/^\d{4}-\d{2}$/, "expected a financial year like 2025-26"),
    effectiveFrom: isoDateSchema,
    verification: z.object({
      status: z.enum(["verified", "unverified"]),
      note: z.string().optional(),
    }),
    superannuation: superannuationWireSchema.optional(),
    incomeTax: incomeTaxWireSchema.optional(),
    sources: sourcesWireSchema,
  })
  .superRefine((file, context) => {
    if (file.superannuation === undefined && file.incomeTax === undefined) {
      context.addIssue({
        code: "custom",
        message: "a rules file needs at least one section (superannuation or incomeTax)",
      });
    }

    // A section without its source links is rejected, one issue per missing link.
    const requiredSourceKeys = [
      ...(file.superannuation !== undefined ? superannuationSourceKeys : []),
      ...(file.incomeTax !== undefined ? incomeTaxSourceKeys : []),
    ];

    for (const sourceKey of requiredSourceKeys) {
      if (file.sources[sourceKey] === undefined) {
        context.addIssue({
          code: "custom",
          path: ["sources", sourceKey],
          message: `missing source link for ${sourceKey}`,
        });
      }
    }
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
