// The stored (wire) shape of a plan, version 1.
//
// This is the format written to IndexedDB (and, later, to export files). It is
// deliberately separate from the in-memory `Plan` (src/plan/types.ts):
//
//   Plan (fractions, defaults left unset) <──planMapping.ts──► PlanDocumentV1
//                                                               (units in field names)
//
// Units are spelled out in field names (`...Dollars`, `...Percent`) so a stored
// file can be read without knowing the code. Only values the user has set are
// stored; defaults are applied at calculation time, never saved.

import { z } from "zod";

/**
 * The document version this build writes. Bump it (and add a migration in
 * migrations.ts, plus a fixture in tests/fixtures/plan-documents/) whenever the
 * meaning of existing fields changes.
 */
export const CURRENT_SCHEMA_VERSION = 1;

/** An age in whole years, 0 to 120. Shared by every stored age so the range is defined once. */
const ageYearsSchema = z.number().int().min(0).max(120);

/**
 * Zod schema for version 1 of the plan document. It is the single definition:
 * the TypeScript type below is inferred from it, and `parsePlanDocument`
 * (migrations.ts) validates stored data against it.
 */
export const planDocumentV1Schema = z.object({
  schemaVersion: z.literal(1),
  household: z.object({
    people: z.array(
      z.object({
        id: z.string(),
        label: z.string().optional(),
        currentAgeYears: ageYearsSchema.optional(),
        targetRetirementAgeYears: ageYearsSchema.optional(),
      }),
    ),
  }),
  expenses: z.object({
    livingAnnualDollars: z.number().nonnegative().optional(),
    retirement: z
      .discriminatedUnion("kind", [
        z.object({ kind: z.literal("amount"), annualDollars: z.number().nonnegative() }),
        z.object({ kind: z.literal("percentOfToday"), percent: z.number().nonnegative() }),
      ])
      .optional(),
  }),
  assumptions: z.object({
    safeWithdrawalRatePercent: z.number().positive().optional(),
    inflationPercent: z.number().nonnegative().optional(),
  }),
  portfolios: z.array(
    // Optional (unlike the first sketch in the plan): "store only what the user set".
    z.object({
      id: z.string(),
      name: z.string(),
      valueDollars: z.number().optional(),
      expectedReturnPercent: z.number().nonnegative().optional(),
      annualContributionDollars: z.number().nonnegative().optional(),
      contributionsStopAgeYears: ageYearsSchema.optional(),
    }),
  ),
});

/** A plan as stored: the type inferred from `planDocumentV1Schema`. */
export type PlanDocumentV1 = z.infer<typeof planDocumentV1Schema>;
