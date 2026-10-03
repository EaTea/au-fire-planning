import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { CashSection } from "./CashSection";
import { blankPlan, renderSection } from "./sectionTestHelpers";

describe("CashSection", () => {
  it("shows the $0 default in the dashed style, with its hint, while unset", () => {
    const { container } = renderSection(<CashSection />);

    expect(screen.getByRole("heading", { name: "Cash" })).toBeInTheDocument();
    expect(screen.getByLabelText("Cash savings")).toHaveValue("$0");
    expect(container.querySelector(".input.default")).not.toBeNull();
    expect(
      screen.getByText(
        "Earns the general interest rate (Assumptions). Spent before the portfolio in retirement.",
      ),
    ).toBeInTheDocument();
  });

  it("stores a typed balance in the plan", async () => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(<CashSection />);

    await user.type(screen.getByLabelText("Cash savings"), "25000{Enter}");

    expect(readPlan().cash?.balance).toBe(25000);
    expect(screen.getByLabelText("Cash savings")).toHaveValue("$25,000");
  });

  it("restores the default when cleared", async () => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(<CashSection />, { ...blankPlan, cash: { balance: 500 } });

    await user.clear(screen.getByLabelText("Cash savings"));
    await user.tab();

    expect(readPlan().cash?.balance).toBeUndefined();
    expect(screen.getByLabelText("Cash savings")).toHaveValue("$0");
  });

  it("rejects negative amounts and accepts $0", async () => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(<CashSection />);

    await user.type(screen.getByLabelText("Cash savings"), "-5{Enter}");
    expect(screen.getByText(/Enter a (number|value of at least \$0)/)).toBeInTheDocument();
    expect(readPlan().cash?.balance).toBeUndefined();

    await user.clear(screen.getByLabelText("Cash savings"));
    await user.type(screen.getByLabelText("Cash savings"), "0{Enter}");
    expect(readPlan().cash?.balance).toBe(0);
  });
});
