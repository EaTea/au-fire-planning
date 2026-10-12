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

  it("shows the $0 default and the hint explaining it, for a couple", () => {
    renderSection(<InterimSpendingSection />, couplePlan);

    const field = screen.getByLabelText("Drawn from savings while one of you is retired");

    expect(field).toHaveValue("$0");
    expect(field.closest(".input")).toHaveClass("default");
    expect(screen.getByText(/the partner still working covers spending/)).toBeInTheDocument();
    expect(screen.getByText(/until tax and take-home pay arrive/)).toBeInTheDocument();
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
