import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { blankPlan, renderSection } from "./sectionTestHelpers";
import { SalarySection } from "./SalarySection";

// Component tests for the Salary card: the person's salary and growth go into
// the plan, and clearing them removes them.
describe("SalarySection", () => {
  it("starts empty, with growth showing the default (no growth)", () => {
    renderSection(<SalarySection />);

    expect(screen.getByLabelText("Gross salary per year")).toHaveValue("");
    expect(screen.getByLabelText("Grows at")).toHaveValue("none");
    expect(screen.queryByLabelText("Grows at percentage")).not.toBeInTheDocument();
  });

  it("stores a typed salary on the person", async () => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(<SalarySection />);

    await user.type(screen.getByLabelText("Gross salary per year"), "145000{Enter}");

    expect(readPlan().household.people[0]?.salary).toEqual({ annual: 145000 });
    expect(screen.getByLabelText("Gross salary per year")).toHaveValue("$145,000");
  });

  it("stores 'Inflation + 1%' by choosing the option and typing the number", async () => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(<SalarySection />);

    await user.selectOptions(screen.getByLabelText("Grows at"), "inflationPlus");
    const percentage = screen.getByLabelText("Grows at percentage");
    await user.clear(percentage);
    await user.type(percentage, "1{Enter}");

    expect(readPlan().household.people[0]?.salary?.growth).toEqual({
      kind: "inflationPlus",
      margin: 0.01,
    });
  });

  it("stores plain inflation (a margin of 0) when Inflation is chosen", async () => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(<SalarySection />);

    await user.selectOptions(screen.getByLabelText("Grows at"), "inflation");

    expect(readPlan().household.people[0]?.salary?.growth).toEqual({
      kind: "inflationPlus",
      margin: 0,
    });
  });

  it("goes back to the default growth by choosing No growth", async () => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(<SalarySection />, {
      ...blankPlan,
      household: {
        people: [
          {
            id: "person-1",
            label: "Person 1",
            salary: { annual: 1000, growth: { kind: "fixed", rate: 0.03 } },
          },
        ],
      },
    });

    await user.selectOptions(screen.getByLabelText("Grows at"), "none");

    expect(readPlan().household.people[0]?.salary).toEqual({ annual: 1000 });
  });

  it("shows the hint about tax", () => {
    renderSection(<SalarySection />);

    expect(screen.getByText(/Before tax\. Sets your employer super contributions/)).toBeVisible();
  });

  it("prefixes labels with names when there are two people", () => {
    renderSection(<SalarySection />, {
      ...blankPlan,
      household: {
        people: [
          { id: "a", label: "Alex" },
          { id: "s", label: "Sam" },
        ],
      },
    });

    expect(screen.getByLabelText("Alex: Gross salary per year")).toBeInTheDocument();
    expect(screen.getByLabelText("Sam: Grows at")).toBeInTheDocument();
  });
});
