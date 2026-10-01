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
