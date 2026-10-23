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

// Couples (M7 step 6): a card for each person, then the planning horizon.
describe("PersonAgesSection for a couple", () => {
  const couple = {
    ...blankPlan,
    household: {
      people: [
        {
          id: "person-1",
          label: "Person 1",
          name: "Alex",
          currentAge: 34,
          targetRetirementAge: 50,
        },
        { id: "person-2", label: "Person 2", currentAge: 32, targetRetirementAge: 52 },
      ],
    },
  };

  it("shows a card for each person, titled by name or Person N, and the planning horizon", () => {
    renderSection(<PersonAgesSection />, couple);

    expect(screen.getByRole("heading", { name: "Alex" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Person 2" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Planning horizon" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "About you" })).not.toBeInTheDocument();
  });

  it("labels each person's fields with their name, so every label is unique", () => {
    renderSection(<PersonAgesSection />, couple);

    expect(screen.getByLabelText("Alex: Current age")).toHaveValue("34");
    expect(screen.getByLabelText("Person 2: Current age")).toHaveValue("32");
    expect(screen.getByLabelText("Alex: Target retirement age")).toHaveValue("50");
    expect(screen.getByLabelText("Person 2: Super accessible at")).toBeInTheDocument();
    expect(screen.getByLabelText("Person 1: Name (optional)")).toHaveValue("Alex");
    expect(screen.getByLabelText("Person 2: Name (optional)")).toHaveValue("");
    // The plan-until age is one field for the household.
    expect(screen.getAllByLabelText("Plan until age")).toHaveLength(1);
  });

  it("stores each person's ages on that person", async () => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(<PersonAgesSection />, couple);

    await user.clear(screen.getByLabelText("Person 2: Current age"));
    await user.type(screen.getByLabelText("Person 2: Current age"), "30{Enter}");
    await user.type(screen.getByLabelText("Alex: Super accessible at"), "62{Enter}");

    expect(readPlan().household.people[1]?.currentAge).toBe(30);
    expect(readPlan().household.people[0]?.superAccessAge).toBe(62);
    expect(readPlan().household.people[0]?.currentAge).toBe(34);
  });

  it("saves a name trimmed, and clears it when emptied", async () => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(<PersonAgesSection />, couple);

    await user.type(screen.getByLabelText("Person 2: Name (optional)"), "  Sam {Enter}");
    expect(readPlan().household.people[1]?.name).toBe("Sam");
    // The card and the labels now use the name.
    expect(screen.getByRole("heading", { name: "Sam" })).toBeInTheDocument();
    expect(screen.getByLabelText("Sam: Current age")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Person 2: Name (optional)"));
    await user.tab();
    expect(readPlan().household.people[1]?.name).toBeUndefined();
  });

  // The younger person is Person 2 (32): 95 − 32 = 63 years, to 2026 + 63 = 2089.
  it("says the plan runs until the younger person reaches the plan-until age", () => {
    renderSection(<PersonAgesSection />, {
      ...couple,
      household: {
        people: [couple.household.people[0]!, { ...couple.household.people[1]!, name: "Sam" }],
      },
    });

    expect(
      screen.getByText("The plan runs until Sam reaches this age: 63 years, to 2089."),
    ).toBeInTheDocument();
  });

  it("follows the plan-until age, and leaves the note out until someone has an age", async () => {
    const user = userEvent.setup();
    renderSection(<PersonAgesSection />, couple);

    await user.type(screen.getByLabelText("Plan until age"), "90{Enter}");
    expect(
      screen.getByText("The plan runs until Person 2 reaches this age: 58 years, to 2084."),
    ).toBeInTheDocument();

    renderSection(<PersonAgesSection />, {
      ...couple,
      household: {
        people: [
          { id: "person-1", label: "Person 1" },
          { id: "person-2", label: "Person 2" },
        ],
      },
    });
    expect(screen.getAllByText(/The plan runs until/)).toHaveLength(1);
  });
});

describe("PersonAgesSection for one person", () => {
  it("adds only the Name field to the card, and stores it trimmed", async () => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(<PersonAgesSection />);

    expect(screen.getByRole("heading", { name: "About you" })).toBeInTheDocument();
    expect(screen.queryByText(/The plan runs until/)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Name (optional)"), " Alex {Enter}");

    expect(readPlan().household.people[0]?.name).toBe("Alex");
  });
});

describe("PersonAgesSection names", () => {
  it("limits a name to 40 characters, for one person and for a couple", () => {
    const { unmount } = renderSection(<PersonAgesSection />);
    expect(screen.getByLabelText("Name (optional)")).toHaveAttribute("maxLength", "40");
    unmount();

    renderSection(<PersonAgesSection />, {
      ...blankPlan,
      household: {
        people: [
          { id: "person-1", label: "Person 1" },
          { id: "person-2", label: "Person 2" },
        ],
      },
    });
    expect(screen.getByLabelText("Person 2: Name (optional)")).toHaveAttribute("maxLength", "40");
  });

  it("labels two people of the same name by position so every label stays unique", () => {
    renderSection(<PersonAgesSection />, {
      ...blankPlan,
      household: {
        people: [
          { id: "person-1", label: "Person 1", name: "Alex" },
          { id: "person-2", label: "Person 2", name: " alex" },
        ],
      },
    });

    expect(screen.getByLabelText("Alex (Person 1): Current age")).toBeInTheDocument();
    expect(screen.getByLabelText("alex (Person 2): Current age")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Alex (Person 1)" })).toBeInTheDocument();
  });
});
