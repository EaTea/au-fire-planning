import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { DrawdownSection } from "./DrawdownSection";
import { blankPlan, renderSection } from "./sectionTestHelpers";

describe("DrawdownSection", () => {
  it("shows the 4% default in the dashed style while unset", () => {
    const { container } = renderSection(<DrawdownSection />);

    expect(screen.getByLabelText("Safe withdrawal rate")).toHaveValue("4%");
    expect(container.querySelector(".input.default")).not.toBeNull();
  });

  it("stores a typed percentage in the plan as a fraction", async () => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(<DrawdownSection />);

    await user.type(screen.getByLabelText("Safe withdrawal rate"), "3.5{Enter}");

    expect(readPlan().assumptions.safeWithdrawalRate).toBe(0.035);
    expect(screen.getByLabelText("Safe withdrawal rate")).toHaveValue("3.5%");
  });

  it("restores the dashed default when cleared", async () => {
    const user = userEvent.setup();
    const { readPlan, container } = renderSection(<DrawdownSection />, {
      ...blankPlan,
      assumptions: { safeWithdrawalRate: 0.035 },
    });

    await user.clear(screen.getByLabelText("Safe withdrawal rate"));
    await user.tab();

    expect(readPlan().assumptions.safeWithdrawalRate).toBeUndefined();
    expect(screen.getByLabelText("Safe withdrawal rate")).toHaveValue("4%");
    expect(container.querySelector(".input.default")).not.toBeNull();
  });

  it("rejects rates outside 0.5% to 10%", async () => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(<DrawdownSection />);

    await user.type(screen.getByLabelText("Safe withdrawal rate"), "11{Enter}");
    expect(screen.getByText("Enter a value of at most 10%.")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Safe withdrawal rate"));
    await user.type(screen.getByLabelText("Safe withdrawal rate"), "0.4{Enter}");
    expect(screen.getByText("Enter a value of at least 0.5%.")).toBeInTheDocument();

    expect(readPlan().assumptions.safeWithdrawalRate).toBeUndefined();
  });

  it("explains the fixed withdrawal rule in retirement", () => {
    renderSection(<DrawdownSection />);

    expect(
      screen.getByText(
        "Withdrawal in retirement: constant, inflation-adjusted. Each year's spending is drawn from cash first, then the portfolio.",
      ),
    ).toBeInTheDocument();
  });
});
