import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Plan } from "../plan/types";
import {
  DATABASE_NAME,
  openPlannerDatabase,
  type PlanRecord,
  type PlannerDatabase,
} from "./database";
import { planToWire } from "./planMapping";
import { IndexedDbPlanStore } from "./planStore";

// Tests IndexedDbPlanStore against fake-indexeddb, an in-memory implementation
// of the browser's IndexedDB API, so no browser is needed.

const plan: Plan = {
  household: { people: [{ id: "person-1", label: "Person 1" }] },
  expenses: {
    livingAnnual: 64000,
    retirementSpending: { kind: "percentOfToday", fraction: 0.9 },
  },
  assumptions: { safeWithdrawalRate: 0.035 },
  portfolios: [{ id: "portfolio-1", name: "Share portfolio", value: 720000 }],
};

describe("IndexedDbPlanStore", () => {
  let database: PlannerDatabase;
  let currentTime: Date;
  let idCounter: number;
  let store: IndexedDbPlanStore;

  beforeEach(async () => {
    database = await openPlannerDatabase();
    currentTime = new Date("2026-03-01T10:00:00.000Z");
    idCounter = 0;
    store = new IndexedDbPlanStore(
      database,
      () => currentTime,
      () => `record-${++idCounter}`,
    );
  });

  afterEach(async () => {
    // A fresh, empty database for the next test.
    database.close();
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DATABASE_NAME);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });

  it("creates the plans and meta stores with their indexes", () => {
    expect([...database.objectStoreNames].sort()).toEqual(["meta", "plans"]);

    const transaction = database.transaction("plans");
    expect([...transaction.store.indexNames].sort()).toEqual(["byBaseId", "byUpdatedAt"]);
  });

  it("reports none on an empty database", async () => {
    expect(await store.loadActivePlan()).toEqual({ status: "none" });
  });

  it("saves a plan and loads back an equal plan", async () => {
    const saved = await store.savePlan(plan);

    expect(saved).toEqual({
      status: "saved",
      recordId: "record-1",
      updatedAt: "2026-03-01T10:00:00.000Z",
    });
    expect(await store.loadActivePlan()).toEqual({
      status: "loaded",
      plan,
      recordId: "record-1",
      updatedAt: "2026-03-01T10:00:00.000Z",
    });
  });

  it("creates a base record called My plan and marks it active", async () => {
    await store.savePlan(plan);

    const record = await database.get("plans", "record-1");
    expect(record).toMatchObject({ id: "record-1", name: "My plan", kind: "base" });
    expect(record?.createdAt).toBe("2026-03-01T10:00:00.000Z");
    expect(await store.getMeta("activePlanId")).toBe("record-1");
  });

  it("updates the same record on later saves and keeps its creation time", async () => {
    const first = await store.savePlan(plan);
    if (first.status !== "saved") throw new Error("expected a save");

    currentTime = new Date("2026-03-01T10:05:00.000Z");
    const edited: Plan = { ...plan, expenses: { livingAnnual: 70000 } };
    const second = await store.savePlan(edited, {
      recordId: first.recordId,
      expectedUpdatedAt: first.updatedAt,
    });

    expect(second).toEqual({
      status: "saved",
      recordId: "record-1",
      updatedAt: "2026-03-01T10:05:00.000Z",
    });
    expect(await database.count("plans")).toBe(1);
    expect((await database.get("plans", "record-1"))?.createdAt).toBe("2026-03-01T10:00:00.000Z");
    expect(await store.loadActivePlan()).toMatchObject({ status: "loaded", plan: edited });
  });

  it("detects a conflict when expectedUpdatedAt is stale and writes nothing", async () => {
    const first = await store.savePlan(plan);
    if (first.status !== "saved") throw new Error("expected a save");

    // "Another tab" saves in between.
    currentTime = new Date("2026-03-01T10:05:00.000Z");
    await store.savePlan(plan, { recordId: first.recordId, expectedUpdatedAt: first.updatedAt });

    currentTime = new Date("2026-03-01T10:10:00.000Z");
    const staleSave = await store.savePlan(
      { ...plan, expenses: { livingAnnual: 1 } },
      { recordId: first.recordId, expectedUpdatedAt: first.updatedAt },
    );

    expect(staleSave).toEqual({ status: "conflict" });
    const stored = await database.get("plans", "record-1");
    expect(stored?.updatedAt).toBe("2026-03-01T10:05:00.000Z");
    expect(stored?.document.expenses.livingAnnualDollars).toBe(64000);
  });

  it("reports an unreadable record and leaves it untouched after a later save", async () => {
    const unreadableRecord = {
      id: "broken",
      name: "My plan",
      kind: "base",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      document: { schemaVersion: 1, household: "not an object" },
    } as unknown as PlanRecord;
    await database.put("plans", unreadableRecord);
    await store.setMeta("activePlanId", "broken");

    const loadResult = await store.loadActivePlan();
    expect(loadResult).toMatchObject({ status: "unreadable", recordId: "broken" });

    // The app then saves new work without a recordId, so it gets a new record.
    const saved = await store.savePlan(plan);

    expect(saved).toMatchObject({ status: "saved", recordId: "record-1" });
    expect(await database.get("plans", "broken")).toEqual(unreadableRecord);
    expect(await store.loadActivePlan()).toMatchObject({ status: "loaded", recordId: "record-1" });
  });

  it("stores the plan in its wire form, not the in-memory form", async () => {
    await store.savePlan(plan);

    const record = await database.get("plans", "record-1");
    expect(record?.document).toEqual(planToWire(plan));
    expect(record?.document.assumptions).toEqual({ safeWithdrawalRatePercent: 3.5 });
  });

  it("reads and writes meta values", async () => {
    expect(await store.getMeta("disclaimerAcceptedAt")).toBeUndefined();

    await store.setMeta("disclaimerAcceptedAt", "2026-03-01T10:00:00.000Z");

    expect(await store.getMeta("disclaimerAcceptedAt")).toBe("2026-03-01T10:00:00.000Z");
  });
});
