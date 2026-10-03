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

  // M2 fields were added without a new schema version, so a document using them must load too.
  it("parses a document with the M2 growth fields and maps it to a plan", () => {
    const result = parsePlanDocument(readFixture("v1-growth.json"));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(planFromWire(result.document)).toStrictEqual({
      household: {
        people: [{ id: "person-1", label: "Person 1", currentAge: 34, targetRetirementAge: 50 }],
      },
      expenses: { livingAnnual: 64000 },
      assumptions: { inflationRate: 0.025 },
      portfolios: [
        {
          id: "portfolio-1",
          name: "Share portfolio",
          value: 720000,
          expectedReturn: 0.07,
          annualContribution: 30000,
          contributionsStopAge: 50,
        },
      ],
    });
  });

  // M3 fields were also added without a new schema version.
  it("parses a document with the M3 drawdown fields and maps it to a plan", () => {
    const result = parsePlanDocument(readFixture("v1-drawdown.json"));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(planFromWire(result.document)).toStrictEqual({
      household: {
        people: [{ id: "person-1", label: "Person 1", currentAge: 40, targetRetirementAge: 45 }],
        projectionEndAge: 90,
      },
      cash: { balance: 20000 },
      expenses: {
        livingAnnual: 40000,
        datedExpenses: [
          { id: "expense-1", name: "Replace car", annual: 30000, fromYear: 2028, toYear: 2028 },
          { id: "expense-2", name: "School fees", annual: 10000, fromYear: 2029, toYear: 2030 },
          { id: "expense-3", name: "", fromYear: 2031, toYear: 2031 },
        ],
      },
      assumptions: { inflationRate: 0.02, interestRate: 0.035 },
      portfolios: [
        {
          id: "portfolio-1",
          name: "Share portfolio",
          value: 200000,
          expectedReturn: 0.05,
          annualContribution: 20000,
        },
      ],
    });
  });

  // Salary (M5) was also added without a new schema version.
  it("parses a document with salary and maps it to a plan", () => {
    const result = parsePlanDocument(readFixture("v1-salary.json"));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(planFromWire(result.document).household.people).toStrictEqual([
      {
        id: "person-1",
        label: "Person 1",
        currentAge: 34,
        targetRetirementAge: 50,
        salary: { annual: 145000, growth: { kind: "inflationPlus", margin: 0.01 } },
      },
    ]);
  });

  // Super (M5) was also added without a new schema version.
  it("parses a document with a super account and maps it to a plan", () => {
    const result = parsePlanDocument(readFixture("v1-super.json"));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(planFromWire(result.document).household.people[0]?.superAccount).toStrictEqual({
      balance: 180000,
      returnRate: 0.065,
      employerRate: 0.115,
      salarySacrifice: { annual: 10000, fromYear: 2027, toYear: 2040 },
      nonConcessional: { annual: 5000 },
      earningsTaxRate: 0.12,
    });
  });

  it("rejects a super contribution whose To year is before its From year", () => {
    const document = readFixture("v1-super.json") as {
      household: { people: { superAccount: { salarySacrifice: { toYear: number } } }[] };
    };
    const [person] = document.household.people;
    if (person === undefined) throw new Error("fixture has no person");
    person.superAccount.salarySacrifice.toYear = 2020;

    expect(parsePlanDocument(document).ok).toBe(false);
  });

  // A growth kind this version doesn't know is rejected rather than guessed at.
  it("rejects an unknown salary growth kind", () => {
    const document = readFixture("v1-salary.json") as {
      household: { people: { salary: { growth: unknown } }[] };
    };
    const [person] = document.household.people;
    if (person === undefined) throw new Error("fixture has no person");
    person.salary.growth = { kind: "compound" };

    expect(parsePlanDocument(document).ok).toBe(false);
  });

  // A dated expense that ends before it starts is rejected, not repaired.
  it("rejects a dated expense whose toYear is before its fromYear", () => {
    const document = readFixture("v1-drawdown.json") as {
      expenses: Record<string, unknown>;
    };

    const result = parsePlanDocument({
      ...document,
      expenses: {
        ...document.expenses,
        datedExpenses: [{ id: "e", name: "Bad", fromYear: 2030, toYear: 2029 }],
      },
    });

    expect(result.ok).toBe(false);
  });

  // Years are whole numbers from 1900 to 2200.
  it.each([2030.5, 1899, 2201])("rejects a dated expense year of %s", (year) => {
    const document = readFixture("v1-drawdown.json") as {
      expenses: Record<string, unknown>;
    };

    const result = parsePlanDocument({
      ...document,
      expenses: {
        ...document.expenses,
        datedExpenses: [{ id: "e", name: "Bad", fromYear: year, toYear: 2200 }],
      },
    });

    expect(result.ok).toBe(false);
  });

  // Ages are whole numbers from 0 to 120; anything else is rejected.
  it.each([-1, 121, 34.5])("rejects a current age of %s", (age) => {
    const document = readFixture("v1-growth.json") as {
      household: { people: Record<string, unknown>[] };
    };
    const [person] = document.household.people;

    const result = parsePlanDocument({
      ...document,
      household: { people: [{ ...person, currentAgeYears: age }] },
    });

    expect(result.ok).toBe(false);
  });

  // Percents and dollars can't be negative.
  it("rejects a negative inflation percent and a negative contribution", () => {
    const document = readFixture("v1-growth.json") as Record<string, unknown>;

    expect(parsePlanDocument({ ...document, assumptions: { inflationPercent: -1 } }).ok).toBe(
      false,
    );
    expect(
      parsePlanDocument({
        ...document,
        portfolios: [{ id: "p", name: "P", annualContributionDollars: -5 }],
      }).ok,
    ).toBe(false);
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
