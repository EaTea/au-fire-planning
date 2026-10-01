import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { parsePlanDocument } from "./migrations";
import { planFromWire } from "./planMapping";

// Tests for reading stored documents: stored fixtures must keep loading, and
// bad input must come back as an error rather than an exception.

/** Reads a stored fixture document (kept forever, one per released schema version). */
function readFixture(fileName: string): unknown {
  // Vitest runs from the repository root, so the path is relative to it.
  const path = join(process.cwd(), "tests", "fixtures", "plan-documents", fileName);
  return JSON.parse(readFileSync(path, "utf-8"));
}

describe("parsePlanDocument", () => {
  // Guards backwards compatibility: this document was valid when version 1 shipped.
  it("parses the v1-basic fixture and maps it to a plan", () => {
    const result = parsePlanDocument(readFixture("v1-basic.json"));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(planFromWire(result.document)).toStrictEqual({
      household: { people: [{ id: "person-1", label: "Person 1" }] },
      expenses: {
        livingAnnual: 64000,
        retirementSpending: { kind: "percentOfToday", fraction: 0.9 },
      },
      assumptions: { safeWithdrawalRate: 0.041 },
      portfolios: [{ id: "portfolio-1", name: "Share portfolio", value: 720000 }],
    });
  });

  // A field with the wrong type must be rejected by validation.
  it("rejects wrong types", () => {
    const document = readFixture("v1-basic.json") as Record<string, unknown>;
    const result = parsePlanDocument({ ...document, expenses: { livingAnnualDollars: "lots" } });

    expect(result.ok).toBe(false);
  });

  // Out-of-range numbers are caught by the schema's constraints.
  it("rejects a negative living expense", () => {
    const document = readFixture("v1-basic.json") as Record<string, unknown>;
    const result = parsePlanDocument({ ...document, expenses: { livingAnnualDollars: -1 } });

    expect(result.ok).toBe(false);
  });

  // Without a version there is no way to know how to read the document.
  it("rejects a document with no schemaVersion", () => {
    const withoutVersion = readFixture("v1-basic.json") as Record<string, unknown>;
    delete withoutVersion.schemaVersion;

    const result = parsePlanDocument(withoutVersion);

    expect(result.ok).toBe(false);
  });

  // A plan saved by a newer app must not be misread (or overwritten) by this one.
  it("rejects an unknown future schemaVersion", () => {
    const document = readFixture("v1-basic.json") as Record<string, unknown>;
    const result = parsePlanDocument({ ...document, schemaVersion: 999 });

    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.error).toContain("999");
  });

  // Anything that is not a JSON object must come back as an error, never a throw.
  it.each([null, undefined, 42, "text", [], true])("rejects %j without throwing", (input) => {
    expect(parsePlanDocument(input).ok).toBe(false);
  });
});
