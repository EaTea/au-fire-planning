import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { Explained } from "../../engine/explained";
import { MetricTile } from "./MetricTile";

const explanation: Explained = {
  value: 1600000,
  unit: "dollars",
  lines: [
    { label: "Retirement spending per year", value: 64000, unit: "dollars", source: "input" },
    { label: "FI number", value: 1600000, unit: "dollars", operator: "=", source: "calculated" },
  ],
};

describe("MetricTile", () => {
  it("shows the label, value and sub-line", () => {
    render(<MetricTile label="FI number" value="$1,600,000" subLine="In today's dollars" />);

    expect(screen.getByText("FI number")).toBeInTheDocument();
    expect(screen.getByText("$1,600,000")).toBeInTheDocument();
    expect(screen.getByText("In today's dollars")).toBeInTheDocument();
  });

  it("has no explanation button without an explanation", () => {
    render(<MetricTile label="FI number" value="$1,600,000" />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("reveals and hides the explanation", async () => {
    const user = userEvent.setup();
    render(<MetricTile label="FI number" value="$1,600,000" explanation={explanation} />);

    const button = screen.getByRole("button", { name: "How is this calculated?" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();

    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("table")).toHaveTextContent("Retirement spending per year");

    await user.click(button);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
