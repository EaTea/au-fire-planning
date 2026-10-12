import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { Person, PortfolioOwnership } from "../../plan/types";
import { OwnershipField } from "./OwnershipField";

const alex: Person = { id: "alex-id", label: "Person 1", name: "Alex" };
const sam: Person = { id: "sam-id", label: "Person 2", name: "Sam" };

/** Renders the field and returns the callback spy. */
function renderField(
  value: PortfolioOwnership | undefined,
  people: readonly Person[] = [alex, sam],
) {
  const onChange = vi.fn();
  render(
    <OwnershipField
      label="Share portfolio owner"
      people={people}
      value={value}
      onChange={onChange}
    />,
  );

  return onChange;
}

// Component tests for the ownership toggle and the joint split.
describe("OwnershipField", () => {
  it("offers each person's name and Joint", () => {
    renderField(undefined);

    expect(screen.getByRole("button", { name: "Alex" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sam" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Joint" })).toBeInTheDocument();
  });

  // Unset ownership resolves to joint 50/50 for a couple, shown as a default.
  it("shows the joint 50/50 default when nothing is stored", () => {
    renderField(undefined);

    expect(screen.getByRole("button", { name: "Joint" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Alex's share")).toHaveValue("50%");
    expect(screen.getByLabelText("Alex's share").closest(".input")).toHaveClass("default");
    expect(screen.getByText("Sam 50%")).toBeInTheDocument();
  });

  it("reports sole ownership when a person is chosen", async () => {
    const user = userEvent.setup();
    const onChange = renderField(undefined);

    await user.click(screen.getByRole("button", { name: "Sam" }));

    expect(onChange).toHaveBeenCalledWith({ kind: "sole", personId: "sam-id" });
  });

  it("shows the sole owner selected and no share field", () => {
    renderField({ kind: "sole", personId: "sam-id" });

    expect(screen.getByRole("button", { name: "Sam" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByLabelText("Alex's share")).not.toBeInTheDocument();
  });

  it("reports a joint 50/50 when Joint is chosen", async () => {
    const user = userEvent.setup();
    const onChange = renderField({ kind: "sole", personId: "alex-id" });

    await user.click(screen.getByRole("button", { name: "Joint" }));

    expect(onChange).toHaveBeenCalledWith({
      kind: "joint",
      shares: [
        { personId: "alex-id", fraction: 0.5 },
        { personId: "sam-id", fraction: 0.5 },
      ],
    });
  });

  it("reports the split, with the other share making up the rest exactly", async () => {
    const user = userEvent.setup();
    const onChange = renderField({
      kind: "joint",
      shares: [
        { personId: "alex-id", fraction: 0.5 },
        { personId: "sam-id", fraction: 0.5 },
      ],
    });

    await user.type(screen.getByLabelText("Alex's share"), "60{Enter}");

    expect(onChange).toHaveBeenCalledWith({
      kind: "joint",
      shares: [
        { personId: "alex-id", fraction: 0.6 },
        { personId: "sam-id", fraction: 0.4 },
      ],
    });
  });

  it("shows the other partner's share as calculated text", () => {
    renderField({
      kind: "joint",
      shares: [
        { personId: "alex-id", fraction: 0.6 },
        { personId: "sam-id", fraction: 0.4 },
      ],
    });

    expect(screen.getByLabelText("Alex's share")).toHaveValue("60%");
    expect(screen.getByText("Sam 40%")).toBeInTheDocument();
  });

  // A split that isn't 0 to 100% is shown as an error and never reported.
  it.each(["101", "-5"])(
    "rejects a share of %s%% with an inline error and reports nothing",
    async (text) => {
      const user = userEvent.setup();
      const onChange = renderField(undefined);

      await user.type(screen.getByLabelText("Alex's share"), `${text}{Enter}`);

      expect(screen.getByLabelText("Alex's share")).toBeInvalid();
      expect(onChange).not.toHaveBeenCalled();
    },
  );

  it("accepts the ends of the range, 0% and 100%", async () => {
    const user = userEvent.setup();
    const onChange = renderField(undefined);

    await user.type(screen.getByLabelText("Alex's share"), "0{Enter}");
    await user.clear(screen.getByLabelText("Alex's share"));
    await user.type(screen.getByLabelText("Alex's share"), "100{Enter}");

    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenLastCalledWith({
      kind: "joint",
      shares: [
        { personId: "alex-id", fraction: 1 },
        { personId: "sam-id", fraction: 0 },
      ],
    });
  });

  it("goes back to the default (unset) when the share is cleared", async () => {
    const user = userEvent.setup();
    const onChange = renderField({
      kind: "joint",
      shares: [
        { personId: "alex-id", fraction: 0.6 },
        { personId: "sam-id", fraction: 0.4 },
      ],
    });

    await user.clear(screen.getByLabelText("Alex's share"));
    await user.tab();

    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it("renders nothing for a household of one person", () => {
    const unnamed: Person = { id: "x", label: "Person 1" };
    const { container } = render(
      <OwnershipField label="Owner" people={[unnamed]} value={undefined} onChange={() => {}} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
