import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PlanProvider, usePlan, usePlanDispatch } from "../plan/PlanProvider";
import type { Plan } from "../plan/types";
import type { PlanRecord } from "./database";
import { PersistenceProvider, useDisclaimer } from "./PersistenceProvider";
import { planToWire } from "./planMapping";
import { InMemoryPlanStore, type PlanStore } from "./planStore";

// Component tests for PersistenceProvider: loading, the autosave debounce and
// the warning banners. They use InMemoryPlanStore and fake timers, so the
// 500 ms wait is simulated rather than waited for.

const blankPlan: Plan = {
  household: { people: [{ id: "person-1", label: "Person 1" }] },
  expenses: {},
  assumptions: {},
  portfolios: [{ id: "portfolio-1", name: "Share portfolio" }],
};

const savedPlan: Plan = { ...blankPlan, expenses: { livingAnnual: 50000 } };

/** A stored record holding `plan`, as if saved by an earlier visit. */
function recordFor(plan: Plan, recordId = "saved-record"): PlanRecord {
  return {
    id: recordId,
    name: "My plan",
    kind: "base",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    document: planToWire(plan),
  };
}

/** Shows the living expenses and has a button that edits them, standing in for an input screen. */
function PlanProbe() {
  const plan = usePlan();
  const dispatch = usePlanDispatch();
  const nextAmount = (plan.expenses.livingAnnual ?? 0) + 1;

  return (
    <div>
      <p data-testid="living">{String(plan.expenses.livingAnnual)}</p>
      <button onClick={() => dispatch({ type: "setLivingExpenses", annual: nextAmount })}>
        edit
      </button>
    </div>
  );
}

/** Renders the provider around the probe and lets loading finish (no timers are needed for it). */
async function renderProvider(openStore: () => Promise<PlanStore>) {
  render(
    <PlanProvider initialPlan={blankPlan}>
      <PersistenceProvider openStore={openStore}>
        <PlanProbe />
      </PersistenceProvider>
    </PlanProvider>,
  );

  await act(async () => {});
}

/** Presses the probe's edit button, like a user changing a field. */
function clickEdit() {
  fireEvent.click(screen.getByRole("button", { name: "edit" }));
}

/** Moves the fake clock forward and lets the save that fires finish. */
async function advanceTime(milliseconds: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(milliseconds);
  });
}

