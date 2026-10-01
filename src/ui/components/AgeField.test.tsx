import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AgeField } from "./AgeField";

// Component tests for the age field: whole years only, with limits and a default.
describe("AgeField", () => {
  it("shows the plan's age", () => {
    render(<AgeField label="Current age" value={34} onChange={vi.fn()} />);

    expect(screen.getByLabelText("Current age")).toHaveValue("34");
  });

  it("commits a whole number of years", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AgeField label="Current age" onChange={onChange} />);

    await user.type(screen.getByLabelText("Current age"), "34{Enter}");

    expect(onChange).toHaveBeenCalledExactlyOnceWith(34);
  });

  it.each(["34.5", "abc", "-3"])("rejects %s", async (text) => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AgeField label="Current age" onChange={onChange} />);

    await user.type(screen.getByLabelText("Current age"), `${text}{Enter}`);

    expect(screen.getByText("Enter a number, for example 34.")).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("rejects ages outside min and max", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AgeField label="Age" min={18} max={120} onChange={onChange} />);

    await user.type(screen.getByLabelText("Age"), "130{Enter}");
    expect(screen.getByText("Enter a value of at most 120.")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Age"));
    await user.type(screen.getByLabelText("Age"), "10{Enter}");
    expect(screen.getByText("Enter a value of at least 18.")).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows the default in the dashed style and commits undefined when cleared", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container, rerender } = render(
      <AgeField label="Stop age" value={45} defaultValue={50} onChange={onChange} />,
    );

    await user.clear(screen.getByLabelText("Stop age"));
    await user.tab();
    expect(onChange).toHaveBeenCalledExactlyOnceWith(undefined);

    rerender(<AgeField label="Stop age" defaultValue={50} onChange={onChange} />);
    expect(screen.getByLabelText("Stop age")).toHaveValue("50");
    expect(container.querySelector(".input")).toHaveClass("default");
  });
});
