import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { LivingExpensesSection } from "./LivingExpensesSection";
import { blankPlan, renderSection } from "./sectionTestHelpers";

describe("LivingExpensesSection", () => {
  it("starts empty, with no default", () => {
    renderSection(<LivingExpensesSection />);

    expect(screen.getByLabelText("Per year, after tax")).toHaveValue("");
  });

  it("stores a typed amount in the plan and shows it formatted", async () => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(<LivingExpensesSection />);

    await user.type(screen.getByLabelText("Per year, after tax"), "64000{Enter}");

    expect(readPlan().expenses.livingAnnual).toBe(64000);
    expect(screen.getByLabelText("Per year, after tax")).toHaveValue("$64,000");
  });

  it("clears the plan value when the field is emptied", async () => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(<LivingExpensesSection />, {
      ...blankPlan,
      expenses: { livingAnnual: 64000 },
    });

    await user.clear(screen.getByLabelText("Per year, after tax"));
    await user.tab();

    expect(readPlan().expenses.livingAnnual).toBeUndefined();
    expect(screen.getByLabelText("Per year, after tax")).toHaveValue("");
  });

  it("rejects an amount below $1", async () => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(<LivingExpensesSection />);

    await user.type(screen.getByLabelText("Per year, after tax"), "0{Enter}");

    expect(screen.getByText("Enter a value of at least $1.")).toBeInTheDocument();
    expect(readPlan().expenses.livingAnnual).toBeUndefined();
  });
});
