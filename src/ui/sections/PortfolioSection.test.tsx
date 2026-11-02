import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { PortfolioSection } from "./PortfolioSection";
import type { Plan } from "../../plan/types";
import { blankPlan, renderSection } from "./sectionTestHelpers";

/** The styled box around the "Current value" input, which carries the "default" class. */
function currentValueInput(): HTMLElement | null {
  return screen.getByLabelText("Current value").closest(".input");
}

describe("PortfolioSection", () => {
  it("shows the $0 default in the dashed style while the value is unset", () => {
    renderSection(<PortfolioSection />);

    expect(screen.getByLabelText("Current value")).toHaveValue("$0");
    expect(currentValueInput()).toHaveClass("default");
  });

  it("stores a typed value in the plan and shows it formatted", async () => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(<PortfolioSection />);

    await user.type(screen.getByLabelText("Current value"), "720000{Enter}");

    expect(readPlan().portfolios[0]?.value).toBe(720000);
    expect(screen.getByLabelText("Current value")).toHaveValue("$720,000");
    expect(currentValueInput()).not.toHaveClass("default");
  });

  it("restores the dashed default when the value is cleared", async () => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(<PortfolioSection />, {
      ...blankPlan,
      portfolios: [{ id: "portfolio-1", name: "Share portfolio", value: 720000 }],
    });

    await user.clear(screen.getByLabelText("Current value"));
    await user.tab();

    expect(readPlan().portfolios[0]?.value).toBeUndefined();
    expect(screen.getByLabelText("Current value")).toHaveValue("$0");
    expect(currentValueInput()).toHaveClass("default");
  });

  it("renames the portfolio", async () => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(<PortfolioSection />);

    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "ETFs{Enter}");

    expect(readPlan().portfolios[0]?.name).toBe("ETFs");
  });

  describe("expected return", () => {
    it("shows the 7% default in the dashed style while unset", () => {
      renderSection(<PortfolioSection />);

      expect(screen.getByLabelText("Expected return per year")).toHaveValue("7%");
      expect(screen.getByLabelText("Expected return per year").closest(".input")).toHaveClass(
        "default",
      );
    });

    it("stores a typed percentage as a fraction", async () => {
      const user = userEvent.setup();
      const { readPlan } = renderSection(<PortfolioSection />);

      await user.type(screen.getByLabelText("Expected return per year"), "6.5{Enter}");

      expect(readPlan().portfolios[0]?.expectedReturn).toBe(0.065);
    });

    it("restores the default when cleared", async () => {
      const user = userEvent.setup();
      const { readPlan } = renderSection(<PortfolioSection />, {
        ...blankPlan,
        portfolios: [{ id: "portfolio-1", name: "Share portfolio", expectedReturn: 0.05 }],
      });

      await user.clear(screen.getByLabelText("Expected return per year"));
      await user.tab();

      expect(readPlan().portfolios[0]?.expectedReturn).toBeUndefined();
      expect(screen.getByLabelText("Expected return per year")).toHaveValue("7%");
    });

    it("rejects returns above 15%", async () => {
      const user = userEvent.setup();
      const { readPlan } = renderSection(<PortfolioSection />);

      await user.type(screen.getByLabelText("Expected return per year"), "16{Enter}");

      expect(screen.getByText("Enter a value of at most 15%.")).toBeInTheDocument();
      expect(readPlan().portfolios[0]?.expectedReturn).toBeUndefined();
    });
  });

  describe("contributions per year", () => {
    it("shows the $0 default in the dashed style while unset", () => {
      renderSection(<PortfolioSection />);

      expect(screen.getByLabelText("Contributions per year")).toHaveValue("$0");
      expect(screen.getByLabelText("Contributions per year").closest(".input")).toHaveClass(
        "default",
      );
    });

    it("stores a typed amount", async () => {
      const user = userEvent.setup();
      const { readPlan } = renderSection(<PortfolioSection />);

      await user.type(screen.getByLabelText("Contributions per year"), "30000{Enter}");

      expect(readPlan().portfolios[0]?.annualContribution).toBe(30000);
      expect(screen.getByLabelText("Contributions per year")).toHaveValue("$30,000");
    });

    it("restores the default when cleared", async () => {
      const user = userEvent.setup();
      const { readPlan } = renderSection(<PortfolioSection />, {
        ...blankPlan,
        portfolios: [{ id: "portfolio-1", name: "Share portfolio", annualContribution: 30000 }],
      });

      await user.clear(screen.getByLabelText("Contributions per year"));
      await user.tab();

      expect(readPlan().portfolios[0]?.annualContribution).toBeUndefined();
      expect(screen.getByLabelText("Contributions per year")).toHaveValue("$0");
    });

    it("rejects negative amounts", async () => {
      const user = userEvent.setup();
      const { readPlan } = renderSection(<PortfolioSection />);

      await user.type(screen.getByLabelText("Contributions per year"), "-5{Enter}");

      expect(screen.getByText(/Enter a/)).toBeInTheDocument();
      expect(readPlan().portfolios[0]?.annualContribution).toBeUndefined();
    });
  });

  describe("contributions stop at age", () => {
    const planWithRetirementAge: Plan = {
      ...blankPlan,
      household: { people: [{ id: "person-1", label: "Person 1", targetRetirementAge: 50 }] },
    };

    it("defaults to the target retirement age, shown dashed", () => {
      renderSection(<PortfolioSection />, planWithRetirementAge);

      expect(screen.getByLabelText("Contributions stop at age")).toHaveValue("50");
      expect(screen.getByLabelText("Contributions stop at age").closest(".input")).toHaveClass(
        "default",
      );
    });

    it("shows no default while the target retirement age isn't set", () => {
      renderSection(<PortfolioSection />);

      expect(screen.getByLabelText("Contributions stop at age")).toHaveValue("");
      expect(screen.getByLabelText("Contributions stop at age").closest(".input")).not.toHaveClass(
        "default",
      );
    });

    it("stores a typed age", async () => {
      const user = userEvent.setup();
      const { readPlan } = renderSection(<PortfolioSection />, planWithRetirementAge);

      await user.type(screen.getByLabelText("Contributions stop at age"), "45{Enter}");

      expect(readPlan().portfolios[0]?.contributionsStopAge).toBe(45);
    });

    it("goes back to the default when cleared", async () => {
      const user = userEvent.setup();
      const { readPlan } = renderSection(<PortfolioSection />, {
        ...planWithRetirementAge,
        portfolios: [{ id: "portfolio-1", name: "Share portfolio", contributionsStopAge: 45 }],
      });

      await user.clear(screen.getByLabelText("Contributions stop at age"));
      await user.tab();

      expect(readPlan().portfolios[0]?.contributionsStopAge).toBeUndefined();
      expect(screen.getByLabelText("Contributions stop at age")).toHaveValue("50");
    });

    it("rejects ages outside 15 to 100", async () => {
      const user = userEvent.setup();
      const { readPlan } = renderSection(<PortfolioSection />);

      await user.type(screen.getByLabelText("Contributions stop at age"), "101{Enter}");
      expect(screen.getByText("Enter a value of at most 100.")).toBeInTheDocument();

      await user.clear(screen.getByLabelText("Contributions stop at age"));
      await user.type(screen.getByLabelText("Contributions stop at age"), "14{Enter}");
      expect(screen.getByText("Enter a value of at least 15.")).toBeInTheDocument();

      expect(readPlan().portfolios[0]?.contributionsStopAge).toBeUndefined();
    });
  });
});

