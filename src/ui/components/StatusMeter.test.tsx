import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { Explained } from "../../engine/explained";
import { StatusMeter, type StatusMeterKind } from "./StatusMeter";

const explanation: Explained = {
  value: 160000,
  unit: "dollars",
  lines: [
    { label: "Spending in 2028 – 2035", value: 160000, unit: "dollars", source: "calculated" },
    {
      label: "Need for the bridge at 2027",
      value: 160000,
      unit: "dollars",
      operator: "=",
      source: "calculated",
    },
  ],
};

/** Renders a meter with $160,000 needed and $100,000 projected, for the given kind and word. */
function renderMeter(kind: StatusMeterKind, statusWord: string) {
  return render(
    <StatusMeter
      label="Bridge: outside super, 2027 → 2036"
      kind={kind}
      statusWord={statusWord}
      projected={{ amount: 100000, text: "$100,000" }}
      need={{ amount: 160000, text: "$160,000" }}
      needNote="in 2027"
      explanation={explanation}
    />,
  );
}

describe("StatusMeter", () => {
  it.each<[StatusMeterKind, string]>([
    ["met", "MET"],
    ["short", "SHORT"],
    ["coasting", "Coasting since 2026"],
    ["notYet", "Not before retirement"],
  ])("says its %s status in words, not only by colour", (kind, word) => {
    const { container } = renderMeter(kind, word);

    expect(screen.getByText(word)).toBeInTheDocument();
    expect(container.querySelector(`.status-meter-${kind}`)).not.toBeNull();
  });

  it("shows the label and the need and projected figures as text", () => {
    renderMeter("short", "SHORT");

    expect(screen.getByText("Bridge: outside super, 2027 → 2036")).toBeInTheDocument();
    expect(screen.getByText("Need $160,000 in 2027 · projected $100,000")).toBeInTheDocument();
  });

  it("scales the bar to the larger amount and marks the need on it", () => {
    const { container } = renderMeter("short", "SHORT");

    // Need is the larger: the marker is at the end and the fill is 100/160 of the track.
    expect(container.querySelector<HTMLElement>(".status-meter-need-marker")!.style.left).toBe(
      "100%",
    );
    expect(container.querySelector<HTMLElement>(".status-meter-fill")!.style.width).toBe("62.5%");
  });

  it("puts the marker inside the track when the projection exceeds the need", () => {
    const { container } = render(
      <StatusMeter
        label="After access"
        kind="met"
        statusWord="MET"
        projected={{ amount: 200000, text: "$200,000" }}
        need={{ amount: 50000, text: "$50,000" }}
      />,
    );

    expect(container.querySelector<HTMLElement>(".status-meter-need-marker")!.style.left).toBe(
      "25%",
    );
    expect(container.querySelector<HTMLElement>(".status-meter-fill")!.style.width).toBe("100%");
  });

  it("draws an empty bar when nothing is needed or projected", () => {
    const { container } = render(
      <StatusMeter
        label="Empty"
        kind="met"
        statusWord="MET"
        projected={{ amount: 0, text: "$0" }}
        need={{ amount: 0, text: "$0" }}
      />,
    );

    expect(container.querySelector<HTMLElement>(".status-meter-fill")!.style.width).toBe("0%");
  });

  it("shows extra detail after the projected amount", () => {
    render(
      <StatusMeter
        label="Bridge"
        kind="short"
        statusWord="SHORT"
        projected={{ amount: 1, text: "$1" }}
        need={{ amount: 2, text: "$2" }}
        detail="short in 2033 – 2035"
      />,
    );

    expect(screen.getByText("Need $2 · projected $1 · short in 2033 – 2035")).toBeInTheDocument();
  });

  it("reveals and hides the breakdown", async () => {
    const user = userEvent.setup();
    renderMeter("short", "SHORT");

    const button = screen.getByRole("button", { name: "How is this calculated?" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();

    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Need for the bridge at 2027")).toBeInTheDocument();

    await user.click(button);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("has no breakdown button without an explanation", () => {
    render(
      <StatusMeter
        label="Bridge"
        kind="met"
        statusWord="MET"
        projected={{ amount: 1, text: "$1" }}
        need={{ amount: 1, text: "$1" }}
      />,
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
