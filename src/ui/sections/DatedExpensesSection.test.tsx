import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { Plan } from "../../plan/types";
import { DatedExpensesSection } from "./DatedExpensesSection";
import { blankPlan, renderSection } from "./sectionTestHelpers";

// The section tests render with the clock fixed in 2026, so the first year
// with flows is 2027.

/** A plan aged 34 with the default plan-until age of 95, so the last year is 2087, and these rows. */
function planWithExpenses(datedExpenses: Plan["expenses"]["datedExpenses"]): Plan {
  return {
    ...blankPlan,
    household: { people: [{ id: "person-1", label: "Person 1", currentAge: 34 }] },
    expenses: { datedExpenses },
  };
}

const replaceCar = { id: "car", name: "Replace car", annual: 40000, fromYear: 2030, toYear: 2030 };
const schoolFees = { id: "fees", name: "School fees", annual: 20000, fromYear: 2030, toYear: 2033 };

describe("DatedExpensesSection", () => {
  it("shows an empty-state line and the hint when there are no expenses", () => {
    renderSection(<DatedExpensesSection />);

    expect(screen.getByRole("heading", { name: "Dated and one-off expenses" })).toBeInTheDocument();
    expect(screen.getByText("No dated expenses yet.")).toBeInTheDocument();
    expect(
      screen.getByText(
        "In today's dollars, grown with inflation. Paid from cash and then the portfolio in those years, even before you retire.",
      ),
    ).toBeInTheDocument();
  });

  it("shows each row's name, amount and years, with (once) for a one-off", () => {
    renderSection(<DatedExpensesSection />, planWithExpenses([replaceCar, schoolFees]));

    expect(screen.getByRole("button", { name: "Expense for Replace car" })).toHaveTextContent(
      "Replace car",
    );
    expect(screen.getByRole("button", { name: "Per year for Replace car" })).toHaveTextContent(
      "$40,000",
    );
    expect(screen.getByRole("button", { name: "From for Replace car" })).toHaveTextContent("2030");
    expect(screen.getByRole("button", { name: "To for Replace car" })).toHaveTextContent("(once)");
    expect(screen.getByRole("button", { name: "To for School fees" })).toHaveTextContent("2033");
  });

  it("adds a row starting the year after today, and opens its name for typing", async () => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(<DatedExpensesSection />);

    await user.click(screen.getByRole("button", { name: "+ Add expense" }));

    const [added] = readPlan().expenses.datedExpenses ?? [];
    expect(added).toMatchObject({ name: "", fromYear: 2027, toYear: 2027 });
    expect(added?.id).toBeTruthy();

    await user.keyboard("Boat{Enter}");
    expect(readPlan().expenses.datedExpenses?.[0]?.name).toBe("Boat");
  });

  it("edits the amount, and clearing it goes back to $0", async () => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(<DatedExpensesSection />, planWithExpenses([replaceCar]));

    await user.click(screen.getByRole("button", { name: "Per year for Replace car" }));
    await user.keyboard("35000{Enter}");
    expect(readPlan().expenses.datedExpenses?.[0]?.annual).toBe(35000);

    await user.click(screen.getByRole("button", { name: "Per year for Replace car" }));
    await user.clear(screen.getByLabelText("Amount per year for Replace car"));
    await user.keyboard("{Enter}");

    expect(readPlan().expenses.datedExpenses?.[0]?.annual).toBeUndefined();
    expect(screen.getByRole("button", { name: "Per year for Replace car" })).toHaveTextContent(
      "$0",
    );
  });

  it("keeps the amount editor open with an error for invalid text, and rejects negatives", async () => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(<DatedExpensesSection />, planWithExpenses([replaceCar]));

    await user.click(screen.getByRole("button", { name: "Per year for Replace car" }));
    await user.keyboard("abc{Enter}");

    expect(screen.getByText("Enter a number, for example 60,000.")).toBeInTheDocument();
    expect(screen.getByLabelText("Amount per year for Replace car")).toBeInTheDocument();
    expect(readPlan().expenses.datedExpenses?.[0]?.annual).toBe(40000);
  });

  it("limits the years to the year after today up to the plan-until year", async () => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(<DatedExpensesSection />, planWithExpenses([replaceCar]));

    // Age 34 in 2026 reaches 95 in 2087.
    await user.click(screen.getByRole("button", { name: "From for Replace car" }));
    await user.keyboard("2026{Enter}");
    expect(screen.getByText("Enter a value of at least 2027.")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("From year for Replace car"));
    await user.keyboard("2088{Enter}");
    expect(screen.getByText("Enter a value of at most 2087.")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("From year for Replace car"));
    await user.keyboard("2087{Enter}");

    expect(readPlan().expenses.datedExpenses?.[0]).toMatchObject({ fromYear: 2087, toYear: 2087 });
  });

  it("follows a changed plan-until age when limiting years", async () => {
    const user = userEvent.setup();
    renderSection(<DatedExpensesSection />, {
      ...planWithExpenses([replaceCar]),
      household: {
        people: [{ id: "person-1", label: "Person 1", currentAge: 34 }],
        projectionEndAge: 60,
      },
    });

    // Age 34 in 2026 reaches 60 in 2052.
    await user.click(screen.getByRole("button", { name: "To for Replace car" }));
    await user.keyboard("2053{Enter}");

    expect(screen.getByText("Enter a value of at most 2052.")).toBeInTheDocument();
  });

  it("has no upper year limit until the current age is known", async () => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(<DatedExpensesSection />, {
      ...blankPlan,
      expenses: { datedExpenses: [replaceCar] },
    });

    await user.click(screen.getByRole("button", { name: "To for Replace car" }));
    await user.keyboard("2200{Enter}");

    expect(readPlan().expenses.datedExpenses?.[0]?.toYear).toBe(2200);
  });

  it("shows a range, then (once) again, as To changes", async () => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(<DatedExpensesSection />, planWithExpenses([replaceCar]));

    await user.click(screen.getByRole("button", { name: "To for Replace car" }));
    await user.keyboard("2032{Enter}");
    expect(screen.getByRole("button", { name: "To for Replace car" })).toHaveTextContent("2032");

    // Moving From past To drags To up with it.
    await user.click(screen.getByRole("button", { name: "From for Replace car" }));
    await user.keyboard("2035{Enter}");

    expect(readPlan().expenses.datedExpenses?.[0]).toMatchObject({ fromYear: 2035, toYear: 2035 });
    expect(screen.getByRole("button", { name: "To for Replace car" })).toHaveTextContent("(once)");
  });

  it("duplicates a row, inserting the copy after it with a new id", async () => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(
      <DatedExpensesSection />,
      planWithExpenses([replaceCar, schoolFees]),
    );

    await user.click(screen.getByRole("button", { name: "Actions for Replace car" }));
    await user.click(screen.getByRole("menuitem", { name: "Duplicate" }));

    const rows = readPlan().expenses.datedExpenses ?? [];
    expect(rows.map((row) => row.name)).toEqual(["Replace car", "Replace car", "School fees"]);
    expect(rows[1]?.id).not.toBe("car");
  });

  it("deletes a row", async () => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(
      <DatedExpensesSection />,
      planWithExpenses([replaceCar, schoolFees]),
    );

    await user.click(screen.getByRole("button", { name: "Actions for Replace car" }));
    await user.click(screen.getByRole("menuitem", { name: "Delete" }));

    expect(readPlan().expenses.datedExpenses?.map((row) => row.id)).toEqual(["fees"]);
  });
});
