import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { Plan } from "../../plan/types";
import { DollarsModeProvider, DollarsModeToggle } from "../dollarsMode";
import { blankPlan, renderSection } from "./sectionTestHelpers";
import { SalarySection } from "./SalarySection";

// Component tests for the Salary card: the person's salary and growth go into
// the plan, and clearing them removes them.
describe("SalarySection", () => {
  it("starts empty, with growth showing the default (no growth)", () => {
    renderSection(<SalarySection />);

    expect(screen.getByLabelText("Gross salary per year")).toHaveValue("");
    expect(screen.getByLabelText("Grows at")).toHaveValue("none");
    expect(screen.queryByLabelText("Above inflation by")).not.toBeInTheDocument();
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
    const percentage = screen.getByLabelText("Above inflation by");
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

  describe("estimated tax and take-home pay", () => {
    /** One person on a given salary, with the clock fixed in 2026 by renderSection. */
    function planWithSalary(annual: number): Plan {
      return {
        ...blankPlan,
        household: { people: [{ id: "person-1", label: "Person 1", salary: { annual } }] },
      };
    }

    it("shows nothing while there is no salary above $0", () => {
      renderSection(<SalarySection />);
      expect(screen.queryByText(/Estimated tax/)).not.toBeInTheDocument();

      cleanup();
      renderSection(<SalarySection />, planWithSalary(0));
      expect(screen.queryByText(/Estimated tax/)).not.toBeInTheDocument();
    });

    // Worked example T3: $100,000 in 2026 is $20,788 of tax and $2,000 of Medicare levy.
    it("shows $22,788 of tax and $77,212 take-home on $100,000", () => {
      renderSection(<SalarySection />, planWithSalary(100000));

      expect(
        screen.getByText("Estimated tax $22,788 · take-home $77,212 a year"),
      ).toBeInTheDocument();
    });

    it("updates as the salary is typed", async () => {
      const user = userEvent.setup();
      renderSection(<SalarySection />);

      await user.type(screen.getByLabelText("Gross salary per year"), "100000{Enter}");

      expect(screen.getByText(/Estimated tax \$22,788/)).toBeInTheDocument();
    });

    it("opens the working: brackets, the offset and the levy", async () => {
      const user = userEvent.setup();
      renderSection(<SalarySection />, planWithSalary(100000));

      expect(screen.queryByText("Tax payable")).not.toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "How is this calculated?" }));

      expect(screen.getByText("Tax on income from $18,200 to $45,000 at 16%")).toBeInTheDocument();
      expect(screen.getByText("Low income tax offset")).toBeInTheDocument();
      expect(screen.getByText(/Medicare levy/)).toBeInTheDocument();
      expect(screen.getByText("Tax payable")).toBeInTheDocument();
    });

    it("ignores the dollars toggle, since it is today's salary", async () => {
      const user = userEvent.setup();
      renderSection(
        <DollarsModeProvider>
          <DollarsModeToggle />
          <SalarySection />
        </DollarsModeProvider>,
        planWithSalary(100000),
      );

      await user.click(screen.getByRole("button", { name: "Today's dollars" }));
      expect(
        screen.getByText("Estimated tax $22,788 · take-home $77,212 a year"),
      ).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Nominal" }));
      expect(
        screen.getByText("Estimated tax $22,788 · take-home $77,212 a year"),
      ).toBeInTheDocument();
    });

    it("names the rules year and what is left out, under each estimate", () => {
      renderSection(<SalarySection />, planWithSalary(100000));

      expect(
        screen.getByText(
          "On today's salary at 2025–26 rates, before salary sacrifice and interest.",
        ),
      ).toBeInTheDocument();
    });

    it("gives each person in a couple the caption too", () => {
      renderSection(<SalarySection />, {
        ...blankPlan,
        household: {
          people: [
            { id: "a", label: "Person 1", name: "Alex", salary: { annual: 100000 } },
            { id: "s", label: "Person 2", name: "Sam", salary: { annual: 40000 } },
          ],
        },
      });

      expect(screen.getAllByText(/^On today's salary at 2025–26 rates/)).toHaveLength(2);
    });

    it("flips the working's aria-expanded when its button is clicked", async () => {
      const user = userEvent.setup();
      renderSection(<SalarySection />, planWithSalary(100000));

      const toggle = screen.getByRole("button", { name: "How is this calculated?" });
      expect(toggle).toHaveAttribute("aria-expanded", "false");

      await user.click(toggle);
      expect(toggle).toHaveAttribute("aria-expanded", "true");

      await user.click(toggle);
      expect(toggle).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByText("Tax payable")).not.toBeInTheDocument();
    });

    it("shows one estimate for each person, with names, when there are two", () => {
      renderSection(<SalarySection />, {
        ...blankPlan,
        household: {
          people: [
            { id: "a", label: "Person 1", name: "Alex", salary: { annual: 100000 } },
            { id: "s", label: "Person 2", name: "Sam", salary: { annual: 40000 } },
          ],
        },
      });

      expect(
        screen.getByText("Alex: Estimated tax $22,788 · take-home $77,212 a year"),
      ).toBeInTheDocument();
      // Sam: $3,488 less a $575 offset, plus $800 levy.
      expect(
        screen.getByText("Sam: Estimated tax $3,713 · take-home $36,287 a year"),
      ).toBeInTheDocument();
    });

    it("shows an estimate only for the person who has a salary", () => {
      renderSection(<SalarySection />, {
        ...blankPlan,
        household: {
          people: [
            { id: "a", label: "Person 1", name: "Alex", salary: { annual: 100000 } },
            { id: "s", label: "Person 2", name: "Sam" },
          ],
        },
      });

      expect(screen.getByText(/^Alex: Estimated tax/)).toBeInTheDocument();
      expect(screen.queryByText(/^Sam: Estimated tax/)).not.toBeInTheDocument();
    });
  });

  it("prefixes labels with names when there are two people", () => {
    renderSection(<SalarySection />, {
      ...blankPlan,
      household: {
        people: [
          { id: "a", label: "Person 1", name: "Alex" },
          { id: "s", label: "Person 2", name: "Sam" },
        ],
      },
    });

    expect(screen.getByLabelText("Alex: Gross salary per year")).toBeInTheDocument();
    expect(screen.getByLabelText("Sam: Grows at")).toBeInTheDocument();
  });
});

// With no growth a salary stays the same dollars; the hint says so.
describe("SalarySection growth hint", () => {
  it("says no growth keeps the same dollars every year", () => {
    renderSection(<SalarySection />);

    expect(screen.getByText("No growth keeps the same dollars every year.")).toBeVisible();
  });
});
