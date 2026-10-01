import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { PersonAgesSection } from "./PersonAgesSection";
import { blankPlan, renderSection } from "./sectionTestHelpers";

describe("PersonAgesSection", () => {
  it("shows both ages empty, with no default, while unset", () => {
    const { container } = renderSection(<PersonAgesSection />);

    expect(screen.getByLabelText("Current age")).toHaveValue("");
    expect(screen.getByLabelText("Target retirement age")).toHaveValue("");
    expect(container.querySelector(".input.default")).toBeNull();
    expect(
      screen.getByText("Only your age is stored, not your date of birth."),
    ).toBeInTheDocument();
  });

  it("stores typed ages on the person", async () => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(<PersonAgesSection />);

    await user.type(screen.getByLabelText("Current age"), "34{Enter}");
    await user.type(screen.getByLabelText("Target retirement age"), "50{Enter}");

    expect(readPlan().household.people[0]?.currentAge).toBe(34);
    expect(readPlan().household.people[0]?.targetRetirementAge).toBe(50);
  });

  it("clears an age back to unset", async () => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(<PersonAgesSection />, {
      ...blankPlan,
      household: {
        people: [{ id: "person-1", label: "Person 1", currentAge: 34, targetRetirementAge: 50 }],
      },
    });

    await user.clear(screen.getByLabelText("Current age"));
    await user.tab();
    await user.clear(screen.getByLabelText("Target retirement age"));
    await user.tab();

    expect(readPlan().household.people[0]?.currentAge).toBeUndefined();
    expect(readPlan().household.people[0]?.targetRetirementAge).toBeUndefined();
  });

  it("rejects current ages outside 15 to 99", async () => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(<PersonAgesSection />);

    await user.type(screen.getByLabelText("Current age"), "100{Enter}");
    expect(screen.getByText("Enter a value of at most 99.")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Current age"));
    await user.type(screen.getByLabelText("Current age"), "14{Enter}");
    expect(screen.getByText("Enter a value of at least 15.")).toBeInTheDocument();

    expect(readPlan().household.people[0]?.currentAge).toBeUndefined();
  });

  it("rejects target retirement ages outside 18 to 100", async () => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(<PersonAgesSection />);

    await user.type(screen.getByLabelText("Target retirement age"), "101{Enter}");
    expect(screen.getByText("Enter a value of at most 100.")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Target retirement age"));
    await user.type(screen.getByLabelText("Target retirement age"), "17{Enter}");
    expect(screen.getByText("Enter a value of at least 18.")).toBeInTheDocument();

    expect(readPlan().household.people[0]?.targetRetirementAge).toBeUndefined();
  });
});
