import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { PortfolioSection } from "./PortfolioSection";
import { blankPlan, renderSection } from "./sectionTestHelpers";

describe("PortfolioSection", () => {
  it("shows the $0 default in the dashed style while the value is unset", () => {
    const { container } = renderSection(<PortfolioSection />);

    expect(screen.getByLabelText("Current value")).toHaveValue("$0");
    expect(container.querySelector(".input.default")).not.toBeNull();
  });

  it("stores a typed value in the plan and shows it formatted", async () => {
    const user = userEvent.setup();
    const { readPlan, container } = renderSection(<PortfolioSection />);

    await user.type(screen.getByLabelText("Current value"), "720000{Enter}");

    expect(readPlan().portfolios[0]?.value).toBe(720000);
    expect(screen.getByLabelText("Current value")).toHaveValue("$720,000");
    expect(container.querySelector(".input.default")).toBeNull();
  });

  it("restores the dashed default when the value is cleared", async () => {
    const user = userEvent.setup();
    const { readPlan, container } = renderSection(<PortfolioSection />, {
      ...blankPlan,
      portfolios: [{ id: "portfolio-1", name: "Share portfolio", value: 720000 }],
    });

    await user.clear(screen.getByLabelText("Current value"));
    await user.tab();

    expect(readPlan().portfolios[0]?.value).toBeUndefined();
    expect(screen.getByLabelText("Current value")).toHaveValue("$0");
    expect(container.querySelector(".input.default")).not.toBeNull();
  });

  it("renames the portfolio", async () => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(<PortfolioSection />);

    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "ETFs{Enter}");

    expect(readPlan().portfolios[0]?.name).toBe("ETFs");
  });
});
