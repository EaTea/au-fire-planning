import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { GrowthRate } from "../../plan/types";
import { GrowthRateField, type GrowthRateOption } from "./GrowthRateField";

const ALL_OPTIONS: readonly GrowthRateOption[] = [
  "inflation",
  "inflationPlus",
  "inflationMinus",
  "fixed",
  "none",
];

/** Renders the field with every option; returns the change spy. */
function renderField(value?: GrowthRate, options: readonly GrowthRateOption[] = ALL_OPTIONS) {
  const onChange = vi.fn();
  render(<GrowthRateField label="Grows at" options={options} value={value} onChange={onChange} />);
  return onChange;
}

// Component tests for the generic "Grows at" field.
describe("GrowthRateField", () => {
  it("offers only the options it is given", () => {
    renderField(undefined, ["inflation", "none"]);

    const labels = screen.getAllByRole("option").map((option) => option.textContent);
    expect(labels).toEqual(["Inflation", "No growth"]);
  });

  /** Renders the field with a stored value and a do-nothing handler. */
  function renderFieldWith(value: GrowthRate) {
    return render(
      <GrowthRateField label="Grows at" options={ALL_OPTIONS} value={value} onChange={vi.fn()} />,
    );
  }

  it("shows the default (inflation) dashed, without a number box", () => {
    renderField();

    expect(screen.getByLabelText("Grows at")).toHaveValue("inflation");
    expect(screen.getByLabelText("Grows at").closest(".input")).toHaveClass("default");
    expect(screen.queryByLabelText(/inflation by|Fixed rate/)).not.toBeInTheDocument();
  });

  it.each([
    ["inflationPlus", { kind: "inflationPlus", margin: 0.01 }],
    ["inflationMinus", { kind: "inflationPlus", margin: -0.01 }],
    ["fixed", { kind: "fixed", rate: 0.03 }],
    ["none", { kind: "none" }],
  ] as const)("choosing %s reports its growth", async (choice, expected) => {
    const onChange = renderField();

    await userEvent.setup().selectOptions(screen.getByLabelText("Grows at"), choice);

    expect(onChange).toHaveBeenCalledExactlyOnceWith(expected);
  });

  it("shows the matching choice and number for each stored value", () => {
    const { unmount } = render(
      <GrowthRateField
        label="Grows at"
        options={ALL_OPTIONS}
        value={{ kind: "inflationPlus", margin: -0.01 }}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Grows at")).toHaveValue("inflationMinus");
    expect(screen.getByLabelText("Below inflation by")).toHaveValue("1%");
    unmount();

    render(
      <GrowthRateField
        label="Grows at"
        options={ALL_OPTIONS}
        value={{ kind: "fixed", rate: 0.035 }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Grows at")).toHaveValue("fixed");
    expect(screen.getByLabelText("Fixed rate")).toHaveValue("3.5%");
  });

  it("names the number box for the chosen option", () => {
    const { unmount } = renderFieldWith({ kind: "inflationPlus", margin: 0.01 });
    expect(screen.getByLabelText("Above inflation by")).toHaveValue("1%");
    unmount();

    const second = renderFieldWith({ kind: "inflationPlus", margin: -0.01 });
    expect(screen.getByLabelText("Below inflation by")).toHaveValue("1%");
    second.unmount();

    renderFieldWith({ kind: "fixed", rate: 0.03 });
    expect(screen.getByLabelText("Fixed rate")).toHaveValue("3%");
  });

  it("lets a screen prefix the number box's label", () => {
    render(
      <GrowthRateField
        label="Alex: Grows at"
        options={ALL_OPTIONS}
        value={{ kind: "fixed", rate: 0.03 }}
        numberLabel={(name) => `Alex: ${name}`}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Alex: Fixed rate")).toHaveValue("3%");
  });

  it("shows no number box for inflation or no growth", () => {
    renderField({ kind: "none" });

    expect(screen.getByLabelText("Grows at")).toHaveValue("none");
    expect(screen.queryByLabelText(/inflation by|Fixed rate/)).not.toBeInTheDocument();
  });

  it("commits a typed number with the current choice", async () => {
    const onChange = renderField({ kind: "inflationPlus", margin: 0.01 });

    const box = screen.getByLabelText("Above inflation by");
    await userEvent.setup().clear(box);
    await userEvent.setup().type(box, "2{Enter}");

    expect(onChange).toHaveBeenLastCalledWith({ kind: "inflationPlus", margin: 0.02 });
  });

  it("switching from a custom option back to Inflation clears the value", async () => {
    const onChange = renderField({ kind: "inflationPlus", margin: 0.01 });

    await userEvent.setup().selectOptions(screen.getByLabelText("Grows at"), "inflation");

    // Inflation is the default, so it means "not set".
    expect(onChange).toHaveBeenCalledExactlyOnceWith(undefined);
  });

  it("sets a margin of 0 when Inflation is chosen and the default is something else", async () => {
    const onChange = vi.fn();
    render(
      <GrowthRateField
        label="Grows at"
        options={ALL_OPTIONS}
        defaultValue={{ kind: "none" }}
        value={{ kind: "fixed", rate: 0.04 }}
        onChange={onChange}
      />,
    );

    await userEvent.setup().selectOptions(screen.getByLabelText("Grows at"), "inflation");

    expect(onChange).toHaveBeenCalledExactlyOnceWith({ kind: "inflationPlus", margin: 0 });
  });

  it("clearing the number returns to the default", async () => {
    const onChange = renderField({ kind: "fixed", rate: 0.03 });

    await userEvent.setup().clear(screen.getByLabelText("Fixed rate"));
    await userEvent.setup().tab();

    expect(onChange).toHaveBeenCalledExactlyOnceWith(undefined);
  });

  describe("limits", () => {
    it("accepts a fixed rate from −10% to +15% and rejects beyond", async () => {
      const user = userEvent.setup();
      const onChange = renderField({ kind: "fixed", rate: 0.03 });
      const box = screen.getByLabelText("Fixed rate");

      await user.clear(box);
      await user.type(box, "-10{Enter}");
      expect(onChange).toHaveBeenLastCalledWith({ kind: "fixed", rate: -0.1 });

      await user.clear(box);
      await user.type(box, "15{Enter}");
      expect(onChange).toHaveBeenLastCalledWith({ kind: "fixed", rate: 0.15 });

      onChange.mockClear();
      await user.clear(box);
      await user.type(box, "15.5{Enter}");
      expect(onChange).not.toHaveBeenCalled();
      expect(screen.getByText(/at most 15%/)).toBeInTheDocument();

      await user.clear(box);
      await user.type(box, "-11{Enter}");
      expect(onChange).not.toHaveBeenCalled();
      expect(screen.getByText(/at least −?10%|at least -10%/)).toBeInTheDocument();
    });

    it("limits an inflation margin to 0% to +15% and a reduction to 0% to 10%", async () => {
      const user = userEvent.setup();
      const onChange = renderField({ kind: "inflationPlus", margin: -0.01 });
      const box = screen.getByLabelText("Below inflation by");

      await user.clear(box);
      await user.type(box, "10.5{Enter}");
      expect(onChange).not.toHaveBeenCalled();

      await user.clear(box);
      await user.type(box, "10{Enter}");
      expect(onChange).toHaveBeenLastCalledWith({ kind: "inflationPlus", margin: -0.1 });
    });
  });

  it("can be used with the keyboard alone", async () => {
    const user = userEvent.setup();
    const onChange = renderField();

    await user.tab();
    expect(screen.getByLabelText("Grows at")).toHaveFocus();

    // Picking a choice and moving on to the number box needs no mouse.
    await user.selectOptions(screen.getByLabelText("Grows at"), "fixed");
    expect(onChange).toHaveBeenCalledExactlyOnceWith({ kind: "fixed", rate: 0.03 });
  });
});
