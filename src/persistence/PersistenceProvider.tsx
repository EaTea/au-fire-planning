// Loads the saved plan when the app starts and autosaves edits afterwards.
// Sits inside PlanProvider (see src/ui/App.tsx) so it can read and replace the plan.
//
//   start ─► open store ──fails──► InMemoryPlanStore + "won't be kept" banner
//               │
//               ▼
//        loadActivePlan ─► none ────────► keep the blank plan
//               │          loaded ──────► dispatch replacePlan(saved plan)
//               │          unreadable ──► keep blank plan + banner (record left untouched)
//               ▼
//        read meta `disclaimerAcceptedAt`; if never set, rewrite the URL to #/welcome
//               │   (done BEFORE children mount, so the requested page never flashes)
//               ▼
//        phase "ready": children are shown
//
//   edit ─► plan changes ─► wait 500 ms of quiet ─► savePlan ─► saved:    remember new updatedAt
//                                                           └─► conflict: banner, autosave stops
//
// How a freshly loaded plan avoids being saved straight back: the plan we
// loaded (or started with) is remembered in `lastPersistedPlanRef`. Autosave
// only runs when the current plan is a different object from it, and the
// reducer returns the very object we dispatch for `replacePlan`, so loading
// never looks like an edit.

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

import { usePlan, usePlanDispatch } from "../plan/PlanProvider";
import type { Plan } from "../plan/types";
import { Banner } from "../ui/components/Banner";
import { openPlannerDatabase } from "./database";
import {
  IndexedDbPlanStore,
  InMemoryPlanStore,
  systemClock,
  type Clock,
  type PlanStore,
} from "./planStore";

/** How long the plan must stay unchanged before it is saved. */
export const AUTOSAVE_DELAY_MILLISECONDS = 500;

/** The `meta` key holding the ISO time the user accepted the disclaimer (NFR-5). */
export const DISCLAIMER_ACCEPTED_AT_KEY = "disclaimerAcceptedAt";

/** The route of the first-run welcome page (see src/ui/screens/WelcomeScreen.tsx). */
export const WELCOME_HASH = "#/welcome";

const STORAGE_UNAVAILABLE_MESSAGE =
  "Your browser isn't letting this app store data, so your plan won't be kept after you close this tab.";
const UNREADABLE_PLAN_MESSAGE =
  "Your saved plan couldn't be read. It has been kept unchanged, and your new changes will be saved separately.";
const CONFLICT_MESSAGE = "This plan was changed in another tab. Reload to see the latest version.";
const SAVE_FAILED_MESSAGE =
  "Your latest changes couldn't be saved to this browser. They will be retried after your next edit.";

/**
 * Opens the real browser storage. The default for `PersistenceProvider`; throws
 * when IndexedDB is missing or blocked, which the provider treats as "use memory".
 */
async function openBrowserStore(): Promise<PlanStore> {
  return new IndexedDbPlanStore(await openPlannerDatabase());
}

/** What the provider remembers about the saved record, so saves can detect another tab's changes. */
interface SavedVersion {
  readonly recordId?: string;
  readonly updatedAt?: string;
}

/** What screens can read and do about the disclaimer, provided by PersistenceProvider. */
interface DisclaimerState {
  /** True once the user has pressed "Start planning" on this device (now or on an earlier visit). */
  readonly hasAcceptedDisclaimer: boolean;
  /**
   * Records acceptance (ISO time from the clock) in `meta`. Does nothing if
   * already accepted, so the original time is kept. Never rejects: if the
   * write fails the user can still carry on this session and is warned.
   */
  readonly acceptDisclaimer: () => Promise<void>;
}

const DisclaimerContext = createContext<DisclaimerState | null>(null);

/**
 * Reads the disclaimer state. Used by WelcomeScreen. Throws if used outside
 * PersistenceProvider, which would be a wiring mistake in App.
 */
export function useDisclaimer(): DisclaimerState {
  const state = useContext(DisclaimerContext);
  if (state === null) {
    throw new Error("useDisclaimer must be used inside PersistenceProvider");
  }
  return state;
}

interface PersistenceProviderProps {
  /** How to get a store. Tests pass an in-memory one; the app uses the browser's IndexedDB. */
  readonly openStore?: () => Promise<PlanStore>;
  /** Quiet time before saving. Overridable for tests only. */
  readonly autosaveDelayMilliseconds?: number;
  /** Source of the acceptance time. Overridable for tests only. */
  readonly clock?: Clock;
  readonly children: ReactNode;
}

/**
 * Connects the plan to storage: shows "Loading your plan…" until the saved
 * plan has been read, then renders `children` with any storage warnings above
 * them, and autosaves every edit after a short pause.
 */
