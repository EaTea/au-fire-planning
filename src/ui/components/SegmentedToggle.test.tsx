import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SegmentedToggle } from "./SegmentedToggle";

const options = [
  { value: "percent", label: "% of today" },
  { value: "amount", label: "$ amount" },
] as const;

describe("SegmentedToggle", () => {
  it("marks only the selected option as pressed", () => {
    render(
      <SegmentedToggle label="Spending as" options={options} value="amount" onChange={vi.fn()} />,
    );

    expect(screen.getByRole("button", { name: "$ amount" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "% of today" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("is a named group", () => {
    render(
      <SegmentedToggle label="Spending as" options={options} value="amount" onChange={vi.fn()} />,
    );

    expect(screen.getByRole("group", { name: "Spending as" })).toBeInTheDocument();
  });

  it("reports the clicked option", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SegmentedToggle label="Spending as" options={options} value="amount" onChange={onChange} />,
    );

    await user.click(screen.getByRole("button", { name: "% of today" }));

    expect(onChange).toHaveBeenCalledExactlyOnceWith("percent");
  });
});