// Couples (M7 step 7): who owns the portfolio, and whose age the contributions stop at.
describe("PortfolioSection for a couple", () => {
  const couple: Plan = {
    ...blankPlan,
    household: {
      people: [
        { id: "person-1", label: "Person 1", name: "Alex", targetRetirementAge: 50 },
        { id: "person-2", label: "Person 2", name: "Sam", targetRetirementAge: 55 },
      ],
    },
  };

  it("shows no ownership field for one person, and the stop age as it always was", () => {
    renderSection(<PortfolioSection />);

    expect(screen.queryByRole("button", { name: "Joint" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Contributions stop at age")).toBeInTheDocument();
  });

  it("shows the owner toggle at joint by default, and stores the choice", async () => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(<PortfolioSection />, couple);

    expect(screen.getByRole("button", { name: "Joint" })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "Sam" }));
    expect(readPlan().portfolios[0]?.ownership).toEqual({ kind: "sole", personId: "person-2" });

    await user.click(screen.getByRole("button", { name: "Joint" }));
    await user.type(screen.getByLabelText("Alex's share"), "70{Enter}");
    expect(readPlan().portfolios[0]?.ownership).toEqual({
      kind: "joint",
      shares: [
        { personId: "person-1", fraction: 0.7 },
        { personId: "person-2", fraction: 0.3 },
      ],
    });
  });

  it("does not store a share outside 0 to 100%", async () => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(<PortfolioSection />, couple);

    await user.type(screen.getByLabelText("Alex's share"), "150{Enter}");

    expect(readPlan().portfolios[0]?.ownership).toBeUndefined();
    expect(screen.getByText("Enter a value of at most 100%.")).toBeInTheDocument();
  });

  it("names Alex's age on the stop age and says it defaults to when you've both retired", () => {
    renderSection(<PortfolioSection />, couple);

    const field = screen.getByLabelText("Contributions stop at Alex's age");

    expect(field).toHaveValue("when you've both retired");
    expect(field.closest(".input")).toHaveClass("default");
  });

  it("measures the stop age on, and defaults to the retirement of, a sole owner", () => {
    renderSection(<PortfolioSection />, {
      ...couple,
      portfolios: [
        {
          id: "portfolio-1",
          name: "Share portfolio",
          ownership: { kind: "sole", personId: "person-2" },
        },
      ],
    });

    expect(screen.getByLabelText("Contributions stop at Sam's age")).toHaveValue(
      "when Sam retires",
    );
    expect(screen.queryByLabelText("Contributions stop at Alex's age")).not.toBeInTheDocument();
  });

  it("stores a typed stop age", async () => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(<PortfolioSection />, couple);

    await user.type(screen.getByLabelText("Contributions stop at Alex's age"), "45{Enter}");

    expect(readPlan().portfolios[0]?.contributionsStopAge).toBe(45);
  });
});
