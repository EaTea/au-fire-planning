// Reads a stored plan document of any known version and brings it up to the
// current one.
//
//   unknown JSON ─► read schemaVersion ─► migrate v(n) → v(n+1) → … → current
//                ─► validate with Zod ─► { ok: true, document } | { ok: false, error }
//
// Used by the load path. It never throws for bad input: a record that can't be
// read is reported as an error so the caller can leave it untouched (the plan
// never overwrites what it can't read).

import { CURRENT_SCHEMA_VERSION, planDocumentV1Schema, type PlanDocumentV1 } from "./planDocument";

/** The outcome of reading a stored document: the current-version document, or why not. */
export type ParsePlanDocumentResult =
  | { readonly ok: true; readonly document: PlanDocumentV1 }
  | { readonly ok: false; readonly error: string };

/** A pure function that upgrades a document of one version to the next. */
type Migration = (document: unknown) => unknown;

/**
 * Migrations keyed by the version they upgrade FROM (the entry for 1 would
 * produce version 2). Empty for now: version 1 is current. Add an entry here,
 * and a fixture in tests/fixtures/plan-documents/, when a version is added.
 */
export const migrations: Readonly<Record<number, Migration>> = {};

/** True for plain objects (not null, arrays or primitives). */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Migrates and validates a stored document. Takes untrusted JSON of any shape.
 * Returns the current-version document, or an error message describing why it
 * can't be used (not an object, missing/invalid/future `schemaVersion`, a
 * missing migration, or failing validation). Never throws.
 */
export function parsePlanDocument(unknownJson: unknown): ParsePlanDocumentResult {
  if (!isRecord(unknownJson)) {
    return { ok: false, error: "The stored plan is not an object." };
  }

  let version = unknownJson.schemaVersion;
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
    return { ok: false, error: "The stored plan has no valid schemaVersion." };
  }
  if (version > CURRENT_SCHEMA_VERSION) {
    return {
      ok: false,
      error: `The stored plan is version ${version}, newer than this app understands (version ${CURRENT_SCHEMA_VERSION}).`,
    };
  }

  let document: unknown = unknownJson;

  try {
    // Apply one migration at a time until the document is at the current version.
    while (version < CURRENT_SCHEMA_VERSION) {
      const migrate = migrations[version];
      if (migrate === undefined) {
        return { ok: false, error: `No migration is available from version ${version}.` };
      }

      document = migrate(document);
      version += 1;
    }
  } catch (migrationError) {
    const reason =
      migrationError instanceof Error ? migrationError.message : String(migrationError);
    return { ok: false, error: `Migrating the stored plan failed: ${reason}` };
  }

  const validation = planDocumentV1Schema.safeParse(document);
  if (!validation.success) {
    return { ok: false, error: `The stored plan is not valid: ${validation.error.message}` };
  }

  return { ok: true, document: validation.data };
}
