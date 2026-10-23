import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { Plan } from "../../plan/types";
import { InterimSpendingSection } from "./InterimSpendingSection";
import { blankPlan, renderSection } from "./sectionTestHelpers";

const couplePlan: Plan = {
  ...blankPlan,
  household: {
    people: [
      { id: "person-1", label: "Person 1", name: "Alex" },
      { id: "person-2", label: "Person 2", name: "Sam" },
    ],
  },
};

describe("InterimSpendingSection", () => {
  it("shows nothing for one person", () => {
    const { container } = renderSection(<InterimSpendingSection />);

    expect(container.querySelector(".card")).toBeNull();
  });

  const field = () => screen.getByLabelText("Drawn from savings while one of you is retired");

  // Alex retires in 10 years and Sam in 20, so Sam is the one still working in between.
  const staggeredPlan: Plan = {
    ...couplePlan,
    household: {
      people: [
        {
          id: "person-1",
          label: "Person 1",
          name: "Alex",
          currentAge: 50,
          targetRetirementAge: 60,
        },
        { id: "person-2", label: "Person 2", name: "Sam", currentAge: 40, targetRetirementAge: 60 },
      ],
    },
    expenses: { livingAnnual: 50000, retirementSpending: { kind: "amount", annual: 40000 } },
  };

  it("shows $0 and the hint explaining both defaults, when the later partner has a salary", () => {
    const withSalary: Plan = {
      ...staggeredPlan,
      household: {
        people: [
          staggeredPlan.household.people[0]!,
          { ...staggeredPlan.household.people[1]!, salary: { annual: 90000 } },
        ],
      },
    };
    renderSection(<InterimSpendingSection />, withSalary);

    expect(field()).toHaveValue("$0");
    expect(field().closest(".input")).toHaveClass("default");
    expect(screen.getByText(/the partner still working has a salary/)).toBeInTheDocument();
    expect(screen.getByText(/until tax and take-home pay arrive/)).toBeInTheDocument();
    expect(
      screen.getByText(/If they have no salary, the default is the same as retirement spending/),
    ).toBeInTheDocument();
  });

  it("shows the retirement spending as the default when the later partner has no salary", () => {
    renderSection(<InterimSpendingSection />, staggeredPlan);

    expect(field()).toHaveValue(
      "$40,000, the same as retirement spending, because Sam has no salary",
    );
    expect(field().closest(".input")).toHaveClass("default");
  });

  it("shows $0 when both retire in the same year, whatever the salaries", () => {
    renderSection(<InterimSpendingSection />, couplePlan);

    expect(field()).toHaveValue("$0");
  });

  it("stores a typed amount, and clears it back to the default", async () => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(<InterimSpendingSection />, couplePlan);

    await user.type(
      screen.getByLabelText("Drawn from savings while one of you is retired"),
      "20000{Enter}",
    );
    expect(readPlan().expenses.interimAnnual).toBe(20000);

    await user.clear(screen.getByLabelText("Drawn from savings while one of you is retired"));
    await user.tab();
    expect(readPlan().expenses.interimAnnual).toBeUndefined();
  });

  it("rejects a negative amount", async () => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(<InterimSpendingSection />, couplePlan);

    await user.type(
      screen.getByLabelText("Drawn from savings while one of you is retired"),
      "-5{Enter}",
    );

    expect(readPlan().expenses.interimAnnual).toBeUndefined();
  });
});
