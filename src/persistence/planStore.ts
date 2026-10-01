// The storage boundary for plans. The rest of the app depends only on the
// `PlanStore` interface; there are two implementations:
//
//   PersistenceProvider ──► PlanStore ──┬─ IndexedDbPlanStore  (real browser storage)
//                                       └─ InMemoryPlanStore   (fallback, and tests)
//
//   save: Plan ─► planToWire ─► parsePlanDocument (validate) ─► conflict check ─► write
//   load: record ─► parsePlanDocument (migrate + validate) ─► planFromWire ─► Plan
//
// Both implementations share the helpers below so they behave identically.

import type { Plan } from "../plan/types";
import type { PlanRecord, PlannerDatabase } from "./database";
import { parsePlanDocument } from "./migrations";
import { planFromWire, planToWire } from "./planMapping";

/** Supplies the current time. Injected so tests can use fixed times. */
export type Clock = () => Date;

/** Supplies a new unique ID. Injected so tests get predictable IDs. */
export type IdGenerator = () => string;

/** The real clock, used in the app. */
export const systemClock: Clock = () => new Date();

/** The real ID generator, used in the app. */
export const randomIdGenerator: IdGenerator = () => crypto.randomUUID();

/** The `meta` key holding the ID of the plan the app opens on start. */
const ACTIVE_PLAN_ID_KEY = "activePlanId";

/** The name given to the first plan a user saves. */
const DEFAULT_PLAN_NAME = "My plan";

/** What `loadActivePlan` found. */
export type LoadResult =
  /** Nothing has been saved yet (a first visit). */
  | { readonly status: "none" }
  /** The saved plan was read and validated. `updatedAt` is the version to pass back when saving. */
  | {
      readonly status: "loaded";
      readonly plan: Plan;
      readonly recordId: string;
      readonly updatedAt: string;
    }
  /** A record exists but can't be read. It is left untouched. */
  | { readonly status: "unreadable"; readonly recordId: string; readonly error: string };

/** Which record a save is for, and which version of it the caller last saw. */
export interface SaveOptions {
  /** The record to update. Omit on the first save (or after an unreadable record) to create a new one. */
  readonly recordId?: string;
  /** The `updatedAt` the caller last loaded or saved. If the stored one differs, nothing is written. */
  readonly expectedUpdatedAt?: string;
}

/** What `savePlan` did. */
export type SaveResult =
  | { readonly status: "saved"; readonly recordId: string; readonly updatedAt: string }
  /** Another tab saved in between; nothing was written. */
  | { readonly status: "conflict" };

/**
 * Everything the app needs from storage. `listPlans` is left out until
 * scenarios arrive in M16.
 */
export interface PlanStore {
  /** Reads the active plan (see `LoadResult`). */
  loadActivePlan(): Promise<LoadResult>;

  /** Writes the plan, creating its record on first save. Rejects if the plan can't be written. */
  savePlan(plan: Plan, options?: SaveOptions): Promise<SaveResult>;

  /** Reads a small setting (e.g. when the disclaimer was accepted); undefined if never set. */
  getMeta(key: string): Promise<string | undefined>;

  /** Writes a small setting. */
  setMeta(key: string, value: string): Promise<void>;
}

/**
 * Turns a stored record into a `LoadResult`. Shared by both stores. A record
 * that fails migration or validation is reported as unreadable, never thrown.
 */
function interpretRecord(record: PlanRecord): LoadResult {
  const parsed = parsePlanDocument(record.document);

  if (!parsed.ok) {
    return { status: "unreadable", recordId: record.id, error: parsed.error };
  }

  return {
    status: "loaded",
    plan: planFromWire(parsed.document),
    recordId: record.id,
    updatedAt: record.updatedAt,
  };
}

/**
 * Builds the record to write for a save. Shared by both stores. Throws if the
 * mapped document fails validation (a bug in the mapper, not a user error), so
 * invalid data is never stored. An existing record keeps its name, kind and
 * creation time; a new one is a base plan called "My plan".
 */
function buildRecord(
  plan: Plan,
  existingRecord: PlanRecord | undefined,
  recordId: string,
  now: Date,
): PlanRecord {
  const validation = parsePlanDocument(planToWire(plan));

  if (!validation.ok) {
    throw new Error(`Refusing to save an invalid plan: ${validation.error}`);
  }

  const timestamp = now.toISOString();

  return {
    id: recordId,
    name: existingRecord?.name ?? DEFAULT_PLAN_NAME,
    kind: existingRecord?.kind ?? "base",
    ...(existingRecord?.baseId !== undefined && { baseId: existingRecord.baseId }),
    createdAt: existingRecord?.createdAt ?? timestamp,
    updatedAt: timestamp,
    document: validation.document,
  };
}

/**
 * True when a save must be refused because the caller's version is stale:
 * it expected a version (`expectedUpdatedAt`) and the stored record isn't it
 * (changed by another tab, or gone).
 */