describe("PersistenceProvider", () => {
  const persist = vi.fn(async () => true);

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    persist.mockClear();
    Object.defineProperty(navigator, "storage", { value: { persist }, configurable: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // The loading message shows until the store has answered.
  it("shows a loading message until the saved plan has been read", async () => {
    let finishOpening: (store: PlanStore) => void = () => {};
    const opening = new Promise<PlanStore>((resolve) => {
      finishOpening = resolve;
    });

    render(
      <PlanProvider initialPlan={blankPlan}>
        <PersistenceProvider openStore={() => opening}>
          <PlanProbe />
        </PersistenceProvider>
      </PlanProvider>,
    );
    expect(screen.getByText("Loading your plan…")).toBeInTheDocument();

    await act(async () => finishOpening(new InMemoryPlanStore()));

    expect(screen.queryByText("Loading your plan…")).not.toBeInTheDocument();
    expect(screen.getByTestId("living")).toHaveTextContent("undefined");
  });

  // The saved plan replaces the blank one.
  it("replaces the blank plan with the saved plan", async () => {
    const store = new InMemoryPlanStore(
      undefined,
      undefined,
      [recordFor(savedPlan)],
      "saved-record",
    );

    await renderProvider(async () => store);

    expect(screen.getByTestId("living")).toHaveTextContent("50000");
  });

  // The guard against saving what was just loaded.
  it("does not save the plan it has just loaded", async () => {
    const store = new InMemoryPlanStore(
      undefined,
      undefined,
      [recordFor(savedPlan)],
      "saved-record",
    );
    const savePlan = vi.spyOn(store, "savePlan");

    await renderProvider(async () => store);
    await advanceTime(5000);

    expect(savePlan).not.toHaveBeenCalled();
  });

  // A first visit with no edits creates no record.
  it("does not save a blank plan the user hasn't edited", async () => {
    const store = new InMemoryPlanStore();
    const savePlan = vi.spyOn(store, "savePlan");

    await renderProvider(async () => store);
    await advanceTime(5000);

    expect(savePlan).not.toHaveBeenCalled();
  });

  // Debounce: a burst of edits makes one save, with the final value.
  it("saves once, 500 ms after the last edit of a burst", async () => {
    const store = new InMemoryPlanStore();
    const savePlan = vi.spyOn(store, "savePlan");
    await renderProvider(async () => store);

    clickEdit();
    await advanceTime(200);
    clickEdit();
    await advanceTime(200);
    clickEdit();

    // 499 ms after the last edit: still waiting.
    await advanceTime(499);
    expect(savePlan).not.toHaveBeenCalled();

    await advanceTime(1);
    expect(savePlan).toHaveBeenCalledTimes(1);

    const reloaded = await store.loadActivePlan();
    expect(reloaded.status === "loaded" && reloaded.plan.expenses.livingAnnual).toBe(3);
  });

  // Later saves update the same record, using the version from the previous save.
  it("saves later edits to the same record", async () => {
    const store = new InMemoryPlanStore(
      undefined,
      undefined,
      [recordFor(savedPlan)],
      "saved-record",
    );
    const savePlan = vi.spyOn(store, "savePlan");
    await renderProvider(async () => store);

    clickEdit();
    await advanceTime(500);
    clickEdit();
    await advanceTime(500);

    expect(savePlan).toHaveBeenCalledTimes(2);
    expect(savePlan.mock.calls[0]?.[1]).toEqual({
      recordId: "saved-record",
      expectedUpdatedAt: "2026-01-02T00:00:00.000Z",
    });
    expect(savePlan.mock.calls[1]?.[1]?.recordId).toBe("saved-record");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  // Persistent storage is requested once, after the first successful save.
  it("asks the browser for persistent storage once", async () => {
    await renderProvider(async () => new InMemoryPlanStore());

    clickEdit();
    await advanceTime(500);
    clickEdit();
    await advanceTime(500);

    expect(persist).toHaveBeenCalledTimes(1);
  });

  // No usable storage: warn, but keep working.
  it("warns and carries on in memory when storage can't be opened", async () => {
    await renderProvider(async () => {
      throw new Error("IndexedDB is blocked");
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Your browser isn't letting this app store data, so your plan won't be kept after you close this tab.",
    );

    clickEdit();
    expect(screen.getByTestId("living")).toHaveTextContent("1");
  });

  // An unreadable record is kept, and new work goes to a new record.
  it("warns about an unreadable plan and saves new work as a new record", async () => {
    const unreadableRecord = { ...recordFor(savedPlan), document: { schemaVersion: 99 } };
    const store = new InMemoryPlanStore(
      undefined,
      () => "new-record",
      [unreadableRecord as unknown as PlanRecord],
      "saved-record",
    );
    const savePlan = vi.spyOn(store, "savePlan");

    await renderProvider(async () => store);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Your saved plan couldn't be read. It has been kept unchanged, and your new changes will be saved separately.",
    );

    clickEdit();
    await advanceTime(500);

    expect(savePlan.mock.calls[0]?.[1]).toEqual({
      recordId: undefined,
      expectedUpdatedAt: undefined,
    });
    await expect(savePlan.mock.results[0]?.value).resolves.toMatchObject({
      status: "saved",
      recordId: "new-record",
    });
  });

  // Another tab saved: warn and stop saving.
  it("warns on a conflict and stops autosaving", async () => {
    const store = new InMemoryPlanStore();
    const savePlan = vi.spyOn(store, "savePlan").mockResolvedValue({ status: "conflict" });
    await renderProvider(async () => store);

    clickEdit();
    await advanceTime(500);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "This plan was changed in another tab. Reload to see the latest version.",
    );

    clickEdit();
    await advanceTime(5000);

    expect(savePlan).toHaveBeenCalledTimes(1);
  });

  // A failed write is reported, and a later edit retries.
  it("reports a failed save and retries after the next edit", async () => {
    const store = new InMemoryPlanStore();
    vi.spyOn(store, "savePlan").mockRejectedValueOnce(new Error("quota exceeded"));
    await renderProvider(async () => store);

    clickEdit();
    await advanceTime(500);
    expect(screen.getByRole("alert")).toHaveTextContent("couldn't be saved");

    clickEdit();
    await advanceTime(500);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  // First run: the URL is rewritten before the children appear.
  it("redirects to #/welcome when the disclaimer has not been accepted", async () => {
    window.location.hash = "#/results";

    await renderProvider(async () => new InMemoryPlanStore());

    expect(window.location.hash).toBe("#/welcome");
  });

  // Returning visitor: the URL is left alone.
  it("leaves the URL alone when the disclaimer was already accepted", async () => {
    window.location.hash = "#/results";
    const store = new InMemoryPlanStore();
    await store.setMeta("disclaimerAcceptedAt", "2026-01-01T00:00:00.000Z");

    await renderProvider(async () => store);

    expect(window.location.hash).toBe("#/results");
  });

  // The acceptance time comes from the injected clock and is stored once.
  it("stores disclaimerAcceptedAt from the clock and keeps the first time", async () => {
    const store = new InMemoryPlanStore();
    const times = [new Date("2026-03-04T05:06:07.000Z"), new Date("2027-01-01T00:00:00.000Z")];

    function AcceptButton() {
      const { acceptDisclaimer, hasAcceptedDisclaimer } = useDisclaimer();
      return (
        <button onClick={() => void acceptDisclaimer()}>
          {hasAcceptedDisclaimer ? "accepted" : "accept"}
        </button>
      );
    }

    render(
      <PlanProvider initialPlan={blankPlan}>
        <PersistenceProvider openStore={async () => store} clock={() => times.shift() as Date}>
          <AcceptButton />
        </PersistenceProvider>
      </PlanProvider>,
    );
    await act(async () => {});

    fireEvent.click(screen.getByRole("button", { name: "accept" }));
    await act(async () => {});
    expect(screen.getByRole("button", { name: "accepted" })).toBeInTheDocument();

    // A second press must not overwrite the stored time.
    fireEvent.click(screen.getByRole("button", { name: "accepted" }));
    await act(async () => {});

    expect(await store.getMeta("disclaimerAcceptedAt")).toBe("2026-03-04T05:06:07.000Z");
  });
});
