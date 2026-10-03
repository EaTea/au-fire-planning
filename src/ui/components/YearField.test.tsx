import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { YearField } from "./YearField";

// Component tests for the year field: whole calendar years with limits.
describe("YearField", () => {
  it("shows the year without a thousands separator", () => {
    render(<YearField label="From" value={2030} onChange={vi.fn()} />);

    expect(screen.getByLabelText("From")).toHaveValue("2030");
  });

  it("commits a whole year", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<YearField label="From" onChange={onChange} />);

    await user.type(screen.getByLabelText("From"), "2031{Enter}");

    expect(onChange).toHaveBeenCalledExactlyOnceWith(2031);
  });

  it.each(["2030.5", "abc", "-3"])("rejects %s", async (text) => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<YearField label="From" onChange={onChange} />);

    await user.type(screen.getByLabelText("From"), `${text}{Enter}`);

    expect(screen.getByText("Enter a number, for example 2030.")).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("rejects years outside min and max", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<YearField label="From" min={2027} max={2200} onChange={onChange} />);

    await user.type(screen.getByLabelText("From"), "2026{Enter}");
    expect(screen.getByText("Enter a value of at least 2027.")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("From"));
    await user.type(screen.getByLabelText("From"), "2300{Enter}");
    expect(screen.getByText("Enter a value of at most 2200.")).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });
});