function isStale(existingRecord: PlanRecord | undefined, expectedUpdatedAt?: string): boolean {
  return expectedUpdatedAt !== undefined && existingRecord?.updatedAt !== expectedUpdatedAt;
}

/**
 * `PlanStore` backed by the browser's IndexedDB. Created by
 * `PersistenceProvider` after `openPlannerDatabase()` succeeds. The clock and
 * ID generator are injected (see `Clock`, `IdGenerator`) so tests are deterministic.
 */
export class IndexedDbPlanStore implements PlanStore {
  constructor(
    private readonly database: PlannerDatabase,
    private readonly clock: Clock = systemClock,
    private readonly generateId: IdGenerator = randomIdGenerator,
  ) {}

  /** Reads the plan named by `meta.activePlanId`. See `PlanStore.loadActivePlan`. */
  async loadActivePlan(): Promise<LoadResult> {
    const activePlanId = await this.getMeta(ACTIVE_PLAN_ID_KEY);
    if (activePlanId === undefined) {
      return { status: "none" };
    }

    const record = await this.database.get("plans", activePlanId);
    if (record === undefined) {
      return { status: "none" };
    }

    return interpretRecord(record);
  }

  /**
   * Writes the plan and marks it active, all in one transaction so a crash
   * can't leave the active ID pointing at nothing. The staleness check happens
   * inside the same transaction, so two tabs can't both pass it. Nothing is
   * written on a conflict. An existing record is only ever replaced by a
   * valid one: an unreadable record is never passed in here, because the
   * caller saves with no `recordId` and so gets a new record.
   */
  async savePlan(plan: Plan, options: SaveOptions = {}): Promise<SaveResult> {
    const recordId = options.recordId ?? this.generateId();
    const transaction = this.database.transaction(["plans", "meta"], "readwrite");

    const existingRecord = await transaction.objectStore("plans").get(recordId);
    if (isStale(existingRecord, options.expectedUpdatedAt)) {
      return { status: "conflict" };
    }

    const record = buildRecord(plan, existingRecord, recordId, this.clock());
    await transaction.objectStore("plans").put(record);
    await transaction.objectStore("meta").put({ key: ACTIVE_PLAN_ID_KEY, value: recordId });
    await transaction.done;

    return { status: "saved", recordId, updatedAt: record.updatedAt };
  }

  /** Reads one `meta` value. See `PlanStore.getMeta`. */
  async getMeta(key: string): Promise<string | undefined> {
    const record = await this.database.get("meta", key);
    return record?.value;
  }

  /** Writes one `meta` value. See `PlanStore.setMeta`. */
  async setMeta(key: string, value: string): Promise<void> {
    await this.database.put("meta", { key, value });
  }
}

/**
 * `PlanStore` that keeps everything in memory, with the same behaviour as the
 * IndexedDB one (including mapping to the wire form and validating). Used when
 * the browser won't give the app storage (the plan is lost on close), and in
 * component tests. It can be pre-loaded with records to test the load paths.
 */
export class InMemoryPlanStore implements PlanStore {
  private readonly records = new Map<string, PlanRecord>();
  private readonly metaValues = new Map<string, string>();

  constructor(
    private readonly clock: Clock = systemClock,
    private readonly generateId: IdGenerator = randomIdGenerator,
    initialRecords: readonly PlanRecord[] = [],
    initialActivePlanId?: string,
  ) {
    for (const record of initialRecords) {
      this.records.set(record.id, record);
    }
    if (initialActivePlanId !== undefined) {
      this.metaValues.set(ACTIVE_PLAN_ID_KEY, initialActivePlanId);
    }
  }

  /** In-memory version of `IndexedDbPlanStore.loadActivePlan`. */
  async loadActivePlan(): Promise<LoadResult> {
    const activePlanId = this.metaValues.get(ACTIVE_PLAN_ID_KEY);
    const record = activePlanId === undefined ? undefined : this.records.get(activePlanId);

    return record === undefined ? { status: "none" } : interpretRecord(record);
  }

  /** In-memory version of `IndexedDbPlanStore.savePlan`. */
  async savePlan(plan: Plan, options: SaveOptions = {}): Promise<SaveResult> {
    const recordId = options.recordId ?? this.generateId();
    const existingRecord = this.records.get(recordId);
    if (isStale(existingRecord, options.expectedUpdatedAt)) {
      return { status: "conflict" };
    }

    const record = buildRecord(plan, existingRecord, recordId, this.clock());
    this.records.set(recordId, record);
    this.metaValues.set(ACTIVE_PLAN_ID_KEY, recordId);

    return { status: "saved", recordId, updatedAt: record.updatedAt };
  }

  /** In-memory version of `IndexedDbPlanStore.getMeta`. */
  async getMeta(key: string): Promise<string | undefined> {
    return this.metaValues.get(key);
  }

  /** In-memory version of `IndexedDbPlanStore.setMeta`. */
  async setMeta(key: string, value: string): Promise<void> {
    this.metaValues.set(key, value);
  }
}
