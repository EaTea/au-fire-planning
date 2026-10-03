import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { InflationSection } from "./InflationSection";
import { blankPlan, renderSection } from "./sectionTestHelpers";

describe("InflationSection", () => {
  it("shows the 2.5% default in the dashed style while unset", () => {
    const { container } = renderSection(<InflationSection />);

    expect(screen.getByLabelText("Inflation per year")).toHaveValue("2.5%");
    expect(container.querySelector(".input.default")).not.toBeNull();
  });

  it("stores a typed percentage in the plan as a fraction", async () => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(<InflationSection />);

    await user.type(screen.getByLabelText("Inflation per year"), "3{Enter}");

    expect(readPlan().assumptions.inflationRate).toBe(0.03);
    expect(screen.getByLabelText("Inflation per year")).toHaveValue("3%");
  });

  it("restores the dashed default when cleared", async () => {
    const user = userEvent.setup();
    const { readPlan, container } = renderSection(<InflationSection />, {
      ...blankPlan,
      assumptions: { inflationRate: 0.03 },
    });

    await user.clear(screen.getByLabelText("Inflation per year"));
    await user.tab();

    expect(readPlan().assumptions.inflationRate).toBeUndefined();
    expect(screen.getByLabelText("Inflation per year")).toHaveValue("2.5%");
    expect(container.querySelector(".input.default")).not.toBeNull();
  });

  it("rejects rates outside 0% to 15%, and accepts 0%", async () => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(<InflationSection />);

    await user.type(screen.getByLabelText("Inflation per year"), "16{Enter}");
    expect(screen.getByText("Enter a value of at most 15%.")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Inflation per year"));
    await user.type(screen.getByLabelText("Inflation per year"), "-1{Enter}");
    expect(screen.getByText(/Enter a (number|value of at least 0%)/)).toBeInTheDocument();
    expect(readPlan().assumptions.inflationRate).toBeUndefined();

    await user.clear(screen.getByLabelText("Inflation per year"));
    await user.type(screen.getByLabelText("Inflation per year"), "0{Enter}");
    expect(readPlan().assumptions.inflationRate).toBe(0);
  });

  it("is titled Economy", () => {
    renderSection(<InflationSection />);

    expect(screen.getByRole("heading", { name: "Economy" })).toBeInTheDocument();
  });

  it("shows the 4% interest default with its hint, stores a typed rate and clears it", async () => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(<InflationSection />);

    expect(screen.getByLabelText("General interest rate")).toHaveValue("4%");
    expect(screen.getByText("Paid on cash savings.")).toBeInTheDocument();

    await user.type(screen.getByLabelText("General interest rate"), "3.5{Enter}");
    expect(readPlan().assumptions.interestRate).toBe(0.035);

    await user.clear(screen.getByLabelText("General interest rate"));
    await user.tab();
    expect(readPlan().assumptions.interestRate).toBeUndefined();
    expect(screen.getByLabelText("General interest rate")).toHaveValue("4%");
  });

  it("limits the interest rate to 0% to 15%, and accepts 0%", async () => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(<InflationSection />);

    await user.type(screen.getByLabelText("General interest rate"), "16{Enter}");
    expect(screen.getByText("Enter a value of at most 15%.")).toBeInTheDocument();
    expect(readPlan().assumptions.interestRate).toBeUndefined();

    await user.clear(screen.getByLabelText("General interest rate"));
    await user.type(screen.getByLabelText("General interest rate"), "0{Enter}");
    expect(readPlan().assumptions.interestRate).toBe(0);
  });
});
