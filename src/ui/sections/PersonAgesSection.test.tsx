import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { PersonAgesSection } from "./PersonAgesSection";
import { blankPlan, renderSection } from "./sectionTestHelpers";

describe("PersonAgesSection", () => {
  it("shows the current and retirement ages empty, with no default, while unset", () => {
    const { container } = renderSection(<PersonAgesSection />);

    expect(screen.getByLabelText("Current age")).toHaveValue("");
    expect(screen.getByLabelText("Target retirement age")).toHaveValue("");

    // "Plan until age" and "Super accessible at" have defaults.
    expect(container.querySelectorAll(".input.default")).toHaveLength(2);
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

  it("shows the plan-until age as a dashed default of 95 with its hint", () => {
    const { container } = renderSection(<PersonAgesSection />);

    expect(screen.getByLabelText("Plan until age")).toHaveValue("95");
    expect(container.querySelector(".input.default")).not.toBeNull();
    expect(screen.getByText("The projection runs to this age.")).toBeInTheDocument();
  });

  it("stores a typed plan-until age and clears it back to the default", async () => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(<PersonAgesSection />);

    await user.type(screen.getByLabelText("Plan until age"), "90{Enter}");
    expect(readPlan().household.projectionEndAge).toBe(90);

    await user.clear(screen.getByLabelText("Plan until age"));
    await user.tab();
    expect(readPlan().household.projectionEndAge).toBeUndefined();
    expect(screen.getByLabelText("Plan until age")).toHaveValue("95");
  });

  it("rejects plan-until ages outside 50 to 110", async () => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(<PersonAgesSection />);

    await user.type(screen.getByLabelText("Plan until age"), "111{Enter}");
    expect(screen.getByText("Enter a value of at most 110.")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Plan until age"));
    await user.type(screen.getByLabelText("Plan until age"), "49{Enter}");
    expect(screen.getByText("Enter a value of at least 50.")).toBeInTheDocument();

    expect(readPlan().household.projectionEndAge).toBeUndefined();
  });

  it("shows the legislated default of 65 for 'Super accessible at', dashed, with the hint", () => {
    const { container } = renderSection(<PersonAgesSection />);

    expect(screen.getByLabelText("Super accessible at")).toHaveValue("65");
    // The dashed default style is on the input's wrapper, as for "Plan until age".
    expect(container.querySelectorAll(".input.default")).toHaveLength(2);
    expect(
      screen.getByText(
        "Usually 65. You can choose 60 to 64 if you'll have retired by then; super opens when you retire, or at 65 regardless.",
      ),
    ).toBeInTheDocument();
  });

  it("stores the access age, and clears it back to the default", async () => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(<PersonAgesSection />);

    await user.type(screen.getByLabelText("Super accessible at"), "60{Enter}");
    expect(readPlan().household.people[0]?.superAccessAge).toBe(60);

    await user.clear(screen.getByLabelText("Super accessible at"));
    await user.tab();
    expect(readPlan().household.people[0]?.superAccessAge).toBeUndefined();
    expect(screen.getByLabelText("Super accessible at")).toHaveValue("65");
  });

  it("limits the access age to the preservation age and 65, read from the rules", async () => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(<PersonAgesSection />);

    await user.type(screen.getByLabelText("Super accessible at"), "59{Enter}");
    expect(screen.getByText("Enter a value of at least 60.")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Super accessible at"));
    await user.type(screen.getByLabelText("Super accessible at"), "66{Enter}");
    expect(screen.getByText("Enter a value of at most 65.")).toBeInTheDocument();
    expect(readPlan().household.people[0]?.superAccessAge).toBeUndefined();
  });
});
