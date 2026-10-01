import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { MoneyField } from "./MoneyField";

// Component tests for the dollar field (and, through it, NumberField's shared behaviour).
describe("MoneyField", () => {
  it("shows the plan's value, formatted, under its label", () => {
    render(<MoneyField label="Living expenses" value={64000} onChange={vi.fn()} />);

    expect(screen.getByLabelText("Living expenses")).toHaveValue("$64,000");
  });

  it("commits the typed value on blur", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MoneyField label="Living expenses" onChange={onChange} />);

    await user.type(screen.getByLabelText("Living expenses"), "60,000");
    expect(onChange).not.toHaveBeenCalled();

    await user.tab();
    expect(onChange).toHaveBeenCalledExactlyOnceWith(60000);
  });

  it("commits the typed value on Enter", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MoneyField label="Living expenses" onChange={onChange} />);

    await user.type(screen.getByLabelText("Living expenses"), "$60000{Enter}");

    expect(onChange).toHaveBeenCalledExactlyOnceWith(60000);
  });

  it("commits undefined when the text is cleared", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MoneyField label="Portfolio" value={720000} defaultValue={0} onChange={onChange} />);

    await user.clear(screen.getByLabelText("Portfolio"));
    await user.tab();

    expect(onChange).toHaveBeenCalledExactlyOnceWith(undefined);
  });

  it("shows the default in the dashed style while unset", () => {
    const { container } = render(
      <MoneyField label="Portfolio" defaultValue={0} onChange={vi.fn()} />,
    );

    expect(screen.getByLabelText("Portfolio")).toHaveValue("$0");
    expect(container.querySelector(".input")).toHaveClass("default");
  });

  it("does not use the default style when a value is set", () => {
    const { container } = render(
      <MoneyField label="Portfolio" value={5} defaultValue={0} onChange={vi.fn()} />,
    );

    expect(container.querySelector(".input")).not.toHaveClass("default");
  });

  it("does not turn a default into a set value just by tabbing through", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MoneyField label="Portfolio" defaultValue={0} onChange={onChange} />);

    await user.click(screen.getByLabelText("Portfolio"));
    await user.tab();

    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows an error and commits nothing for invalid text", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MoneyField label="Living expenses" onChange={onChange} />);

    await user.type(screen.getByLabelText("Living expenses"), "lots{Enter}");

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(/Enter a number/)).toBeInTheDocument();
    expect(screen.getByLabelText("Living expenses")).toHaveAttribute("aria-invalid", "true");
  });

  it("shows an error and commits nothing for a number out of range", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MoneyField label="Amount" min={100} max={1000} onChange={onChange} />);

    await user.type(screen.getByLabelText("Amount"), "50{Enter}");
    expect(screen.getByText("Enter a value of at least $100.")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Amount"));
    await user.type(screen.getByLabelText("Amount"), "5000{Enter}");
    expect(screen.getByText("Enter a value of at most $1,000.")).toBeInTheDocument();

    expect(onChange).not.toHaveBeenCalled();
  });

  it("clears the error once a valid value is committed", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MoneyField label="Amount" onChange={onChange} />);

    await user.type(screen.getByLabelText("Amount"), "x{Enter}");
    expect(screen.getByText(/Enter a number/)).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Amount"));
    await user.type(screen.getByLabelText("Amount"), "10{Enter}");

    expect(onChange).toHaveBeenCalledExactlyOnceWith(10);
    expect(screen.queryByText(/Enter a number/)).not.toBeInTheDocument();
  });

  it("shows the hint", () => {
    render(<MoneyField label="Amount" hint="After tax" onChange={vi.fn()} />);

    expect(screen.getByText("After tax")).toBeInTheDocument();
  });
});