export function PersistenceProvider({
  openStore = openBrowserStore,
  autosaveDelayMilliseconds = AUTOSAVE_DELAY_MILLISECONDS,
  clock = systemClock,
  children,
}: PersistenceProviderProps) {
  const plan = usePlan();
  const dispatch = usePlanDispatch();

  const [isLoaded, setIsLoaded] = useState(false);
  const [isStorageUnavailable, setIsStorageUnavailable] = useState(false);
  const [isSavedPlanUnreadable, setIsSavedPlanUnreadable] = useState(false);
  const [hasConflict, setHasConflict] = useState(false);
  const [hasSaveFailed, setHasSaveFailed] = useState(false);
  const [disclaimerAcceptedAt, setDisclaimerAcceptedAt] = useState<string | undefined>(undefined);

  // The store is created during loading and used by every later save.
  const storeRef = useRef<PlanStore | null>(null);

  // The plan most recently loaded or saved. Autosave ignores a plan that is this object.
  const lastPersistedPlanRef = useRef<Plan | null>(null);

  // Which record we are saving to and the version we last saw of it.
  const savedVersionRef = useRef<SavedVersion>({});

  // Saves run one at a time, in order, so each uses the version the previous one produced.
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

  // The plan at the moment loading starts, which is the blank plan if nothing is saved.
  const planAtStartRef = useRef(plan);

  const hasRequestedPersistentStorageRef = useRef(false);

  // Step 1: open the store and load the active plan. Runs once at start.
  useEffect(() => {
    let isCancelled = false;

    async function loadSavedPlan() {
      let store: PlanStore;
      try {
        store = await openStore();
      } catch {
        store = new InMemoryPlanStore();
        if (!isCancelled) setIsStorageUnavailable(true);
      }

      const loadResult = await store.loadActivePlan().catch(() => undefined);
      if (isCancelled) return;

      storeRef.current = store;
      lastPersistedPlanRef.current = planAtStartRef.current;

      if (loadResult?.status === "loaded") {
        // Remember this exact object first: the reducer hands it straight back
        // as the new plan, so autosave sees "nothing changed".
        lastPersistedPlanRef.current = loadResult.plan;
        savedVersionRef.current = {
          recordId: loadResult.recordId,
          updatedAt: loadResult.updatedAt,
        };
        dispatch({ type: "replacePlan", plan: loadResult.plan });
      } else if (loadResult?.status === "unreadable") {
        // Leave savedVersionRef empty: the next save then creates a new record
        // and the unreadable one is never overwritten.
        setIsSavedPlanUnreadable(true);
      }

      // First run: send the user to the welcome page whatever URL they opened.
      // replaceState swaps the URL without adding a history entry (so Back
      // doesn't return to a page they were never allowed to see) and without
      // a visible flash, because the router is created only once isLoaded is
      // true and reads the URL then.
      const acceptedAt = await store.getMeta(DISCLAIMER_ACCEPTED_AT_KEY).catch(() => undefined);
      if (isCancelled) return;

      if (acceptedAt === undefined) {
        window.history.replaceState(null, "", WELCOME_HASH);
      }
      setDisclaimerAcceptedAt(acceptedAt);

      setIsLoaded(true);
    }

    void loadSavedPlan();

    return () => {
      isCancelled = true;
    };
    // Deliberately once: later changes to `openStore` must not reload the plan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Performs one save and records the outcome: the new version on success, a
   * banner on conflict or failure. Called from the autosave timer, through the
   * save queue. Never throws, so one failed save can't break the queue.
   */
  async function savePlanNow(store: PlanStore, planToSave: Plan): Promise<void> {
    try {
      const result = await store.savePlan(planToSave, {
        recordId: savedVersionRef.current.recordId,
        expectedUpdatedAt: savedVersionRef.current.updatedAt,
      });

      if (result.status === "conflict") {
        setHasConflict(true);
        return;
      }

      savedVersionRef.current = { recordId: result.recordId, updatedAt: result.updatedAt };
      lastPersistedPlanRef.current = planToSave;
      setHasSaveFailed(false);

      // Ask the browser not to evict our data, once, after the first real save.
      if (!hasRequestedPersistentStorageRef.current) {
        hasRequestedPersistentStorageRef.current = true;
        await navigator.storage?.persist?.().catch(() => undefined);
      }
    } catch {
      setHasSaveFailed(true);
    }
  }

  /**
   * Stores the acceptance time. Called by WelcomeScreen's "Start planning"
   * button, through the disclaimer context. Updates state even if the write
   * fails (shows the save-failed banner), so a broken store can't lock the
   * user out of the app.
   */
  async function acceptDisclaimer(): Promise<void> {
    if (disclaimerAcceptedAt !== undefined) return;

    const acceptedAt = clock().toISOString();
    try {
      await storeRef.current?.setMeta(DISCLAIMER_ACCEPTED_AT_KEY, acceptedAt);
    } catch {
      setHasSaveFailed(true);
    }
    setDisclaimerAcceptedAt(acceptedAt);
  }

  // Step 2: after each edit, save once the plan has been quiet for the delay.
  useEffect(() => {
    const store = storeRef.current;
    const isNothingToSave = plan === lastPersistedPlanRef.current;
    if (!isLoaded || store === null || hasConflict || isNothingToSave) {
      return;
    }

    // Every new edit re-runs this effect, which cancels the previous timer.
    const timer = setTimeout(() => {
      saveQueueRef.current = saveQueueRef.current.then(() => savePlanNow(store, plan));
    }, autosaveDelayMilliseconds);

    return () => clearTimeout(timer);
  }, [plan, isLoaded, hasConflict, autosaveDelayMilliseconds]);

  if (!isLoaded) {
    return <p>Loading your plan…</p>;
  }

  const disclaimerState: DisclaimerState = {
    hasAcceptedDisclaimer: disclaimerAcceptedAt !== undefined,
    acceptDisclaimer,
  };

  return (
    <DisclaimerContext.Provider value={disclaimerState}>
      {isStorageUnavailable && <Banner tone="warning">{STORAGE_UNAVAILABLE_MESSAGE}</Banner>}
      {isSavedPlanUnreadable && <Banner tone="warning">{UNREADABLE_PLAN_MESSAGE}</Banner>}
      {hasConflict && <Banner tone="warning">{CONFLICT_MESSAGE}</Banner>}
      {hasSaveFailed && <Banner tone="warning">{SAVE_FAILED_MESSAGE}</Banner>}
      {children}
    </DisclaimerContext.Provider>
  );
}
