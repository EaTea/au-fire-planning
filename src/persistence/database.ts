// Opens the browser's IndexedDB database and declares its structure.
//
//   openPlannerDatabase() ──► IDBPDatabase<PlannerDatabaseSchema>
//                                 ├─ "plans" store: one PlanRecord per plan (key: id)
//                                 └─ "meta"  store: small key/value settings (key: key)
//
// Only planStore.ts talks to the database directly; the rest of the app goes
// through the `PlanStore` interface (see planStore.ts).

import { openDB, type DBSchema, type IDBPDatabase } from "idb";

import type { PlanDocumentV1 } from "./planDocument";

/** The database's name in the browser, as in part 2 of PLAN.md. */
export const DATABASE_NAME = "au-fire-planner";

/**
 * The database *structure* version (stores and indexes). It is separate from
 * `schemaVersion` inside each plan document, which versions the plan's shape.
 */
export const DATABASE_VERSION = 1;

/**
 * One row in the `plans` store (a wire type: it is exactly what is written to
 * disk). `document` holds the plan itself in its stored form; the rest is
 * bookkeeping. M1 only creates `kind: "base"` records; `baseId` is for the
 * scenarios that arrive in M16.
 */
export interface PlanRecord {
  readonly id: string;
  readonly name: string;
  readonly kind: "base" | "scenario";
  readonly baseId?: string;
  /** ISO 8601 time the record was first saved. */
  readonly createdAt: string;
  /** ISO 8601 time of the latest save; also the version used to detect another tab's save. */
  readonly updatedAt: string;
  readonly document: PlanDocumentV1;
}

/** One row in the `meta` store: a small setting such as the active plan's ID. */
export interface MetaRecord {
  readonly key: string;
  readonly value: string;
}

/** Typed description of the database, so `idb` checks store names, keys and value shapes. */
export interface PlannerDatabaseSchema extends DBSchema {
  plans: {
    key: string;
    value: PlanRecord;
    indexes: { byUpdatedAt: string; byBaseId: string };
  };
  meta: {
    key: string;
    value: MetaRecord;
  };
}

/** The open database connection, as handed to `IndexedDbPlanStore`. */
export type PlannerDatabase = IDBPDatabase<PlannerDatabaseSchema>;

/**
 * Opens (creating on first use) the planner database. Called once at app
 * start by `PersistenceProvider`. Rejects when the browser has no usable
 * IndexedDB (e.g. some private-browsing modes), which is the provider's cue to
 * fall back to in-memory storage.
 *
 * If another tab later upgrades the database, this connection is closed so the
 * upgrade isn't blocked; later saves from this tab then fail and are reported.
 */
export function openPlannerDatabase(): Promise<PlannerDatabase> {
  return openDB<PlannerDatabaseSchema>(DATABASE_NAME, DATABASE_VERSION, {
    // Runs only when the database is created or upgraded. Version 1 creates
    // both stores; later versions will branch on `oldVersion`.
    upgrade(database) {
      const plans = database.createObjectStore("plans", { keyPath: "id" });
      plans.createIndex("byUpdatedAt", "updatedAt");
      plans.createIndex("byBaseId", "baseId");

      database.createObjectStore("meta", { keyPath: "key" });
    },

    // Another tab wants to upgrade the database (a `versionchange` event):
    // close our connection so it can proceed.
    blocking(_currentVersion, _blockedVersion, event) {
      (event.target as IDBDatabase).close();
    },
  });
}
