import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { Plan } from "../../plan/types";
import { RetirementSpendingSection } from "./RetirementSpendingSection";
import { blankPlan, renderSection } from "./sectionTestHelpers";

const percentLabel = "Share of today's living expenses";
const amountLabel = "Retirement spending per year";

/** A plan with the given living expenses and retirement spending. */
function planWith(expenses: Plan["expenses"]): Plan {
  return { ...blankPlan, expenses };
}

describe("RetirementSpendingSection", () => {
  it("starts on % of today, showing the 100% default in the dashed style", () => {
    const { container } = renderSection(<RetirementSpendingSection />);

    expect(screen.getByRole("button", { name: "% of today" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByLabelText(percentLabel)).toHaveValue("100%");
    expect(container.querySelector(".input.default")).not.toBeNull();
  });

  it("stores a typed percentage as a fraction", async () => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(<RetirementSpendingSection />);

    await user.type(screen.getByLabelText(percentLabel), "90{Enter}");

    expect(readPlan().expenses.retirementSpending).toEqual({
      kind: "percentOfToday",
      fraction: 0.9,
    });
  });

  it("restores the dashed 100% default when the percentage is cleared", async () => {
    const user = userEvent.setup();
    const { readPlan, container } = renderSection(
      <RetirementSpendingSection />,
      planWith({ retirementSpending: { kind: "percentOfToday", fraction: 0.9 } }),
    );

    await user.clear(screen.getByLabelText(percentLabel));
    await user.tab();

    expect(readPlan().expenses.retirementSpending).toBeUndefined();
    expect(screen.getByLabelText(percentLabel)).toHaveValue("100%");
    expect(container.querySelector(".input.default")).not.toBeNull();
  });

  it("rejects percentages outside 1% to 300%", async () => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(<RetirementSpendingSection />);

    await user.type(screen.getByLabelText(percentLabel), "301{Enter}");
    expect(screen.getByText("Enter a value of at most 300%.")).toBeInTheDocument();

    await user.clear(screen.getByLabelText(percentLabel));
    await user.type(screen.getByLabelText(percentLabel), "0.5{Enter}");
    expect(screen.getByText("Enter a value of at least 1%.")).toBeInTheDocument();

    expect(readPlan().expenses.retirementSpending).toBeUndefined();
  });

  it("stores a dollar amount, and rejects less than $1", async () => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(<RetirementSpendingSection />);

    await user.click(screen.getByRole("button", { name: "$ amount" }));
    await user.type(screen.getByLabelText(amountLabel), "0{Enter}");
    expect(screen.getByText("Enter a value of at least $1.")).toBeInTheDocument();

    await user.clear(screen.getByLabelText(amountLabel));
    await user.type(screen.getByLabelText(amountLabel), "54000{Enter}");

    expect(readPlan().expenses.retirementSpending).toEqual({ kind: "amount", annual: 54000 });
    expect(screen.getByLabelText(amountLabel)).toHaveValue("$54,000");
  });

  it("converts 90% of $60,000 to $54,000 when switched to $ amount", async () => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(
      <RetirementSpendingSection />,
      planWith({
        livingAnnual: 60000,
        retirementSpending: { kind: "percentOfToday", fraction: 0.9 },
      }),
    );

    await user.click(screen.getByRole("button", { name: "$ amount" }));

    expect(readPlan().expenses.retirementSpending).toEqual({ kind: "amount", annual: 54000 });
    expect(screen.getByLabelText(amountLabel)).toHaveValue("$54,000");
  });

  it("converts $54,000 of $60,000 back to 90% when switched to % of today", async () => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(
      <RetirementSpendingSection />,
      planWith({ livingAnnual: 60000, retirementSpending: { kind: "amount", annual: 54000 } }),
    );

    await user.click(screen.getByRole("button", { name: "% of today" }));

    expect(readPlan().expenses.retirementSpending).toEqual({
      kind: "percentOfToday",
      fraction: 0.9,
    });
    expect(screen.getByLabelText(percentLabel)).toHaveValue("90%");
  });

  it("converts the unset 100% default to the full living expenses", async () => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(
      <RetirementSpendingSection />,
      planWith({ livingAnnual: 64000 }),
    );

    await user.click(screen.getByRole("button", { name: "$ amount" }));

    expect(readPlan().expenses.retirementSpending).toEqual({ kind: "amount", annual: 64000 });
  });

  it("clears the value when switching without living expenses to convert against", async () => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(
      <RetirementSpendingSection />,
      planWith({ retirementSpending: { kind: "percentOfToday", fraction: 0.9 } }),
    );

    await user.click(screen.getByRole("button", { name: "$ amount" }));

    expect(readPlan().expenses.retirementSpending).toBeUndefined();
    expect(screen.getByRole("button", { name: "$ amount" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByLabelText(amountLabel)).toHaveValue("");
  });

  it("stays on $ amount after the amount is cleared", async () => {
    const user = userEvent.setup();
    renderSection(
      <RetirementSpendingSection />,
      planWith({ retirementSpending: { kind: "amount", annual: 54000 } }),
    );

    await user.clear(screen.getByLabelText(amountLabel));
    await user.tab();

    expect(screen.getByRole("button", { name: "$ amount" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByLabelText(amountLabel)).toHaveValue("");
  });
});
