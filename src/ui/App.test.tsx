import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { InMemoryPlanStore } from "../persistence/planStore";
import { App } from "./App";

/**
 * Renders the app on an in-memory store (jsdom has no IndexedDB) and waits
 * for the saved plan to finish loading and the route to settle, so tests
 * start from the real screens. The store is a returning visitor's (disclaimer
 * already accepted) unless `store` says otherwise.
 */
async function renderApp(store?: InMemoryPlanStore) {
  const storeToUse = store ?? (await storeWithAcceptedDisclaimer());
  render(<App openStore={async () => storeToUse} />);
  // Wait for a page heading, not just the header: redirects (e.g. `#/` to the first step) land after it.
  await screen.findByRole("heading", { level: 1 });
}

/** An in-memory store where the welcome page has already been accepted. */
async function storeWithAcceptedDisclaimer(): Promise<InMemoryPlanStore> {
  const store = new InMemoryPlanStore();
  await store.setMeta("disclaimerAcceptedAt", "2026-01-01T00:00:00.000Z");
  return store;
}

// Component tests for the top-level App: header, routing and Back/Next. The
// hash router reads window.location, so each test sets the hash first.
describe("App", () => {
  beforeEach(() => {
    window.location.hash = "";
  });

  // Smoke test: proves the toolchain works and the header shows the app title.
  it("shows the AU FIRE Planner logo in the header", async () => {
    await renderApp();

    expect(screen.getByText("AU FIRE Planner")).toBeInTheDocument();
  });

  // Unknown routes redirect to the first step.
  it("lands on the Household page for an unknown route", async () => {
    window.location.hash = "#/no-such-page";

    await renderApp();

    expect(screen.getByRole("heading", { level: 1, name: "Household" })).toBeInTheDocument();
    expect(screen.getByLabelText("Current age")).toBeInTheDocument();
  });

  // Next moves along the journey.
  it("moves to Income & expenses when Next is clicked", async () => {
    const user = userEvent.setup();
    await renderApp();

    await user.click(screen.getByRole("link", { name: "Next: Income & expenses →" }));

    expect(
      screen.getByRole("heading", { level: 1, name: "Income & expenses" }),
    ).toBeInTheDocument();
  });

  // Values entered on one step are still there after visiting another.
  it("keeps entered values when moving between steps", async () => {
    const user = userEvent.setup();
    window.location.hash = "#/income-expenses";
    await renderApp();

    await user.type(screen.getByLabelText("Per year, after tax"), "64000{Enter}");
    await user.click(screen.getByRole("link", { name: "Next: Assets →" }));
    await user.type(screen.getByLabelText("Current value"), "720000{Enter}");
    await user.click(screen.getByRole("link", { name: "Next: Assumptions →" }));
    await user.type(screen.getByLabelText("Safe withdrawal rate"), "3.5{Enter}");

    await user.click(screen.getByRole("link", { name: "← Assets" }));
    expect(screen.getByLabelText("Current value")).toHaveValue("$720,000");
    await user.click(screen.getByRole("link", { name: "← Income & expenses" }));
    expect(screen.getByLabelText("Per year, after tax")).toHaveValue("$64,000");
  });

  // First run: any URL ends on the welcome page, and the requested page never renders.
  it("shows the welcome page and disclaimer on a first visit, whatever URL was opened", async () => {
    window.location.hash = "#/results";

    await renderApp(new InMemoryPlanStore());

    expect(screen.getByRole("heading", { level: 1, name: /Welcome/ })).toBeInTheDocument();
    expect(
      screen.getByText(/It isn.t personal financial, tax or legal advice/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1, name: "Results" })).not.toBeInTheDocument();
    expect(window.location.hash).toBe("#/welcome");
  });

  // Start planning stores the acceptance time and moves on.
  it("stores disclaimerAcceptedAt and opens Household when Start planning is pressed", async () => {
    const user = userEvent.setup();
    const store = new InMemoryPlanStore();
    await renderApp(store);

    await user.click(screen.getByRole("button", { name: "Start planning" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Household" })).toBeInTheDocument();
    expect(await store.getMeta("disclaimerAcceptedAt")).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  // After accepting, the welcome page is not forced again.
  it("does not redirect a returning visitor to the welcome page", async () => {
    window.location.hash = "#/results";

    await renderApp();

    expect(screen.getByRole("heading", { level: 1, name: "Results" })).toBeInTheDocument();
  });

  // Every page carries the one-line reminder.
  it("shows the footer line on every page", async () => {
    await renderApp();

    expect(
      screen.getByText(
        "General information only, not financial advice. Your data stays on this device.",
      ),
    ).toBeInTheDocument();
  });

  // The step navigation is hidden on the welcome page so the disclaimer can't be skipped.
  it("hides the Steps navigation on the welcome page but not on a step page", async () => {
    await renderApp(new InMemoryPlanStore());
    expect(screen.queryByRole("navigation", { name: "Steps" })).not.toBeInTheDocument();
    expect(screen.getByText("AU FIRE Planner")).toBeInTheDocument();

    cleanup();
    window.location.hash = "#/results";
    await renderApp();
    expect(screen.getByRole("navigation", { name: "Steps" })).toBeInTheDocument();
  });
});
