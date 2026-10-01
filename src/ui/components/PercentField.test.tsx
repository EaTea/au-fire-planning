import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PercentField } from "./PercentField";

// Component tests for the percentage field: typed percent in, plan fraction out.
describe("PercentField", () => {
  it("shows the plan's fraction as a percentage", () => {
    render(<PercentField label="Withdrawal rate" value={0.045} onChange={vi.fn()} />);

    expect(screen.getByLabelText("Withdrawal rate")).toHaveValue("4.5%");
  });

  it("commits the typed percentage as a fraction", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PercentField label="Withdrawal rate" onChange={onChange} />);

    await user.type(screen.getByLabelText("Withdrawal rate"), "3.5{Enter}");

    expect(onChange).toHaveBeenCalledExactlyOnceWith(0.035);
  });

  it("shows the default in the dashed style and commits undefined when cleared", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container, rerender } = render(
      <PercentField label="Withdrawal rate" value={0.05} defaultValue={0.04} onChange={onChange} />,
    );

    await user.clear(screen.getByLabelText("Withdrawal rate"));
    await user.tab();
    expect(onChange).toHaveBeenCalledExactlyOnceWith(undefined);

    rerender(<PercentField label="Withdrawal rate" defaultValue={0.04} onChange={onChange} />);
    expect(screen.getByLabelText("Withdrawal rate")).toHaveValue("4%");
    expect(container.querySelector(".input")).toHaveClass("default");
  });

  it("rejects values outside min and max", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PercentField label="Rate" min={0.01} max={0.1} onChange={onChange} />);

    await user.type(screen.getByLabelText("Rate"), "20{Enter}");

    expect(screen.getByText("Enter a value of at most 10%.")).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("rejects text that is not a number", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PercentField label="Rate" onChange={onChange} />);

    await user.type(screen.getByLabelText("Rate"), "four{Enter}");

    expect(screen.getByText(/Enter a number/)).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });
});
