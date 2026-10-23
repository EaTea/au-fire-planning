import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { HouseholdSection } from "./HouseholdSection";
import { blankPlan, renderSection } from "./sectionTestHelpers";

// Component tests for the "Just me / A couple" card.
describe("HouseholdSection", () => {
  it("shows Just me selected for one person, with the hint about adding a second", () => {
    renderSection(<HouseholdSection />);

    expect(screen.getByRole("button", { name: "Just me" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "A couple" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(
      screen.getByText("A couple adds a second person with their own salary and super."),
    ).toBeInTheDocument();
  });

  // The new partner's id comes from the injected generator.
  it("adds Person 2 with the generated id when A couple is chosen", async () => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(<HouseholdSection />, blankPlan, () => "partner-id");

    await user.click(screen.getByRole("button", { name: "A couple" }));

    expect(readPlan().household.people).toEqual([
      { id: "person-1", label: "Person 1" },
      { id: "partner-id", label: "Person 2" },
    ]);
    expect(screen.getByRole("button", { name: "A couple" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("says that Just me removes Person 2 and their data, and does so", async () => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(<HouseholdSection />, {
      ...blankPlan,
      household: {
        people: [
          { id: "person-1", label: "Person 1" },
          { id: "person-2", label: "Person 2", currentAge: 50, salary: { annual: 90000 } },
        ],
      },
      portfolios: [
        {
          id: "portfolio-1",
          name: "Share portfolio",
          ownership: { kind: "sole", personId: "person-2" },
        },
      ],
    });

    expect(
      screen.getByText(/removes Person 2 and everything entered for them/),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Just me" }));

    expect(readPlan().household.people).toEqual([{ id: "person-1", label: "Person 1" }]);
    // The portfolio Person 2 owned goes back to Person 1.
    expect(readPlan().portfolios[0]?.ownership).toEqual({ kind: "sole", personId: "person-1" });
  });

  it("names the partner by their name in the Just me hint", () => {
    renderSection(<HouseholdSection />, {
      ...blankPlan,
      household: {
        people: [
          { id: "person-1", label: "Person 1" },
          { id: "person-2", label: "Person 2", name: "Sam" },
        ],
      },
    });

    expect(screen.getByText(/removes Sam and everything entered for them/)).toBeInTheDocument();
  });

  it("does nothing when the chosen option is already selected", async () => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(<HouseholdSection />);

    await user.click(screen.getByRole("button", { name: "Just me" }));

    expect(readPlan()).toEqual(blankPlan);
  });
});
